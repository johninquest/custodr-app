import { All, Controller } from '@nestjs/common';

import { NotFoundException } from './errors.js';

/**
 * Catch-all for unmatched paths.
 *
 * Express answers unknown routes with its own HTML 404 before Nest's exception
 * filter runs. Registering a least-specific `@All('*')` route lets Nest handle
 * the miss, so the global filter can render the spec's error envelope.
 *
 * Safe alongside `routeResolutionStrategy: 'specificity'`: a wildcard is the
 * least specific match, so every concrete route still wins.
 */
@Controller()
export class NotFoundController {
  @All('*')
  handle(): never {
    throw new NotFoundException('Resource not found');
  }
}
