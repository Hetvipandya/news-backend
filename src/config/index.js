// backend/src/config/index.js
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const port = Number.parseInt(process.env.PORT || '8080', 10);
const jwtSecret = process.env.JWT_SECRET;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/newspaper_automation';
const aiProvider = String(process.env.AI_PROVIDER || 'gemini').trim().toLowerCase();
const providerApiKey = aiProvider === 'openai'
  ? process.env.OPENAI_API_KEY
  : process.env.GEMINI_API_KEY;
const aiApiKey = String(providerApiKey || process.env.AI_API_KEY || '').trim();
const aiModel = process.env.AI_MODEL || (aiProvider === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash');

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port');
}

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be set to at least 32 characters');
}

module.exports = {
  port,
  mongoUri,
  mongoDb: process.env.MONGODB_DB || 'newspaper_automation',
  redisUrl: process.env.REDIS_URL,
  jwtSecret,
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim()),
  rateLimitWindowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMax: Number.parseInt(process.env.RATE_LIMIT_MAX || '120', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  aiProvider,
  aiApiKey,
  aiModel,
};
