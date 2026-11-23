// backend/src/models/tenant.js
const mongoose = require('mongoose');

const TenantSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  domain: { type: String }, // optional, for future subdomain routing
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('Tenant', TenantSchema);
