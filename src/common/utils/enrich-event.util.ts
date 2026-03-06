import { Request } from 'express';

/**
 * Merges additional context into the current request's wide event.
 * Safe to call even when `req` is undefined (e.g., in unit tests).
 */
export function enrichEvent(req: Request | undefined, context: Record<string, unknown>): void {
  if (!req?.['wideEvent']) return;
  Object.assign(req['wideEvent'], context);
}
