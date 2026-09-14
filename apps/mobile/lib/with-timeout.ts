/**
 * `withTimeout` no longer imposes an artificial cutoff — D20 raced every
 * network call against 15s so a hung promise couldn't leave a screen's busy
 * state stuck forever, but a slower-than-15s response (a cold serverless
 * function, weak signal) was hitting that ceiling and showing a "taking too
 * long" error for a request that was actually still going to succeed. The
 * real fix for "stuck forever" was D21 (the LAN-IP bug); the try/catch/
 * finally structure everywhere this is called still does the actual job —
 * `busy` always gets reset because the promise eventually settles, not
 * because this function forces it to.
 *
 * Kept as a passthrough (rather than deleting it and touching every call
 * site) so it's one place to reintroduce a cap later if a real, specific
 * hang shows up again.
 */
export function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return promise;
}

/** The one message every `withTimeout`-wrapped catch block should show —
 *  shared so "the network died" reads the same everywhere it happens. */
export function networkErrorMessage(_e: unknown): string {
  return "Couldn't reach the server. Check your connection and try again.";
}
