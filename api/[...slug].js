/**
 * Vercel Serverless Function Catch-All Entrypoint
 * Enruta peticiones como /api/products, /api/auth/login, etc.
 */
const app = require('../server/app');

module.exports = app;
