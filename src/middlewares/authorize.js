function authorize(permission) {
  return function requirePermission(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (req.user.roleName.toLowerCase() === 'superadmin' || req.user.permissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({ success: false, message: 'Forbidden: missing permission' });
  };
}

module.exports = authorize;
