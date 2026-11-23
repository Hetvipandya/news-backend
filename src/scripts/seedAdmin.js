const mongoose = require('mongoose');
const config = require('../config');
const { connectDB } = require('../utils/db');
const Tenant = require('../models/tenant');
const Role = require('../models/role');
const User = require('../models/user');

async function seedAdmin() {
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;
  const tenantName = process.env.SUPERADMIN_TENANT_NAME || 'Platform';

  if (!email || !password || password.length < 12) {
    throw new Error('Set SUPERADMIN_EMAIL and a SUPERADMIN_PASSWORD of at least 12 characters');
  }

  await connectDB();
  const tenant = await Tenant.findOneAndUpdate(
    { name: tenantName },
    { $setOnInsert: { name: tenantName, status: 'active' } },
    { new: true, upsert: true }
  );
  const role = await Role.findOneAndUpdate(
    { tenantId: tenant._id, name: 'superadmin' },
    { $setOnInsert: { permissions: ['*'] } },
    { new: true, upsert: true }
  );
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log(`Administrator ${email} already exists; no credentials were changed.`);
  } else {
    const user = new User({ tenantId: tenant._id, email, roleId: role._id });
    user.password = password;
    await user.save();
    console.log(`Administrator ${email} created in tenant ${tenant.name}.`);
  }
}

seedAdmin()
  .catch((error) => {
    console.error('Administrator bootstrap failed:', error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
