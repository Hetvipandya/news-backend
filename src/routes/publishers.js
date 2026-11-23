// backend/src/routes/publishers.js
const express = require('express');
const { createPublisher, getPublisher, updatePublisher } = require('../controllers/publisherController');
const { validateCreatePublisher, validateUpdatePublisher } = require('../validators/publisherValidator');
const authorize = require('../middlewares/authorize');

const router = express.Router();

// Only SuperAdmin can manage publishers at platform level
router.post('/', authorize('publisher:create'), validateCreatePublisher, createPublisher);
router.get('/:id', authorize('publisher:read'), getPublisher);
router.patch('/:id', authorize('publisher:update'), validateUpdatePublisher, updatePublisher);

module.exports = router;
