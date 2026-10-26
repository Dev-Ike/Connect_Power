/**
 * Vercel serverless entry point.
 * Reuses the exact same Express app defined in server.js, so local
 * (`node server.js`) and Vercel deployments behave identically.
 */
const app = require('../server');
module.exports = app;
