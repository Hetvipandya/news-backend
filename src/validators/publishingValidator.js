const { z } = require('zod');

const newspaperSchema = z.object({
  title: z.string().trim().min(1).max(120),
  legalOwner: z.string().trim().max(160).optional(),
  languages: z.array(z.string().trim().min(2).max(16)).min(1).max(10).optional(),
  brandAssets: z.object({ logoUrl: z.string().url().max(2048).optional() }).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

const editionSchema = z.object({
  newspaperId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid newspaperId'),
  editionCode: z.string().trim().min(1).max(32),
  stateCode: z.string().trim().min(2).max(8),
  district: z.string().trim().max(100).optional(),
  city: z.string().trim().min(1).max(100),
  language: z.string().trim().min(2).max(16),
  printCenterId: z.string().trim().max(100).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

function validate(schema, { partial = false } = {}) {
  const activeSchema = partial
    ? schema.partial().refine((value) => Object.keys(value).length > 0, 'At least one field is required')
    : schema;
  return function validateBody(req, res, next) {
    const result = activeSchema.safeParse(req.body);
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
  validateCreateNewspaper: validate(newspaperSchema),
  validateUpdateNewspaper: validate(newspaperSchema, { partial: true }),
  validateCreateEdition: validate(editionSchema),
  validateUpdateEdition: validate(editionSchema, { partial: true }),
};
