// Centralized error handler middleware

export default function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.details
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'A record with this information already exists'
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Invalid Reference',
      message: 'Referenced record does not exist'
    });
  }

  return res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
}
