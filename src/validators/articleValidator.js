const { z } = require('zod');

const createArticleSchema = z.object({
  newspaperId: z.string().regex(/^[a-f\d]{24}$/i),
  editionScopes: z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1).max(100),
  headline: z.string().trim().min(1).max(240),
  deck: z.string().trim().max(500).optional(),
  body: z.string().trim().min(1).max(100000),
  author: z.string().trim().max(160).optional(),
  category: z.string().trim().min(1).max(80),
  language: z.string().trim().min(2).max(16),
  originalSource: z.string().url().max(2048),
  rights: z.object({
    attribution: z.string().trim().max(500).optional(),
    expiresAt: z.coerce.date().optional(),
  }),
});

const rightsSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().trim().max(1000).optional(),
});

const reviewSchema = z.object({
  action: z.enum(['start', 'approve', 'reject', 'needs_changes']),
  reason: z.string().trim().max(1000).optional(),
});

function validate(schema) {
  return function validateBody(req, res, next) {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: result.error.issues.map(({ path, message }) => ({ field: path.join('.'), message })),
      });
    }
    req.validatedBody = result.data;
    return next();
  };
}

module.exports = {
  validateCreateArticle: validate(createArticleSchema),
  validateArticleReview: validate(reviewSchema),
  validateArticleRights: validate(rightsSchema),
};
