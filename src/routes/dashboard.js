const express = require('express');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const { getSummary } = require('../controllers/dashboardController');

const router = express.Router();

router.get('/summary', authenticate, authorize('dashboard:read'), getSummary);

module.exports = router;
