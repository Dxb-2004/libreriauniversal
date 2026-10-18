/**
 * Vercel Serverless Function Entrypoint
 * Reenvía las peticiones a la aplicación Express blindada
 */
const app = require('../server/app');

module.exports = app;
