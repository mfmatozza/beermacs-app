/**
 * Join codes get read off a table tent, in a dark bar, by someone three pints
 * in — so the alphabet is Crockford Base32 rather than something bespoke.
 *
 * Crockford drops I, L, O and U from the letters, and defines the substitutions
 * for the ones people mistype anyway: I and L read as 1, O reads as 0, U reads
 * as V. That matters because every substitution maps onto a character that is
 * still *in* the alphabet — a bespoke alphabet tends to normalise a typo into a
 * character it then has to throw away, which silently shifts the rest of the
 * code and turns one wrong letter into a wrong code.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const LENGTH = 6;

/** Confusable → canonical. Every value is a member of ALPHABET. */
const SUBSTITUTIONS: Readonly<Record<string, string>> = {
  O: "0",
  I: "1",
  L: "1",
  U: "V",
};

export function generateJoinCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < LENGTH; i++) {
    const idx = Math.min(Math.floor(random() * ALPHABET.length), ALPHABET.length - 1);
    code += ALPHABET[idx] ?? "0";
  }
  return code;
}

/**
 * Accept what people actually type — lowercase, spaces, dashes, and the four
 * confusable glyphs — and return the canonical code.
 */
export function normaliseJoinCode(input: string): string {
  let out = "";
  for (const raw of input.toUpperCase()) {
    const ch = SUBSTITUTIONS[raw] ?? raw;
    if (ALPHABET.includes(ch)) out += ch;
    if (out.length === LENGTH) break;
  }
  return out;
}

export const isCompleteJoinCode = (input: string): boolean =>
  normaliseJoinCode(input).length === LENGTH;

export const joinCodeLength = LENGTH;
export const joinCodeAlphabet = ALPHABET;
