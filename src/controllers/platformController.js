const Tenant = require('../models/tenant');
const Role = require('../models/role');
const User = require('../models/user');
const Newspaper = require('../models/newspaper');
const Edition = require('../models/edition');
const rolePermissions = require('../config/rolePermissions');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function listPublishers(req, res, next) {
  try {
    const publishers = await Tenant.find({ _id: { $ne: req.user.tenantId } })
      .select('name domain status createdAt')
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, data: publishers });
  } catch (error) {
    return next(error);
  }
}

async function createPublisher(req, res, next) {
  let tenant;
  let role;
  try {
    const { name, domain = '', ownerEmail, ownerPassword } = req.body || {};
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 120) {
      return res.status(400).json({ success: false, message: 'Publisher name must be 2 to 120 characters' });
    }
    if (typeof domain !== 'string' || domain.length > 253) {
      return res.status(400).json({ success: false, message: 'Domain must be at most 253 characters' });
    }
    if (typeof ownerEmail !== 'string' || !EMAIL_PATTERN.test(ownerEmail.trim())) {
      return res.status(400).json({ success: false, message: 'A valid owner email address is required' });
    }
    if (typeof ownerPassword !== 'string' || ownerPassword.length < 12) {
      return res.status(400).json({ success: false, message: 'Owner password must be at least 12 characters' });
    }
    const normalizedEmail = ownerEmail.trim().toLowerCase();
    if (await Tenant.exists({ name: name.trim() })) {
      return res.status(409).json({ success: false, message: 'A publisher with this name already exists' });
    }
    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({ success: false, message: 'An account with the owner email already exists' });
    }

    tenant = await Tenant.create({ name: name.trim(), domain: domain.trim(), status: 'active' });
    role = await Role.findOneAndUpdate(
      { tenantId: tenant._id, name: 'publisheradmin' },
      { $set: { permissions: rolePermissions.publisheradmin } },
      { new: true, upsert: true }
    );
    const owner = new User({ tenantId: tenant._id, email: normalizedEmail, roleId: role._id });
    owner.password = ownerPassword;
    await owner.save();

    return res.status(201).json({
      success: true,
      data: {
        publisher: { id: tenant._id, name: tenant.name, domain: tenant.domain, status: tenant.status },
        owner: { email: owner.email, roleName: 'publisheradmin' },
      },
    });
  } catch (error) {
    if (tenant) {
      try {
        if (role) await Role.deleteOne({ _id: role._id, tenantId: tenant._id });
        await Tenant.deleteOne({ _id: tenant._id });
      } catch (cleanupError) {
        return next(cleanupError);
      }
    }
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Publisher name or owner email already exists' });
    }
    return next(error);
  }
}

async function listPublisherNewspapers(req, res, next) {
  try {
    const tenants = await Tenant.find({
      _id: { $ne: req.user.tenantId },
      status: 'active',
    }).select('_id').lean();
    const newspapers = await Newspaper.find({
      tenantId: { $in: tenants.map(({ _id }) => _id) },
      status: 'active',
    })
      .select('title tenantId status')
      .populate('tenantId', 'name')
      .sort({ title: 1 })
      .lean();
    return res.json({ success: true, data: newspapers });
  } catch (error) {
    return next(error);
  }
}

async function listPublisherEditions(req, res, next) {
  try {
    const tenants = await Tenant.find({
      _id: { $ne: req.user.tenantId },
      status: 'active',
    }).select('_id').lean();
    const editions = await Edition.find({
      tenantId: { $in: tenants.map(({ _id }) => _id) },
    })
      .populate('newspaperId', 'title')
      .sort({ city: 1 })
      .lean();
    return res.json({ success: true, data: editions });
  } catch (error) {
    return next(error);
  }
}

async function createPublisherEdition(req, res, next) {
  try {
    const newspaper = await Newspaper.findOne({
      _id: req.validatedBody.newspaperId,
      status: 'active',
    }).select('tenantId').populate('tenantId', 'status').lean();
    if (!newspaper?.tenantId || newspaper.tenantId.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Active publisher newspaper not found' });
    }

    const edition = await Edition.create({
      ...req.validatedBody,
      tenantId: newspaper.tenantId._id,
    });
    return res.status(201).json({ success: true, data: edition });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listPublishers,
  createPublisher,
  listPublisherNewspapers,
  listPublisherEditions,
  createPublisherEdition,
};
