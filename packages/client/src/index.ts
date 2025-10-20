/**
 * @flowsta/auth-client
 * Client SDK for integrating Flowsta authentication into your application
 */

export { FlowstaClient } from './FlowstaClient';

export type {
  FlowstaClientConfig,
  FlowstaUser,
  RegisterInput,
  LoginInput,
  AuthResult,
  VerifyResult,
  RefreshResult,
  GetUserResult,
  FlowstaError,
} from './types';

export {
  FlowstaAuthError,
  AuthenticationError,
  InvalidCredentialsError,
  TokenExpiredError,
  InvalidTokenError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
  NetworkError,
  AppDisabledError,
} from './errors';

