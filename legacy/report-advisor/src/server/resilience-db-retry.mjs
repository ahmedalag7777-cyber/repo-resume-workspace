const TRANSIENT_POSTGRES_CONNECT_ERRORS = [
  /authentication did not complete within \d+ms/i,
  /\bECHECKOUTTIMEOUT\b/i,
  /could not connect to server/i,
  /connection timed out/i,
  /timeout expired/i,
];

export function isTransientPostgresConnectionError(error) {
  const message = String(error?.message ?? error ?? '');
  return TRANSIENT_POSTGRES_CONNECT_ERRORS.some((pattern) => pattern.test(message));
}

const waitCell = new Int32Array(new SharedArrayBuffer(4));
function pauseSync(milliseconds) {
  if (milliseconds > 0) Atomics.wait(waitCell, 0, 0, milliseconds);
}

/**
 * Retry only pre-query connection establishment failures. Do not retry SQL errors,
 * statement timeouts, constraint violations, or failures that could follow a write.
 */
export function retryTransientPostgresConnection(operation, options = {}) {
  if (typeof operation !== 'function') throw new TypeError('postgres_operation_must_be_function');
  const maxAttempts = options.maxAttempts ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 8000;
  const pause = options.pause ?? pauseSync;
  const onRetry = options.onRetry ?? ((event) => {
    console.warn(
      'PHASE_F_TRANSIENT_POSTGRES_RETRY=' +
      JSON.stringify({ label: event.label, attempt: event.attempt, nextAttempt: event.nextAttempt, delayMs: event.delayMs }),
    );
  });
  const label = options.label ?? 'postgres';

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) {
    throw new RangeError('postgres_retry_max_attempts_must_be_1_to_5');
  }
  if (!Number.isFinite(initialDelayMs) || initialDelayMs < 0 || !Number.isFinite(maxDelayMs) || maxDelayMs < 0) {
    throw new RangeError('postgres_retry_delay_must_be_nonnegative');
  }

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return operation();
    } catch (error) {
      lastError = error;
      if (!isTransientPostgresConnectionError(error) || attempt === maxAttempts) throw error;
      const delayMs = Math.min(maxDelayMs, initialDelayMs * (2 ** (attempt - 1)));
      onRetry({ label, attempt, nextAttempt: attempt + 1, delayMs, reason: 'transient_connection_establishment' });
      pause(delayMs);
    }
  }
  throw lastError ?? new Error('postgres_retry_exhausted');
}
