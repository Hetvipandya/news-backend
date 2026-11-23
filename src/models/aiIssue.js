const mongoose = require('mongoose');

const AiArticleItemSchema = new mongoose.Schema({
  headline: { type: String, required: true, trim: true, maxlength: 300 },
  deck: { type: String, trim: true, default: '', maxlength: 600 },
  body: { type: String, required: true, maxlength: 100000 },
  summary: { type: String, default: '', maxlength: 2000 },
  keyTakeaways: [{ type: String, trim: true }],
  category: { type: String, default: 'General', trim: true, maxlength: 80 },
  language: { type: String, default: 'en', trim: true, lowercase: true, maxlength: 16 },
  sourceName: { type: String, default: '', trim: true, maxlength: 120 },
  sourceUrl: { type: String, default: '', trim: true, maxlength: 2048 },
  sentiment: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' },
  importanceScore: { type: Number, min: 1, max: 10, default: 5 },
  isLeadStory: { type: Boolean, default: false },
  author: { type: String, default: 'AI News Desk', trim: true, maxlength: 160 },
  publishedAt: { type: Date, default: Date.now },
  suggestedPage: { type: Number, default: 1, min: 1, max: 24 },
  importedArticleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article' },
  status: { type: String, enum: ['draft', 'ready', 'imported'], default: 'ready' },
}, { _id: true });

const AiPageSchema = new mongoose.Schema({
  pageNumber: { type: Number, required: true, min: 1, max: 24 },
  pageTitle: { type: String, required: true, trim: true },
  pageSubtitle: { type: String, default: '', trim: true },
  category: { type: String, default: '', trim: true },
  articles: [AiArticleItemSchema],
}, { _id: true });

const AiIssueSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  newspaperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Newspaper' },
  editionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Edition' },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  issueDate: { type: Date, default: Date.now, required: true },
  language: { type: String, default: 'en', trim: true, lowercase: true },
  status: { type: String, enum: ['draft', 'analyzed', 'formatted', 'published'], default: 'draft' },
  totalPages: { type: Number, default: 8, min: 1, max: 24 },
  pages: [AiPageSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });

AiIssueSchema.index({ tenantId: 1, issueDate: -1 });

module.exports = mongoose.model('AiIssue', AiIssueSchema);
