class ApiError extends Error {
  constructor(statusCode, message, code = 'API_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

class BadRequestError extends ApiError {
  constructor(message, details = null) {
    super(400, message, 'BAD_REQUEST', details);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized access') {
    super(401, message, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
  }
}

class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(404, message, 'NOT_FOUND');
  }
}

class ConflictError extends ApiError {
  constructor(message = 'Resource conflict') {
    super(409, message, 'CONFLICT');
  }
}

class TooManyRequestsError extends ApiError {
  constructor(message = 'Rate limit exceeded', retryAfterSeconds = 60) {
    super(429, message, 'TOO_MANY_REQUESTS', { retryAfterSeconds });
  }
}

module.exports = {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
};
