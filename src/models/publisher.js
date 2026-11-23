// backend/src/models/publisher.js
// In this system, a publisher is a tenant. This model is an alias for clarity.
const mongoose = require('mongoose');

const PublisherSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  branding: {
    logoUrl: { type: String },
    primaryColor: { type: String },
    secondaryColor: { type: String },
  },
  subscriptionPlan: { type: String }, // placeholder for subscription module
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

// Ensure unique publisher name per tenant (usually one per tenant, but keep constraint)
PublisherSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Publisher', PublisherSchema);
