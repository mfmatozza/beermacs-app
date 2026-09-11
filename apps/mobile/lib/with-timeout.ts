/**
 * Races a promise against a timeout so a hung network call surfaces as an
 * explicit, catchable error instead of leaving a screen's busy/loading state
 * true forever. Doesn't cancel the underlying request (better-auth's client
 * doesn't expose an AbortSignal hook at every call site) — it just stops the
 * UI from waiting on it, which is the actual bug this fixes: silence, not
 * wasted background work.
 */
export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

/** The one message every `withTimeout`-wrapped catch block should show —
 *  shared so "the network died" reads the same everywhere it happens. */
export function networkErrorMessage(e: unknown): string {
  if (e instanceof TimeoutError) {
    return "Taking too long to reach the server. Check your connection and try again.";
  }
  return "Couldn't reach the server. Check your connection and try again.";
}
