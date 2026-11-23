// backend/src/models/role.js
const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  // permissions are strings like "publisher:create", "article:review"
  permissions: [{ type: String }],
}, { timestamps: true });

// Ensure role name unique per tenant
RoleSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Role', RoleSchema);
