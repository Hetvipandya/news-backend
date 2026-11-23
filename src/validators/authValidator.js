// backend/src/validators/authValidator.js
const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const refreshSchema = z.object({}); // no body required, token is in cookie

function validateLogin(req, res, next) {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: result.error.issues.map(({ path, message }) => ({ field: path.join('.'), message })),
    });
  }
  req.body.email = result.data.email.trim().toLowerCase();
  return next();
}

function validateRefresh(req, res, next) {
  // No body validation needed, just pass through
  next();
}

module.exports = { validateLogin, validateRefresh };
