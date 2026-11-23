// backend/src/controllers/authController.js
const crypto = require('crypto');
const User = require('../models/user');
require('../models/role');
const Tenant = require('../models/tenant');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Helper to create tokens and set refresh cookie
function setRefreshCookie(res, token) {
  clearLegacyRefreshCookie(res);
  // HttpOnly, Secure in production, SameSite=Strict
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    path: '/api/v1/auth',
  };
  res.cookie('refreshToken', token, options);
}

function clearLegacyRefreshCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth/refresh',
  });
}

function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
  });
  clearLegacyRefreshCookie(res);
}

function sessionError(message, clearCookie = false) {
  const error = new Error(message);
  error.status = 401;
  error.clearRefreshCookie = clearCookie;
  return error;
}

async function rotateRefreshToken(token) {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch (error) {
    throw sessionError('Invalid refresh token', true);
  }

  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user || !user.isActive || (payload.tokenVersion || 0) !== user.tokenVersion) {
    throw sessionError('Invalid or expired session', true);
  }
  if (user.refreshTokenHash !== hashToken(token)) {
    throw sessionError('Refresh token has already been used');
  }

  const tenant = await Tenant.findById(user.tenantId).select('status');
  if (!tenant || tenant.status !== 'active') {
    throw sessionError('Account is unavailable', true);
  }
  const refreshedPayload = {
    sub: user._id.toString(),
    tenantId: user.tenantId.toString(),
    roleId: user.roleId.toString(),
    tokenVersion: user.tokenVersion,
  };
  const accessToken = signAccessToken(refreshedPayload);
  const refreshToken = signRefreshToken(refreshedPayload);
  const updatedUser = await User.findOneAndUpdate(
    { _id: user._id, refreshTokenHash: hashToken(token), tokenVersion: user.tokenVersion },
    { $set: { refreshTokenHash: hashToken(refreshToken) } },
    { new: true }
  ).select('_id');
  if (!updatedUser) {
    throw sessionError('Refresh token has already been used');
  }
  return { accessToken, refreshToken };
}

/** POST /login */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash').populate('roleId');
    if (!user || !user.isActive || !user.roleId) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const valid = await user.verifyPassword(password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const tenant = await Tenant.findById(user.tenantId).select('status');
    if (!tenant || tenant.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Account is unavailable' });
    }
    const payload = {
      sub: user._id.toString(),
      tenantId: user.tenantId.toString(),
      roleId: user.roleId._id.toString(),
      tokenVersion: user.tokenVersion,
    };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();
    setRefreshCookie(res, refreshToken);
    return res.json({ success: true, accessToken });
  } catch (err) {
    next(err);
  }
}

/** POST /refresh */
async function refreshToken(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Refresh token missing' });
    }
    try {
      const tokens = await rotateRefreshToken(token);
      setRefreshCookie(res, tokens.refreshToken);
      return res.json({ success: true, accessToken: tokens.accessToken });
    } catch (error) {
      if (error.status === 401) {
        return res.status(401).json({ success: false, message: error.message });
      }
      throw error;
    }
  } catch (err) {
    return next(err);
  }
}

/** GET /session — restore a browser session without treating a missing cookie as an error. */
async function restoreSession(req, res, next) {
  const token = req.cookies?.refreshToken;
  if (!token) {
    clearLegacyRefreshCookie(res);
    return res.json({ success: true, authenticated: false });
  }
  try {
    const tokens = await rotateRefreshToken(token);
    setRefreshCookie(res, tokens.refreshToken);
    return res.json({ success: true, authenticated: true, accessToken: tokens.accessToken });
  } catch (error) {
    if (error.status === 401) {
      if (error.clearRefreshCookie) clearRefreshCookie(res);
      return res.json({ success: true, authenticated: false });
    }
    return next(error);
  }
}

/** POST /logout */
async function logout(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      try {
        const payload = verifyRefreshToken(token);
        await User.findOneAndUpdate(
          { _id: payload.sub, refreshTokenHash: hashToken(token), tokenVersion: payload.tokenVersion || 0 },
          { $unset: { refreshTokenHash: 1 }, $inc: { tokenVersion: 1 } }
        );
      } catch (error) {
        if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') {
          throw error;
        }
      }
    }
    clearRefreshCookie(res);
    return res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

function me(req, res) {
  return res.json({ success: true, data: req.user });
}

module.exports = { login, refreshToken, restoreSession, logout, me };
