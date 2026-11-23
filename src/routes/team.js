const express = require('express');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const { listRoles, listTeamUsers, createTeamUser } = require('../controllers/teamController');

const router = express.Router();

router.get('/roles', authenticate, authorize('user:read'), listRoles);
router.get('/users', authenticate, authorize('user:read'), listTeamUsers);
router.post('/users', authenticate, authorize('user:create'), createTeamUser);

module.exports = router;
