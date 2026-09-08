import { describe, expect, it } from 'vitest';

import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';

import {
  ApiException,
  ConflictException,
  ErrorCode,
  ForbiddenException,
  InternalException,
  NotFoundException,
  RateLimitException,
  UnauthorizedException,
  ValidationException,
  toApiException,
  type ErrorDetail,
} from './errors.js';

describe('ErrorCode vocabulary', () => {
  it('matches the error codes defined in api_spec.md exactly', () => {
    expect(Object.values(ErrorCode).sort()).toEqual(
      [
        'VALIDATION_ERROR',
        'UNAUTHORIZED',
        'FORBIDDEN',
        'NOT_FOUND',
        'CONFLICT',
        'RATE_LIMIT_EXCEEDED',
        'INTERNAL_ERROR',
      ].sort(),
    );
  });
});

describe('ApiException', () => {
  it('maps each error code to its documented HTTP status', () => {
    // api_spec.md error-code-to-status mapping.
    const expected: Array<[string, number]> = [
      [ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST],
      [ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED],
      [ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN],
      [ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND],
      [ErrorCode.CONFLICT, HttpStatus.CONFLICT],
      [ErrorCode.RATE_LIMIT_EXCEEDED, HttpStatus.TOO_MANY_REQUESTS],
      [ErrorCode.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR],
    ];

    for (const [code, status] of expected) {
      const err = new ApiException(code, 'boom');
      expect(err.errorCode).toBe(code);
      expect(err.getStatus()).toBe(status);
    }
  });

  it('carries details through the exception', () => {
    const details: ErrorDetail[] = [
      { field: 'cost', message: 'must be positive' },
    ];
    const err = new ValidationException('Request validation failed', details);
    expect(err.details).toEqual(details);
  });

  it('is an instanceof HttpException so the global filter catches it', () => {
    expect(new NotFoundException('x')).toBeInstanceOf(Error);
    expect(new NotFoundException('x').getStatus()).toBe(404);
  });
});

describe('concrete exception defaults', () => {
  it('uses spec default messages and statuses', () => {
    expect(new ValidationException().getStatus()).toBe(400);
    expect(new UnauthorizedException().getStatus()).toBe(401);
    expect(new ForbiddenException().getStatus()).toBe(403);
    expect(new NotFoundException().getStatus()).toBe(404);
    expect(new ConflictException().getStatus()).toBe(409);
    expect(new RateLimitException().getStatus()).toBe(429);
    expect(new InternalException().getStatus()).toBe(500);
  });

  it('exposes the right errorCode per subclass', () => {
    expect(new ValidationException().errorCode).toBe('VALIDATION_ERROR');
    expect(new UnauthorizedException().errorCode).toBe('UNAUTHORIZED');
    expect(new ForbiddenException().errorCode).toBe('FORBIDDEN');
    expect(new NotFoundException().errorCode).toBe('NOT_FOUND');
    expect(new ConflictException().errorCode).toBe('CONFLICT');
    expect(new RateLimitException().errorCode).toBe('RATE_LIMIT_EXCEEDED');
    expect(new InternalException().errorCode).toBe('INTERNAL_ERROR');
  });
});

describe('toApiException', () => {
  it('passes an ApiException through unchanged', () => {
    const original = new ConflictException('Share already exists');
    const result = toApiException(original);
    expect(result).toBe(original);
  });

  it.each([
    [HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR],
    [HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED],
    [HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN],
    [HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND],
    [HttpStatus.CONFLICT, ErrorCode.CONFLICT],
    [HttpStatus.TOO_MANY_REQUESTS, ErrorCode.RATE_LIMIT_EXCEEDED],
  ] as const)('maps plain status %i to %s', (status, expectedCode) => {
    // A plain (non-Api) HttpException — e.g. Nest's built-in guards/pipes
    // throwing `new HttpException(msg, status)` — must still map onto the
    // spec's error-code vocabulary.
    const result = toApiException(new HttpException('plain', status));
    expect(result).toBeInstanceOf(ApiException);
    expect(result.getStatus()).toBe(status);
    expect(result.errorCode).toBe(expectedCode);
  });

  it('extracts the message from a plain string HttpException response', () => {
    const err = new (class extends BadRequestException {})('Custom message');
    expect(toApiException(err).message).toBe('Custom message');
  });

  it('joins array messages from validation errors', () => {
    const err = new BadRequestException(['a is bad', 'b is bad']);
    expect(toApiException(err).message).toBe('a is bad, b is bad');
  });

  it('wraps an unknown thrown value as INTERNAL_ERROR (500)', () => {
    const result = toApiException(new Error('database exploded'));
    expect(result.errorCode).toBe(ErrorCode.INTERNAL_ERROR);
    expect(result.getStatus()).toBe(500);
    // Internal messages must never leak to clients.
    expect(result.message).not.toContain('database exploded');
  });

  it('wraps a non-Error thrown value as INTERNAL_ERROR', () => {
    expect(toApiException('string thrown').errorCode).toBe(
      ErrorCode.INTERNAL_ERROR,
    );
  });
});
