import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Error codes from `docs/api_spec.md`.
 *
 * These are the stable identifiers clients branch on. Nest 12 serialises
 * `errorCode` from `HttpExceptionOptions` into the response body, so the
 * contract is enforced by the framework rather than by convention.
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/** A field-level validation problem, matching the spec's `details[]` shape. */
export interface ErrorDetail {
  field: string;
  message: string;
}

const STATUS_BY_CODE: Record<ErrorCodeValue, HttpStatus> = {
  VALIDATION_ERROR: HttpStatus.BAD_REQUEST,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  RATE_LIMIT_EXCEEDED: HttpStatus.TOO_MANY_REQUESTS,
  INTERNAL_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,
};

/**
 * An HTTP exception carrying a spec-defined `errorCode`.
 *
 * The global exception filter reads `errorCode` to build the
 * `{ error: { code, message, details } }` envelope.
 */
export class ApiException extends HttpException {
  readonly errorCode: ErrorCodeValue;
  readonly details?: ErrorDetail[];

  constructor(
    errorCode: ErrorCodeValue,
    message: string,
    details?: ErrorDetail[],
  ) {
    super(message, STATUS_BY_CODE[errorCode], {
      errorCode,
      ...(details ? { details } : {}),
    });
    this.errorCode = errorCode;
    this.details = details;
  }
}

export class ValidationException extends ApiException {
  constructor(message = 'Request validation failed', details?: ErrorDetail[]) {
    super(ErrorCode.VALIDATION_ERROR, message, details);
  }
}

export class UnauthorizedException extends ApiException {
  constructor(message = 'Missing or invalid authentication') {
    super(ErrorCode.UNAUTHORIZED, message);
  }
}

export class ForbiddenException extends ApiException {
  constructor(message = 'Insufficient permissions') {
    super(ErrorCode.FORBIDDEN, message);
  }
}

export class NotFoundException extends ApiException {
  constructor(message = 'Resource not found') {
    super(ErrorCode.NOT_FOUND, message);
  }
}

export class ConflictException extends ApiException {
  constructor(message = 'Resource already exists') {
    super(ErrorCode.CONFLICT, message);
  }
}

export class RateLimitException extends ApiException {
  constructor(message = 'Rate limit exceeded. Try again in 60 seconds.') {
    super(ErrorCode.RATE_LIMIT_EXCEEDED, message);
  }
}

export class InternalException extends ApiException {
  constructor(message = 'Internal server error') {
    super(ErrorCode.INTERNAL_ERROR, message);
  }
}

/**
 * Narrow a thrown value to an `ApiException`, or wrap it as a 500.
 *
 * Unknown errors are logged and returned as `INTERNAL_ERROR` so that internal
 * messages never leak to clients.
 */
export function toApiException(err: unknown): ApiException {
  if (err instanceof ApiException) return err;

  if (err instanceof HttpException) {
    const status = err.getStatus();
    const mapped = mapStatusToCode(status);
    return new ApiException(mapped, exceptionMessage(err));
  }

  return new InternalException();
}

function mapStatusToCode(status: number): ErrorCodeValue {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return ErrorCode.VALIDATION_ERROR;
    case HttpStatus.UNAUTHORIZED:
      return ErrorCode.UNAUTHORIZED;
    case HttpStatus.FORBIDDEN:
      return ErrorCode.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ErrorCode.NOT_FOUND;
    case HttpStatus.CONFLICT:
      return ErrorCode.CONFLICT;
    case HttpStatus.TOO_MANY_REQUESTS:
      return ErrorCode.RATE_LIMIT_EXCEEDED;
    default:
      return ErrorCode.INTERNAL_ERROR;
  }
}

function exceptionMessage(err: HttpException): string {
  const res = err.getResponse();
  if (typeof res === 'string') return res;
  if (typeof res === 'object' && res !== null && 'message' in res) {
    const m = (res as { message: unknown }).message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m)) return m.join(', ');
  }
  return err.message;
}


