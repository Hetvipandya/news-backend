const mongoose = require('mongoose');
const config = require('../config');
const { connectDB } = require('../utils/db');
const Tenant = require('../models/tenant');
const Role = require('../models/role');
const User = require('../models/user');
const rolePermissions = require('../config/rolePermissions');

const demoAccounts = [
  { role: 'superadmin', email: 'platform.admin@demo.com', tenant: 'Platform', permissions: ['*'] },
  { role: 'publisheradmin', email: 'publisher.owner@demo.com', tenant: 'Demo Publisher', permissions: rolePermissions.publisheradmin },
  { role: 'editionmanager', email: 'edition.manager@demo.com', tenant: 'Demo Publisher', permissions: rolePermissions.editionmanager },
  { role: 'editor', email: 'editor@demo.com', tenant: 'Demo Publisher', permissions: rolePermissions.editor },
  { role: 'reporter', email: 'reporter@demo.com', tenant: 'Demo Publisher', permissions: rolePermissions.reporter },
  { role: 'designer', email: 'designer@demo.com', tenant: 'Demo Publisher', permissions: rolePermissions.designer },
  { role: 'campaignmanager', email: 'campaign.manager@demo.com', tenant: 'Demo Publisher', permissions: rolePermissions.campaignmanager },
  { role: 'collectionoperator', email: 'collection.operator@demo.com', tenant: 'Demo Publisher', permissions: rolePermissions.collectionoperator },
  { role: 'verificationofficer', email: 'verification.officer@demo.com', tenant: 'Demo Publisher', permissions: rolePermissions.verificationofficer },
  { role: 'drawofficer', email: 'draw.officer@demo.com', tenant: 'Demo Publisher', permissions: rolePermissions.drawofficer },
  { role: 'reader', email: 'reader@demo.com', tenant: 'Demo Publisher', permissions: rolePermissions.reader },
];

async function seedDemoRoles() {
  if (config.nodeEnv === 'production') {
    throw new Error('Demo role accounts cannot be created in production.');
  }
  const password = process.env.DEMO_ROLES_PASSWORD || 'Demo@12345';
  if (password.length < 8) {
    throw new Error('DEMO_ROLES_PASSWORD must be at least 8 characters.');
  }

  await connectDB();
  const tenants = new Map();
  for (const account of demoAccounts) {
    if (!tenants.has(account.tenant)) {
      const tenant = await Tenant.findOneAndUpdate(
        { name: account.tenant },
        { $setOnInsert: { name: account.tenant, status: 'active' } },
        { new: true, upsert: true }
      );
      tenants.set(account.tenant, tenant);
    }

    const tenant = tenants.get(account.tenant);
    const role = await Role.findOneAndUpdate(
      { tenantId: tenant._id, name: account.role },
      { $set: { permissions: account.permissions } },
      { new: true, upsert: true }
    );
    const existingUser = await User.findOne({ email: account.email });
    if (existingUser) {
      console.log(`${account.role}: ${account.email} already exists; credentials were not changed.`);
      continue;
    }

    const user = new User({ tenantId: tenant._id, email: account.email, roleId: role._id });
    user.password = password;
    await user.save();
    console.log(`${account.role}: created ${account.email}.`);
  }
  console.log(`Demo role accounts are ready. Default password: ${password}`);
}

seedDemoRoles()
  .catch((error) => {
    console.error('Demo role seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
