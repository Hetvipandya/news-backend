// backend/src/middlewares/authenticate.js
const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/user');
require('../models/role');
const Tenant = require('../models/tenant');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  try {
    const user = await User.findById(payload.sub).select('-passwordHash').populate('roleId');
    if (
      !user
      || !user.isActive
      || !user.roleId
      || user.tenantId.toString() !== payload.tenantId
      || (payload.tokenVersion || 0) !== user.tokenVersion
    ) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }
    const tenant = await Tenant.findById(user.tenantId).select('status');
    if (!tenant || tenant.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Tenant is unavailable' });
    }
    req.user = {
      id: user._id.toString(),
      tenantId: user.tenantId.toString(),
      email: user.email,
      roleId: user.roleId._id.toString(),
      roleName: user.roleId.name,
      permissions: user.roleId.permissions || [],
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = authenticate;
