// backend/src/server.js
const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const config = require('./config');
const { connectDB } = require('./utils/db');

const server = http.createServer(app);

async function start() {
  await connectDB();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, resolve);
  });
  console.log(`Backend server listening on port ${config.port}`);
}

async function shutdown(signal) {
  console.log(`${signal} received; shutting down server...`);
  server.close(async (error) => {
    if (error) {
      console.error('HTTP server shutdown failed:', error);
      process.exitCode = 1;
    }
    await mongoose.disconnect();
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

start().catch((error) => {
  console.error('Backend startup failed:', error);
  process.exitCode = 1;
});
