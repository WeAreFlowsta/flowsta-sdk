/**
 * Custom error classes for Flowsta Client SDK
 */

/**
 * Base Flowsta error class
 */
export class FlowstaAuthError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;

  constructor(message: string, statusCode: number, errorCode: string) {
    super(message);
    this.name = 'FlowstaAuthError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, FlowstaAuthError.prototype);
  }
}

/**
 * Authentication failed error (401)
 */
export class AuthenticationError extends FlowstaAuthError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Invalid credentials error
 */
export class InvalidCredentialsError extends AuthenticationError {
  constructor(message: string = 'Invalid credentials') {
    super(message);
    this.name = 'InvalidCredentialsError';
    Object.setPrototypeOf(this, InvalidCredentialsError.prototype);
  }
}

/**
 * Token expired error
 */
export class TokenExpiredError extends AuthenticationError {
  constructor(message: string = 'Token has expired') {
    super(message);
    this.name = 'TokenExpiredError';
    Object.setPrototypeOf(this, TokenExpiredError.prototype);
  }
}

/**
 * Invalid token error
 */
export class InvalidTokenError extends AuthenticationError {
  constructor(message: string = 'Token is invalid') {
    super(message);
    this.name = 'InvalidTokenError';
    Object.setPrototypeOf(this, InvalidTokenError.prototype);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends FlowstaAuthError {
  constructor(message: string = 'Validation failed') {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Resource not found error (404)
 */
export class NotFoundError extends FlowstaAuthError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Conflict error (409) - e.g., user already exists
 */
export class ConflictError extends FlowstaAuthError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Rate limit exceeded error (429)
 */
export class RateLimitError extends FlowstaAuthError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Server error (500)
 */
export class ServerError extends FlowstaAuthError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'SERVER_ERROR');
    this.name = 'ServerError';
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

/**
 * Network error
 */
export class NetworkError extends FlowstaAuthError {
  constructor(message: string = 'Network request failed') {
    super(message, 0, 'NETWORK_ERROR');
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * App disabled error (403)
 */
export class AppDisabledError extends FlowstaAuthError {
  constructor(message: string = 'App has been disabled') {
    super(message, 403, 'APP_DISABLED');
    this.name = 'AppDisabledError';
    Object.setPrototypeOf(this, AppDisabledError.prototype);
  }
}

