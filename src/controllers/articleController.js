const mongoose = require('mongoose');
const Article = require('../models/article');
const Edition = require('../models/edition');
const Newspaper = require('../models/newspaper');

async function listArticles(req, res, next) {
  try {
    const filter = { tenantId: req.user.tenantId };
    if ((req.user.roleName || '').toLowerCase() === 'reporter') {
      filter.createdBy = req.user.id;
    }
    if (req.query.status) filter.status = req.query.status;
    const articles = await Article.find(filter).sort({ updatedAt: -1 }).limit(100).lean();
    return res.json({ success: true, data: articles });
  } catch (error) {
    return next(error);
  }
}

async function createArticle(req, res, next) {
  try {
    const { newspaperId, editionScopes } = req.validatedBody;
    const newspaper = await Newspaper.findOne({
      _id: newspaperId,
      tenantId: req.user.tenantId,
      status: 'active',
    }).select('_id');
    if (!newspaper) {
      return res.status(404).json({ success: false, message: 'Active newspaper not found' });
    }
    const uniqueEditionIds = [...new Set(editionScopes)];
    if (uniqueEditionIds.length !== editionScopes.length) {
      return res.status(400).json({ success: false, message: 'Edition scopes must not contain duplicates' });
    }
    const scopedEditionCount = await Edition.countDocuments({
      _id: { $in: editionScopes },
      tenantId: req.user.tenantId,
      newspaperId,
      status: 'active',
    });
    if (scopedEditionCount !== editionScopes.length) {
      return res.status(400).json({ success: false, message: 'Every edition must be active and belong to this newspaper' });
    }
    const article = await Article.create({
      ...req.validatedBody,
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      status: 'DRAFT',
    });
    return res.status(201).json({ success: true, data: article });
  } catch (error) {
    return next(error);
  }
}

async function submitArticle(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid article ID' });
    }
    const article = await Article.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }
    if (!['DRAFT', 'NEEDS_CHANGES'].includes(article.status)) {
      return res.status(409).json({ success: false, message: `Cannot submit an article in ${article.status} status` });
    }
    if (
      article.rights.status !== 'approved'
      || !article.rights.approvedAt
      || (article.rights.expiresAt && article.rights.expiresAt <= new Date())
    ) {
      return res.status(409).json({ success: false, message: 'Current source rights approval is required before submission' });
    }
    article.status = 'SUBMITTED';
    article.revision += 1;
    await article.save();
    return res.json({ success: true, data: article });
  } catch (error) {
    return next(error);
  }
}

async function reviewArticle(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid article ID' });
    }
    const article = await Article.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }
    const { action, reason } = req.validatedBody;
    if (action === 'start') {
      if (article.status !== 'SUBMITTED') {
        return res.status(409).json({ success: false, message: `Cannot start review in ${article.status} status` });
      }
      article.status = 'UNDER_REVIEW';
    } else {
      if (article.status !== 'UNDER_REVIEW') {
        return res.status(409).json({ success: false, message: `Cannot decide on an article in ${article.status} status` });
      }
      if (action !== 'approve' && !reason) {
        return res.status(400).json({ success: false, message: 'A reason is required for this decision' });
      }
      if (action === 'approve') {
        const rightsAreCurrent = article.rights.status === 'approved'
          && article.rights.approvedAt
          && (!article.rights.expiresAt || article.rights.expiresAt > new Date());
        if (!rightsAreCurrent) {
          return res.status(409).json({ success: false, message: 'Current source rights approval is required before approval' });
        }
        article.status = 'APPROVED';
      } else {
        article.status = action === 'reject' ? 'REJECTED' : 'NEEDS_CHANGES';
      }
      article.review = { actorId: req.user.id, reason, reviewedAt: new Date() };
    }
    article.revision += 1;
    await article.save();
    return res.json({ success: true, data: article });
  } catch (error) {
    return next(error);
  }
}

async function updateArticleRights(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid article ID' });
    }
    const article = await Article.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }
    const { action, reason } = req.validatedBody;
    if (action === 'reject' && !reason) {
      return res.status(400).json({ success: false, message: 'A reason is required to reject source rights' });
    }
    if (action === 'approve' && article.rights.expiresAt && article.rights.expiresAt <= new Date()) {
      return res.status(409).json({ success: false, message: 'Expired source rights cannot be approved' });
    }
    article.rights.status = action === 'approve' ? 'approved' : 'rejected';
    article.rights.approvedBy = action === 'approve' ? req.user.id : undefined;
    article.rights.approvedAt = action === 'approve' ? new Date() : undefined;
    article.rights.rejectionReason = action === 'reject' ? reason : undefined;
    article.revision += 1;
    await article.save();
    return res.json({ success: true, data: article });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listArticles, createArticle, submitArticle, reviewArticle, updateArticleRights };
