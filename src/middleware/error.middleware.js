import { logger } from '../config/logger.js';

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  let errors = [];

  if (err.errors && Array.isArray(err.errors)) {
    errors = err.errors;
  }

  // mongoose validation
  else if (err.name === 'ValidationError') {
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  logger.error({
    service: 'api',
    event: "error",
    userId: req.user?._id,
    path: req.originalUrl,
    method: req.method,
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });

  const message =
    statusCode === 500
      ? "Internal server error"
      : err.message

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

export { errorHandler };
