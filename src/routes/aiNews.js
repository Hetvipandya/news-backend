// backend/src/routes/aiNews.js
const express = require('express');
const authenticate = require('../middlewares/authenticate');
const {
  getAiStatus,
  getPresets,
  collect,
  analyze,
  generateIssue,
  listIssues,
  getIssueById,
  updateIssue,
  importToArticles,
} = require('../controllers/aiNewsController');

const router = express.Router();

router.use(authenticate);

// AI configuration status
router.get('/status', getAiStatus);

// Presets & collection
router.get('/presets', getPresets);
router.post('/collect', collect);
router.post('/analyze', analyze);

// Issue management & layout
router.post('/generate-issue', generateIssue);
router.get('/issues', listIssues);
router.get('/issues/:id', getIssueById);
router.patch('/issues/:id', updateIssue);

// Import into editorial workflow
router.post('/import-to-articles', importToArticles);

module.exports = router;
