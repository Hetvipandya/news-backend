const express = require('express');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const {
  listPublishers, createPublisher,
  listPublisherNewspapers, listPublisherEditions, createPublisherEdition,
} = require('../controllers/platformController');
const { validateCreateEdition } = require('../validators/publishingValidator');

const router = express.Router();

function requireSuperadmin(req, res, next) {
  if (req.user?.roleName?.toLowerCase() !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Forbidden: platform superadmin access required' });
  }
  return next();
}

router.get('/publishers', authenticate, authorize('publisher:read'), listPublishers);
router.post('/publishers', authenticate, authorize('publisher:create'), createPublisher);
router.get('/newspapers', authenticate, requireSuperadmin, listPublisherNewspapers);
router.get('/editions', authenticate, requireSuperadmin, listPublisherEditions);
router.post('/editions', authenticate, requireSuperadmin, validateCreateEdition, createPublisherEdition);

module.exports = router;
