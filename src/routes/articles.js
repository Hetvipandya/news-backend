const express = require('express');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const {
  listArticles, createArticle, submitArticle, reviewArticle, updateArticleRights,
} = require('../controllers/articleController');
const {
  validateCreateArticle, validateArticleReview, validateArticleRights,
} = require('../validators/articleValidator');

const router = express.Router();

router.use(authenticate);
router.get('/', authorize('article:read'), listArticles);
router.post('/', authorize('article:create'), validateCreateArticle, createArticle);
router.post('/:id/submit', authorize('article:submit'), submitArticle);
router.post('/:id/review', authorize('article:review'), validateArticleReview, reviewArticle);
router.post('/:id/rights', authorize('article:rights:approve'), validateArticleRights, updateArticleRights);

module.exports = router;
