import { v7 as uuidv7 } from 'uuid';

/**
 * Generate a new UUIDv7 for use as a primary key.
 *
 * UUIDv7 is time-ordered (RFC 9562), which preserves B-tree index locality
 * compared to random UUIDv4 values. This mirrors the Go implementation's
 * `internal/shared/ids.New()`.
 *
 * IDs are generated in the application layer rather than by PostgreSQL so
 * that a caller can know the ID of a row before inserting it.
 */
export function newId(): string {
  return uuidv7();
}
