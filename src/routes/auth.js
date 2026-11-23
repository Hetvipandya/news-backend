// backend/src/routes/auth.js
const express = require('express');
const { login, refreshToken, restoreSession, logout, me } = require('../controllers/authController');
const { validateLogin, validateRefresh } = require('../validators/authValidator');
const authenticate = require('../middlewares/authenticate');

const router = express.Router();

router.post('/login', validateLogin, login);
router.post('/refresh', validateRefresh, refreshToken);
router.get('/session', restoreSession);
router.post('/logout', logout); // expects refresh token in HttpOnly cookie
router.get('/me', authenticate, me);

module.exports = router;
