const pool = require('../config/database');

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.status = statusCode;
    this.code = code || 'ERROR';
    this.isOperational = true;
  }
}

const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.isOperational ? err.message : 'Something went wrong';

  if (!err.isOperational) {
    console.error('Unhandled error:', {
      message: err.message,
      stack: err.stack,
      method: req.method,
      path: req.path,
      userId: req.user?.id,
    });

    pool.query(
      `INSERT INTO audit_logs (event_type, details, ip_address)
       VALUES ('system_error', $1, $2)`,
      [JSON.stringify({ message: err.message, path: req.path, method: req.method }), req.ip]
    ).catch(() => {});
  }

  const response = { error: message, code };
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  if (err.name === 'ValidationError') {
    response.error = err.message;
    response.code = 'VALIDATION_ERROR';
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    response.error = 'Authentication failed';
    response.code = 'AUTH_ERROR';
  }

  res.status(status).json(response);
};

module.exports = { errorHandler, AppError };
