const mongoose = require('mongoose');

const EditionSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  newspaperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Newspaper', required: true },
  editionCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 32 },
  stateCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 8 },
  district: { type: String, trim: true, maxlength: 100 },
  city: { type: String, required: true, trim: true, maxlength: 100 },
  language: { type: String, required: true, trim: true, lowercase: true, maxlength: 16 },
  printCenterId: { type: String, trim: true, maxlength: 100 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

EditionSchema.index({ tenantId: 1, newspaperId: 1, editionCode: 1 }, { unique: true });

module.exports = mongoose.model('Edition', EditionSchema);
