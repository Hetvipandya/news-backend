const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  newspaperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Newspaper', required: true },
  editionScopes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Edition', required: true }],
  headline: { type: String, required: true, trim: true, maxlength: 240 },
  deck: { type: String, trim: true, maxlength: 500 },
  body: { type: String, required: true, trim: true, maxlength: 100000 },
  author: { type: String, trim: true, maxlength: 160 },
  category: { type: String, required: true, trim: true, maxlength: 80 },
  language: { type: String, required: true, trim: true, lowercase: true, maxlength: 16 },
  originalSource: { type: String, required: true, trim: true, maxlength: 2048 },
  rights: {
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', required: true },
    attribution: { type: String, trim: true, maxlength: 500 },
    expiresAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String, trim: true, maxlength: 1000 },
  },
  status: {
    type: String,
    enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES', 'SCHEDULED', 'PUBLISHED', 'WITHDRAWN'],
    default: 'DRAFT',
    required: true,
  },
  review: {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, trim: true, maxlength: 1000 },
    reviewedAt: { type: Date },
  },
  revision: { type: Number, default: 1, min: 1 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

ArticleSchema.index({ tenantId: 1, status: 1, updatedAt: -1 });
ArticleSchema.index({ tenantId: 1, newspaperId: 1, editionScopes: 1, status: 1 });

module.exports = mongoose.model('Article', ArticleSchema);
