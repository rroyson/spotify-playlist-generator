/**
 * Reduces an error to fields that are safe to log. Raw axios errors carry the
 * request config and the serialized request, both of which include the
 * Authorization header, so they must never be passed to a logger directly.
 */
export function safeError(error: unknown) {
  const e = (typeof error === 'object' && error !== null ? error : { message: String(error) }) as {
    message?: string;
    code?: string;
    response?: { status?: number; data?: unknown };
  };

  return {
    message: e.message,
    code: e.code,
    status: e.response?.status,
    data: e.response?.data,
  };
}
