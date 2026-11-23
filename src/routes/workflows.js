const express = require('express');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const {
  listWorkflows, createWorkflow, updateWorkflow, getReportsSummary,
} = require('../controllers/workflowController');

const router = express.Router();

router.get('/workflows', authenticate, (req, res, next) => {
  const WorkflowItem = require('../models/workflowItem');
  if (!WorkflowItem.KINDS.includes(req.query.kind)) {
    return res.status(400).json({ success: false, message: 'A valid kind query parameter is required' });
  }
  return authorize(`workflow:${req.query.kind}:read`)(req, res, next);
}, listWorkflows);
router.post('/workflows', authenticate, (req, res, next) => {
  const WorkflowItem = require('../models/workflowItem');
  if (!req.body || !WorkflowItem.KINDS.includes(req.body.kind)) {
    return res.status(400).json({ success: false, message: 'A valid kind is required' });
  }
  return authorize(`workflow:${req.body.kind}:create`)(req, res, next);
}, createWorkflow);
router.patch('/workflows/:id', authenticate, (req, res, next) => {
  if (!req.body || Object.prototype.hasOwnProperty.call(req.body, 'kind')) {
    return res.status(400).json({ success: false, message: 'PATCH does not accept kind' });
  }
  const WorkflowItem = require('../models/workflowItem');
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid workflow ID' });
  }
  return WorkflowItem.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
    .select('kind')
    .then((item) => {
      if (!item) return res.status(404).json({ success: false, message: 'Workflow item not found' });
      return authorize(`workflow:${item.kind}:update`)(req, res, next);
    })
    .catch(next);
}, updateWorkflow);
router.get('/reports/summary', authenticate, authorize('workflow:report:read'), getReportsSummary);

module.exports = router;
