const mongoose = require('mongoose');

const STATUSES = {
  template: ['draft', 'review', 'approved', 'archived'],
  issue: ['planning', 'proof', 'approved', 'published'],
  campaign: ['draft', 'approved', 'active', 'paused', 'completed'],
  center: ['active', 'inactive'],
  intake: ['received', 'frozen', 'verified', 'rejected'],
  verification: ['pending', 'verified', 'rejected'],
  draw: ['scheduled', 'entries_frozen', 'completed', 'audited'],
  claim: ['submitted', 'under_review', 'approved', 'rejected', 'paid'],
};
const DEFAULT_STATUSES = {
  template: 'draft',
  issue: 'planning',
  campaign: 'draft',
  center: 'active',
  intake: 'received',
  verification: 'pending',
  draw: 'scheduled',
  claim: 'submitted',
};

const WorkflowItemSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  kind: { type: String, enum: Object.keys(STATUSES), required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  status: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true, minimize: false });

WorkflowItemSchema.index({ tenantId: 1, kind: 1, status: 1, updatedAt: -1 });

const WorkflowItem = mongoose.model('WorkflowItem', WorkflowItemSchema);
WorkflowItem.KINDS = Object.keys(STATUSES);
WorkflowItem.STATUSES = STATUSES;
WorkflowItem.DEFAULT_STATUSES = DEFAULT_STATUSES;

module.exports = WorkflowItem;
