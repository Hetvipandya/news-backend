const mongoose = require('mongoose');

const NewspaperSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  legalOwner: { type: String, trim: true, maxlength: 160 },
  languages: { type: [String], required: true, default: ['en'] },
  brandAssets: {
    logoUrl: { type: String, trim: true },
  },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

NewspaperSchema.index({ tenantId: 1, title: 1 }, { unique: true });

module.exports = mongoose.model('Newspaper', NewspaperSchema);
