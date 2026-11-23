import asyncHandler from 'express-async-handler';
import { Role } from '../models/role.js';

/**
 * Middleware to enforce permission based on role.
 * Usage: router.get('/some', protect, requirePermission('tenant:manage'), handler)
 */
export const requirePermission = (permission) =>
  asyncHandler(async (req, res, next) => {
    const userRole = req.user.role;
    // SuperAdmin bypasses checks
    if (userRole === 'superadmin') {
      return next();
    }
    // Fetch role definition for the tenant
    const roleDef = await Role.findOne({ name: userRole, tenantId: req.user.tenantId });
    if (!roleDef) {
      return res.status(403).json({ success: false, message: 'Role definition not found' });
    }
    if (roleDef.permissions.includes(permission)) {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Forbidden – missing permission' });
  });
