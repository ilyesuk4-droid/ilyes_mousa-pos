/**
 * Error reporting utility – reports errors to the console only.
 * (Lovable-specific telemetry has been removed.)
 */
export function reportLovableError(error: unknown, _context: Record<string, unknown> = {}) {
  console.error(error);
}
