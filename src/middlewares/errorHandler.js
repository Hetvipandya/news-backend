// backend/src/middlewares/errorHandler.js
module.exports = function (err, req, res, next) {
  console.error(err);
  const status = err.status || err.statusCode
    || (err.code === 11000 ? 409 : err.name === 'ValidationError' || err.name === 'CastError' ? 400 : 500);
  const message = err.code === 11000
    ? 'A record with these values already exists'
    : status >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';
  res.status(status).json({
    success: false,
    message,
    // In production hide stack traces
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
