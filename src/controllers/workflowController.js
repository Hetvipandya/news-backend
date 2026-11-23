const mongoose = require('mongoose');
const WorkflowItem = require('../models/workflowItem');

const ALLOWED_CREATE_FIELDS = ['kind', 'title', 'description', 'status', 'data'];
const ALLOWED_UPDATE_FIELDS = ['title', 'description', 'status', 'data'];
const PUBLIC_CAMPAIGN_DATA_FIELDS = ['campaignCode', 'startDate', 'endDate', 'terms'];
const REQUIRED_DATA_FIELDS = {
  template: ['edition', 'version'],
  issue: ['edition', 'issueDate'],
  campaign: ['campaignCode', 'startDate', 'endDate', 'terms'],
  center: ['location'],
  intake: ['center', 'receiptId', 'sheetsCount', 'receivedAt'],
  verification: ['receiptId', 'couponSeries', 'evidenceNotes'],
  draw: ['campaign', 'drawDate', 'seedReference'],
  claim: ['campaign', 'participantName', 'email', 'phone', 'claimDetails', 'consent'],
};
const DATE_FIELDS = ['issueDate', 'startDate', 'endDate', 'receivedAt', 'drawDate'];
const ALLOWED_TRANSITIONS = {
  template: {
    draft: ['review'],
    review: ['draft', 'approved'],
    approved: ['archived'],
    archived: [],
  },
  issue: {
    planning: ['proof'],
    proof: ['planning', 'approved'],
    approved: ['proof', 'published'],
    published: [],
  },
  campaign: {
    draft: ['approved'],
    approved: ['active'],
    active: ['paused', 'completed'],
    paused: ['active', 'completed'],
    completed: [],
  },
  center: {
    active: ['inactive'],
    inactive: ['active'],
  },
  intake: {
    received: ['frozen', 'rejected'],
    frozen: ['verified', 'rejected'],
    verified: [],
    rejected: [],
  },
  verification: {
    pending: ['verified', 'rejected'],
    verified: [],
    rejected: [],
  },
  draw: {
    scheduled: ['entries_frozen'],
    entries_frozen: ['completed'],
    completed: ['audited'],
    audited: [],
  },
  claim: {
    submitted: ['under_review', 'rejected'],
    under_review: ['approved', 'rejected'],
    approved: ['paid'],
    rejected: [],
    paid: [],
  },
};

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validData(value) {
  if (!isPlainObject(value)) return false;
  let entries = 0;
  function visit(item, depth) {
    if (depth > 8) return false;
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return typeof item !== 'string' || item.length <= 10000;
    if (typeof item === 'number') return Number.isFinite(item);
    if (Array.isArray(item)) return item.length <= 500 && item.every((entry) => visit(entry, depth + 1));
    if (!isPlainObject(item)) return false;
    const keys = Object.keys(item);
    entries += keys.length;
    return entries <= 500 && keys.every((key) => (
      !['__proto__', 'prototype', 'constructor'].includes(key)
      && key.length <= 100
      && visit(item[key], depth + 1)
    ));
  }
  return visit(value, 0);
}

function validateWorkflowData(kind, value) {
  if (!isPlainObject(value)) return { error: 'data must be a JSON object with valid bounded values' };
  const data = { ...value };
  for (const field of REQUIRED_DATA_FIELDS[kind]) {
    if (field === 'consent') {
      if (data.consent !== true) return { error: 'data.consent must be true' };
    } else if (field === 'sheetsCount') {
      const count = typeof data.sheetsCount === 'string' && /^\d+$/.test(data.sheetsCount)
        ? Number(data.sheetsCount)
        : data.sheetsCount;
      if (!Number.isSafeInteger(count) || count <= 0) {
        return { error: 'data.sheetsCount must be a positive integer' };
      }
      data.sheetsCount = count;
    } else if (typeof data[field] !== 'string' || !data[field].trim()) {
      return { error: `data.${field} is required` };
    }
  }
  for (const field of DATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(data, field)
      && (typeof data[field] !== 'string' || Number.isNaN(Date.parse(data[field])))) {
      return { error: `data.${field} must be a valid date` };
    }
  }
  if (kind === 'claim' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    return { error: 'data.email must be a valid email address' };
  }
  if (!validData(data)) return { error: 'data must be a JSON object with valid bounded values' };
  return { data };
}

function validateFields(body, allowed, requireKind) {
  if (!isPlainObject(body)) return 'Request body must be an object';
  const keys = Object.keys(body);
  const unsupported = keys.find((key) => !allowed.includes(key));
  if (unsupported) return `Unsupported field: ${unsupported}`;
  if (requireKind && !body.kind) return 'kind is required';
  if (requireKind && !WorkflowItem.KINDS.includes(body.kind)) return 'Invalid workflow kind';
  if (requireKind && !Object.prototype.hasOwnProperty.call(body, 'title')) return 'title is required';
  if (Object.prototype.hasOwnProperty.call(body, 'title')
    && (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 200)) {
    return 'title must be a non-empty string of at most 200 characters';
  }
  if (Object.prototype.hasOwnProperty.call(body, 'description')
    && (typeof body.description !== 'string' || body.description.length > 2000)) {
    return 'description must be a string of at most 2000 characters';
  }
  if (Object.prototype.hasOwnProperty.call(body, 'data') && !validData(body.data)) {
    return 'data must be a JSON object with valid bounded values';
  }
  const kind = body.kind;
  if (kind && Object.prototype.hasOwnProperty.call(body, 'status')
    && (!WorkflowItem.STATUSES[kind] || !WorkflowItem.STATUSES[kind].includes(body.status))) {
    return `Invalid status for ${kind}`;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'status')
    && (typeof body.status !== 'string' || !body.status.trim())) return 'status must be a string';
  return null;
}

function claimOwnerFilter(req, kind) {
  return kind === 'claim' && ['reader', 'participant'].includes((req.user.roleName || '').toLowerCase())
    ? { createdBy: req.user.id }
    : {};
}

function emailFilter(email) {
  const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return { $regex: `^${escapedEmail}$`, $options: 'i' };
}

function serializeWorkflowItem(item) {
  const source = item && typeof item.toObject === 'function' ? item.toObject() : item;
  return {
    _id: source._id,
    kind: source.kind,
    title: source.title,
    description: source.description,
    status: source.status,
    data: source.data,
    createdBy: source.createdBy,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function serializeCampaignForReader(item) {
  const serialized = serializeWorkflowItem(item);
  const data = {};
  if (isPlainObject(serialized.data)) {
    PUBLIC_CAMPAIGN_DATA_FIELDS.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(serialized.data, field)) data[field] = serialized.data[field];
    });
  }
  return { ...serialized, data };
}

async function collectionOperatorFilter(req, kind) {
  const email = req.user.email;
  if (!email) return null;
  if (kind === 'center') return { 'data.assignedOperator': emailFilter(email) };
  if (kind !== 'intake') return {};
  const centers = await WorkflowItem.find({
    tenantId: req.user.tenantId,
    kind: 'center',
    'data.assignedOperator': emailFilter(email),
  }).select('_id').lean();
  if (!centers.length) return null;
  const centerIds = centers.reduce((ids, center) => {
    ids.push(center._id);
    if (String(center._id) !== center._id) ids.push(String(center._id));
    return ids;
  }, []);
  return { 'data.center': { $in: centerIds } };
}

async function listWorkflows(req, res, next) {
  try {
    const { kind } = req.query;
    if (!WorkflowItem.KINDS.includes(kind)) {
      return res.status(400).json({ success: false, message: 'A valid kind query parameter is required' });
    }
    const filter = {
      tenantId: req.user.tenantId,
      kind,
      ...claimOwnerFilter(req, kind),
    };
    if ((req.user.roleName || '').toLowerCase() === 'collectionoperator') {
      const assignedFilter = await collectionOperatorFilter(req, kind);
      if (assignedFilter === null) return res.json({ success: true, data: [] });
      Object.assign(filter, assignedFilter);
    }
    const items = await WorkflowItem.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
    const safeItems = items.map((item) => (
      kind === 'campaign' && (req.user.roleName || '').toLowerCase() === 'reader'
        ? serializeCampaignForReader(item)
        : serializeWorkflowItem(item)
    ));
    return res.json({ success: true, data: safeItems });
  } catch (error) {
    return next(error);
  }
}

async function createWorkflow(req, res, next) {
  try {
    const validationError = validateFields(req.body, ALLOWED_CREATE_FIELDS, true);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    const dataValidation = validateWorkflowData(req.body.kind, req.body.data === undefined ? {} : req.body.data);
    if (dataValidation.error) return res.status(400).json({ success: false, message: dataValidation.error });
    const status = req.body.status || WorkflowItem.DEFAULT_STATUSES[req.body.kind];
    if (status !== WorkflowItem.DEFAULT_STATUSES[req.body.kind]) {
      return res.status(400).json({ success: false, message: `${req.body.kind} must start in ${WorkflowItem.DEFAULT_STATUSES[req.body.kind]} status` });
    }
    if (req.body.kind === 'intake' && (req.user.roleName || '').toLowerCase() === 'collectionoperator') {
      const centerId = dataValidation.data.center;
      const assignedCenter = req.user.email && mongoose.Types.ObjectId.isValid(centerId)
        ? await WorkflowItem.findOne({
          _id: centerId,
          tenantId: req.user.tenantId,
          kind: 'center',
          'data.assignedOperator': emailFilter(req.user.email),
        }).select('_id')
        : null;
      if (!assignedCenter) {
        return res.status(403).json({ success: false, message: 'Intake must be assigned to one of your collection centers' });
      }
    }
    const item = await WorkflowItem.create({
      kind: req.body.kind,
      title: req.body.title.trim(),
      description: req.body.description === undefined ? '' : req.body.description.trim(),
      status,
      data: dataValidation.data,
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
    });
    return res.status(201).json({ success: true, data: serializeWorkflowItem(item) });
  } catch (error) {
    return next(error);
  }
}

async function updateWorkflow(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid workflow ID' });
    }
    const validationError = validateFields(req.body, ALLOWED_UPDATE_FIELDS, false);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    if (!Object.keys(req.body).length) {
      return res.status(400).json({ success: false, message: 'At least one field is required' });
    }

    const filter = { _id: req.params.id, tenantId: req.user.tenantId };
    const existing = await WorkflowItem.findOne(filter);
    if (!existing) return res.status(404).json({ success: false, message: 'Workflow item not found' });
    if (claimOwnerFilter(req, existing.kind).createdBy) filter.createdBy = req.user.id;
    if (filter.createdBy && String(existing.createdBy) !== String(req.user.id)) {
      return res.status(404).json({ success: false, message: 'Workflow item not found' });
    }
    const isParticipant = ['reader', 'participant'].includes((req.user.roleName || '').toLowerCase());
    if (existing.kind === 'claim' && isParticipant
      && Object.keys(req.body).some((field) => !['description', 'data'].includes(field))) {
      return res.status(400).json({ success: false, message: 'Participants may only update claim description or data' });
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'status')
      && !WorkflowItem.STATUSES[existing.kind].includes(req.body.status)) {
      return res.status(400).json({ success: false, message: `Invalid status for ${existing.kind}` });
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'status')
      && req.body.status !== existing.status
      && !ALLOWED_TRANSITIONS[existing.kind][existing.status]?.includes(req.body.status)) {
      return res.status(409).json({
        success: false,
        message: `Cannot change ${existing.kind} from ${existing.status} to ${req.body.status}`,
      });
    }
    const update = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(update, 'data')) {
      const dataValidation = validateWorkflowData(existing.kind, {
        ...(isPlainObject(existing.data) ? existing.data : {}),
        ...update.data,
      });
      if (dataValidation.error) return res.status(400).json({ success: false, message: dataValidation.error });
      update.data = dataValidation.data;
    }
    if (Object.prototype.hasOwnProperty.call(update, 'title')) update.title = update.title.trim();
    if (Object.prototype.hasOwnProperty.call(update, 'description')) update.description = update.description.trim();
    if (Object.prototype.hasOwnProperty.call(update, 'status') && update.status !== existing.status) {
      filter.status = existing.status;
    }
    const item = await WorkflowItem.findOneAndUpdate(filter, { $set: update }, { new: true, runValidators: true });
    if (!item) {
      return res.status(filter.status ? 409 : 404).json({
        success: false,
        message: filter.status ? 'Workflow item changed; reload and retry' : 'Workflow item not found',
      });
    }
    return res.json({ success: true, data: serializeWorkflowItem(item) });
  } catch (error) {
    return next(error);
  }
}

async function getReportsSummary(req, res, next) {
  try {
    const groups = await WorkflowItem.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(req.user.tenantId) } },
      { $facet: {
        byKind: [{ $group: { _id: '$kind', count: { $sum: 1 } } }, { $sort: { _id: 1 } }],
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { _id: 1 } }],
        total: [{ $count: 'count' }],
      } },
    ]);
    const summary = groups[0] || { byKind: [], byStatus: [], total: [] };
    return res.json({
      success: true,
      data: {
        total: summary.total.length ? summary.total[0].count : 0,
        byKind: summary.byKind.map(({ _id, count }) => ({ kind: _id, count })),
        byStatus: summary.byStatus.map(({ _id, count }) => ({ status: _id, count })),
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listWorkflows, createWorkflow, updateWorkflow, getReportsSummary };
