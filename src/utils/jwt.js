// backend/src/utils/jwt.js
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');

function signAccessToken(payload) {
  return jwt.sign({ ...payload, tokenUse: 'access' }, config.jwtSecret, { expiresIn: config.jwtAccessExpires });
}

function signRefreshToken(payload) {
  return jwt.sign(
    { ...payload, tokenUse: 'refresh', jti: crypto.randomBytes(16).toString('hex') },
    config.jwtSecret,
    { expiresIn: config.jwtRefreshExpires }
  );
}

function verifyAccessToken(token) {
  const payload = jwt.verify(token, config.jwtSecret);
  if (payload.tokenUse !== 'access') {
    throw new Error('Invalid access token');
  }
  return payload;
}

function verifyRefreshToken(token) {
  const payload = jwt.verify(token, config.jwtSecret);
  if (payload.tokenUse !== 'refresh') {
    throw new Error('Invalid refresh token');
  }
  return payload;
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
