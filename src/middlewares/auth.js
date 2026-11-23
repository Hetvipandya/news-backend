import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import { User } from '../models/user.js';
import { config } from '../config/index.js';

/**
 * Middleware to protect routes – verifies JWT access token.
 * Adds `req.user` with `{ id, email, role, tenantId }`.
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, token missing' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    // Attach useful fields to request
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId?.toString(),
    };
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
  }
});
