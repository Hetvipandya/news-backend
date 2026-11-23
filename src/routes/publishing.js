const express = require('express');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const {
  listNewspapers, createNewspaper, getNewspaper, updateNewspaper,
  listEditions, createEdition, updateEdition,
} = require('../controllers/publishingController');
const {
  validateCreateNewspaper, validateUpdateNewspaper,
  validateCreateEdition, validateUpdateEdition,
} = require('../validators/publishingValidator');

const router = express.Router();

router.get('/newspapers', authenticate, authorize('newspaper:read'), listNewspapers);
router.post('/newspapers', authenticate, authorize('newspaper:create'), validateCreateNewspaper, createNewspaper);
router.get('/newspapers/:id', authenticate, authorize('newspaper:read'), getNewspaper);
router.patch('/newspapers/:id', authenticate, authorize('newspaper:update'), validateUpdateNewspaper, updateNewspaper);
router.get('/editions', authenticate, authorize('edition:read'), listEditions);
router.post('/editions', authenticate, authorize('edition:create'), validateCreateEdition, createEdition);
router.patch('/editions/:id', authenticate, authorize('edition:update'), validateUpdateEdition, updateEdition);

module.exports = router;
