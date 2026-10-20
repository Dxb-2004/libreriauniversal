/**
 * Librería Universal - Módulo de Almacenamiento Criptográfico Seguro
 * Blindaje contra inyecciones y manipulación en localStorage y sessionStorage.
 * Implementa cifrado autenticado AES-GCM (256 bits) mediante la Web Crypto API nativa (window.crypto.subtle).
 */
(function(root) {
  'use strict';

  const PREFIX = 'lu_sec_v1:';
  const STORAGE_SALT = new Uint8Array([76, 105, 98, 114, 101, 114, 105, 97, 85, 110, 105, 118, 101, 114, 115, 97]); // 'LibreriaUniversa'
  let cachedKey = null;

  function hasWebCrypto() {
    return typeof window !== 'undefined' && 
           window.crypto && 
           window.crypto.subtle && 
           typeof window.crypto.subtle.encrypt === 'function';
  }

  function bufferToHex(buf) {
    const bytes = new Uint8Array(buf);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  function hexToBuffer(hex) {
    if (typeof hex !== 'string' || hex.length % 2 !== 0) return null;
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      const byte = parseInt(hex.substr(i * 2, 2), 16);
      if (isNaN(byte)) return null;
      bytes[i] = byte;
    }
    return bytes;
  }

  async function getCryptoKey() {
    if (cachedKey) return cachedKey;
    if (!hasWebCrypto()) return null;

    try {
      const originEntropy = (window.location.origin || 'libreriauniversal') + '::lu_appsec_salt_2026';
      const enc = new TextEncoder();
      const baseKey = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(originEntropy),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      cachedKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: STORAGE_SALT,
          iterations: 10000,
          hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      return cachedKey;
    } catch (err) {
      console.warn('[CryptoStorage] Fallback a derivación directa:', err);
      return null;
    }
  }

  const CryptoStorage = {
    /**
     * Guarda un valor cifrado con AES-GCM en el almacenamiento seleccionado
     * @param {string} key 
     * @param {string} value 
     * @param {boolean} isSession - true para sessionStorage, false para localStorage
     */
    async setItem(key, value, isSession = false) {
      const storage = isSession ? window.sessionStorage : window.localStorage;
      if (!storage) return;

      const strVal = String(value);

      if (!hasWebCrypto()) {
        storage.setItem(key, strVal);
        return;
      }

      try {
        const keyObj = await getCryptoKey();
        if (!keyObj) {
          storage.setItem(key, strVal);
          return;
        }

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const enc = new TextEncoder();
        const ciphertext = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          keyObj,
          enc.encode(strVal)
        );

        const payload = PREFIX + bufferToHex(iv) + ':' + bufferToHex(ciphertext);
        storage.setItem(key, payload);
      } catch (err) {
        console.error('[CryptoStorage] Error al cifrar valor:', err);
        storage.setItem(key, strVal);
      }
    },

    /**
     * Recupera y valida la integridad de un valor almacenado descifrándolo
     * @param {string} key 
     * @param {boolean} isSession 
     * @returns {Promise<string|null>}
     */
    async getItem(key, isSession = false) {
      const storage = isSession ? window.sessionStorage : window.localStorage;
      if (!storage) return null;

      const raw = storage.getItem(key);
      if (raw === null || raw === undefined) return null;

      // Si no está cifrado con el prefijo seguro (ej: sesión anterior), retornar valor directo
      if (!raw.startsWith(PREFIX)) {
        return raw;
      }

      if (!hasWebCrypto()) {
        return null;
      }

      try {
        const keyObj = await getCryptoKey();
        if (!keyObj) return null;

        const body = raw.slice(PREFIX.length);
        const parts = body.split(':');
        if (parts.length !== 2) {
          console.warn('[CryptoStorage] Formato corrupto detectado, purgando clave:', key);
          storage.removeItem(key);
          return null;
        }

        const iv = hexToBuffer(parts[0]);
        const ciphertext = hexToBuffer(parts[1]);
        if (!iv || !ciphertext) {
          storage.removeItem(key);
          return null;
        }

        const decrypted = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          keyObj,
          ciphertext
        );

        const dec = new TextDecoder();
        return dec.decode(decrypted);
      } catch (err) {
        console.warn('[CryptoStorage] Alerta de integridad: Datos manipulados o clave inválida. Purgando:', key);
        storage.removeItem(key);
        return null;
      }
    },

    /**
     * Elimina una clave de forma segura y síncrona
     */
    removeItem(key, isSession = false) {
      const storage = isSession ? window.sessionStorage : window.localStorage;
      if (storage) {
        storage.removeItem(key);
      }
    },

    /**
     * Limpia completamente el almacenamiento seleccionado
     */
    clear(isSession = false) {
      const storage = isSession ? window.sessionStorage : window.localStorage;
      if (storage) {
        storage.clear();
      }
    }
  };

  // Exponer API congelada en el objeto global
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'CryptoStorage', {
      value: Object.freeze(CryptoStorage),
      writable: false,
      configurable: false
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CryptoStorage;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
