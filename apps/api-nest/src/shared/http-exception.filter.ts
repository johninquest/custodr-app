import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException as NestNotFoundException,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { ErrorCode, type ErrorDetail, toApiException } from './errors.js';

/** The error envelope defined by `docs/api_spec.md`. */
interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
}

/**
 * Renders every exception as `{ error: { code, message, details } }`.
 *
 * Nest's default shape (`{ statusCode, message, error }`) is replaced so the
 * API matches the contract. Unhandled errors are logged server-side and
 * returned as `INTERNAL_ERROR` without leaking internals.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    // Unmatched routes surface as a plain 404 from the underlying Express
    // router, bypassing Nest's exception pipeline. Normalise them so every
    // response — including unknown paths — uses the spec envelope.
    const normalised =
      exception instanceof NestNotFoundException ||
      (exception instanceof HttpException &&
        exception.getStatus() === HttpStatus.NOT_FOUND)
        ? new NestNotFoundException('Resource not found')
        : exception;

    const api = toApiException(normalised);
    const status = api.getStatus();

    // `StandardSchemaValidationPipe` throws a plain BadRequestException whose
    // message is a flattened Zod summary. Re-shape it into the spec's
    // `details: [{ field, message }]` array when we can recover the issues.
    if (status === HttpStatus.BAD_REQUEST && !api.details?.length) {
      const issues = extractZodIssues(exception);
      if (issues.length) {
        return void res.status(status).json({
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Request validation failed',
            details: zodDetails(issues),
          },
        });
      }
    }

    // Guards run before interceptors and can leave the response partially
    // committed; ensure headers are not already sent before writing the body.
    if (res.headersSent) {
      return;
    }

    // Log server-side for anything that is not a client error.
    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // `errorCode` is a first-class property on HttpException in Nest 12; the
    // response body is only the message string, so read the code off the
    // exception itself rather than parsing the body.
    const code = api.errorCode ?? ErrorCode.INTERNAL_ERROR;
    const details = api.details;

    const body: ErrorBody = {
      error: {
        code,
        message: api.message,
        ...(details?.length ? { details } : {}),
      },
    };

    res.status(status).json(body);
  }
}

/**
 * Convert Zod issues into the spec's `details[]` shape.
 *
 * Zod reports `path` as an array (e.g. `['cost']` or `['items', 0, 'name']`);
 * the spec expects a dotted field name.
 */
export function zodDetails(issues: readonly { path: PropertyKey[]; message: string }[]): ErrorDetail[] {
  return issues.map((issue) => ({
    field: issue.path.map(String).join('.') || '(root)',
    message: issue.message,
  }));
}

/**
 * Recover Zod issues from a validation failure.
 *
 * Nest 12's `StandardSchemaValidationPipe` flattens issues into the exception
 * message, so the structured `issues` array is read off the cause when
 * available and otherwise reconstructed from the message text.
 */
function extractZodIssues(
  exception: unknown,
): { path: PropertyKey[]; message: string }[] {
  const cause = (exception as { cause?: unknown } | null)?.cause;
  if (
    cause &&
    typeof cause === 'object' &&
    'issues' in cause &&
    Array.isArray((cause as { issues: unknown }).issues)
  ) {
    return (cause as { issues: { path: PropertyKey[]; message: string }[] })
      .issues;
  }

  // Fall back to parsing "field: message" pairs from the flattened message.
  const message =
    exception instanceof HttpException ? exception.message : '';
  if (!message || message === 'Bad Request Exception') return [];

  return message.split('; ').map((part) => {
    const idx = part.indexOf(': ');
    if (idx === -1) return { path: [], message: part };
    return {
      path: part.slice(0, idx).split('.'),
      message: part.slice(idx + 2),
    };
  });
}

export { HttpException };
