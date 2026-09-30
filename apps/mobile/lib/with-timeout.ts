/** The one message every network catch block should show — shared so "the
 *  network died" reads the same everywhere it happens. (This file used to
 *  also export a `withTimeout` passthrough; it did nothing and was inlined
 *  away — see docs/DECISIONS.md D20/D21 for the history.) */
export function networkErrorMessage(_e: unknown): string {
  return "Couldn't reach the server. Check your connection and try again.";
}
