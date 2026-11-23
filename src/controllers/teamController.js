const User = require('../models/user');
const Role = require('../models/role');
const rolePermissions = require('../config/rolePermissions');
const roleCatalog = require('../config/roleCatalog');

const ASSIGNABLE_ROLES = Object.keys(rolePermissions).filter((name) => name !== 'publisheradmin');
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function listRoles(req, res) {
  return res.json({ success: true, data: roleCatalog });
}

async function listTeamUsers(req, res, next) {
  try {
    const users = await User.find({ tenantId: req.user.tenantId })
      .select('email roleId isActive createdAt')
      .populate('roleId', 'name')
      .sort({ createdAt: -1 })
      .lean();
    return res.json({
      success: true,
      data: users.map((user) => ({
        id: user._id,
        email: user.email,
        roleName: user.roleId?.name,
        isActive: user.isActive,
        createdAt: user.createdAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
}

async function createTeamUser(req, res, next) {
  try {
    const { email, password, roleName } = req.body || {};
    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'A valid email address is required' });
    }
    if (typeof password !== 'string' || password.length < 12) {
      return res.status(400).json({ success: false, message: 'Password must be at least 12 characters' });
    }
    if (typeof roleName !== 'string' || !ASSIGNABLE_ROLES.includes(roleName)) {
      return res.status(400).json({ success: false, message: 'Select an assignable publisher team role' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }
    const role = await Role.findOneAndUpdate(
      { tenantId: req.user.tenantId, name: roleName },
      { $set: { permissions: rolePermissions[roleName] } },
      { new: true, upsert: true }
    );
    const user = new User({
      tenantId: req.user.tenantId,
      email: normalizedEmail,
      roleId: role._id,
    });
    user.password = password;
    await user.save();

    return res.status(201).json({
      success: true,
      data: { id: user._id, email: user.email, roleName, isActive: user.isActive },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }
    return next(error);
  }
}

module.exports = { listRoles, listTeamUsers, createTeamUser };
