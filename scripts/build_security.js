/**
 * Build Script: Cifrado y Ofuscación de Grado Militar para Frontend
 * Librería Universal
 */
const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const SRC_DIR = path.join(__dirname, '..', 'src_js');
const OUT_DIR = path.join(__dirname, '..', 'js');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const files = fs.readdirSync(SRC_DIR).filter(file => file.endsWith('.js'));

console.log(`🔒 Iniciando cifrado y ofuscación de ${files.length} archivos JavaScript...\n`);

let totalOriginalSize = 0;
let totalObfuscatedSize = 0;
let hasErrors = false;

files.forEach(fileName => {
  const srcPath = path.join(SRC_DIR, fileName);
  const outPath = path.join(OUT_DIR, fileName);
  const originalCode = fs.readFileSync(srcPath, 'utf8');
  totalOriginalSize += originalCode.length;

  console.log(`📦 Procesando: ${fileName} (${originalCode.length} bytes)...`);

  try {
    const obfuscationResult = JavaScriptObfuscator.obfuscate(originalCode, {
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.75,
      deadCodeInjection: false, // mantener rendimiento óptimo en mobile
      debugProtection: false, // anti-debug gestionado por security-shield
      disableConsoleOutput: false, // silenciador gestionado por security-shield
      identifierNamesGenerator: 'hexadecimal',
      numbersToExpressions: true,
      simplify: true,
      selfDefending: true,
      splitStrings: true,
      splitStringsChunkLength: 6,
      stringArray: true,
      stringArrayEncoding: ['base64'],
      stringArrayThreshold: 1.0,
      rotateStringArray: true,
      shuffleStringArray: true,
      target: 'browser'
    });

    const obfuscatedCode = obfuscationResult.getObfuscatedCode();
    totalObfuscatedSize += obfuscatedCode.length;

    // Validación CSP estricta (no eval, no Function)
    if (/\beval\s*\(/.test(obfuscatedCode)) {
      console.error(`❌ ALERTA: ${fileName} contiene eval() tras ofuscación`);
      hasErrors = true;
    }
    if (/\bFunction\s*\(/.test(obfuscatedCode)) {
      console.error(`❌ ALERTA: ${fileName} contiene Function() tras ofuscación`);
      hasErrors = true;
    }

    fs.writeFileSync(outPath, obfuscatedCode, 'utf8');
    console.log(`   ✅ Cifrado exitoso -> js/${fileName} (${obfuscatedCode.length} bytes)`);
  } catch (err) {
    console.error(`❌ Error al procesar ${fileName}:`, err);
    hasErrors = true;
  }
});

console.log('\n----------------------------------------');
console.log(`📊 Total original: ${(totalOriginalSize / 1024).toFixed(2)} KB`);
console.log(`🛡️ Total cifrado:  ${(totalObfuscatedSize / 1024).toFixed(2)} KB`);
console.log('----------------------------------------');

if (hasErrors) {
  console.error('\n⚠️ Hubo errores durante el proceso de cifrado.');
  process.exit(1);
} else {
  console.log('\n✨ Todos los módulos fueron cifrados y blindados exitosamente sin violar la CSP.');
}
