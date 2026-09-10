import type { TeamId } from "./domain";

/**
 * E-1: teams are paired randomly by default. This is the whole of that rule —
 * a shuffle, then chunked into pairs. The admin's manual override (A-16) is not
 * a variant of this function; it is the API layer writing a match's slots
 * directly, bypassing this entirely.
 */
export interface PairingResult {
  readonly pairs: readonly (readonly [TeamId, TeamId])[];
  /** The one team left over on an odd count. Null if it divided evenly. */
  readonly leftover: TeamId | null;
}

export function randomPairs(
  teamIds: readonly TeamId[],
  random: () => number = Math.random
): PairingResult {
  const shuffled = [...teamIds];
  // Fisher–Yates. Anything simpler biases toward the identity permutation.
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = shuffled[i];
    const b = shuffled[j];
    if (a === undefined || b === undefined) continue;
    shuffled[i] = b;
    shuffled[j] = a;
  }

  const pairs: [TeamId, TeamId][] = [];
  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    const a = shuffled[i];
    const b = shuffled[i + 1];
    if (a !== undefined && b !== undefined) pairs.push([a, b]);
  }

  const leftover = shuffled.length % 2 === 1 ? (shuffled[shuffled.length - 1] ?? null) : null;
  return { pairs, leftover };
}
