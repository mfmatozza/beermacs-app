/**
 * Phone country codes for the registration form's country-code selector.
 *
 * Not exhaustive (that's ~195 countries of mostly-dead weight in a picker
 * nobody scrolls to the bottom of) — covers Italy (this app's home market)
 * plus the rest of the EU, the UK/US/Canada, and enough of the rest of the
 * world that "I'm not on this list" is rare. `dial` is what gets prefixed
 * onto the stored phone number (E.164-ish: "+39"); `iso2` backs the flag
 * emoji, which is generated from it rather than hand-typed 70 times.
 */
export interface CountryCode {
  readonly iso2: string;
  readonly name: string;
  readonly dial: string;
}

export const countryCodes: readonly CountryCode[] = [
  { iso2: "IT", name: "Italy", dial: "+39" },
  { iso2: "GB", name: "United Kingdom", dial: "+44" },
  { iso2: "US", name: "United States", dial: "+1" },
  { iso2: "DE", name: "Germany", dial: "+49" },
  { iso2: "FR", name: "France", dial: "+33" },
  { iso2: "ES", name: "Spain", dial: "+34" },
  { iso2: "PT", name: "Portugal", dial: "+351" },
  { iso2: "NL", name: "Netherlands", dial: "+31" },
  { iso2: "BE", name: "Belgium", dial: "+32" },
  { iso2: "CH", name: "Switzerland", dial: "+41" },
  { iso2: "AT", name: "Austria", dial: "+43" },
  { iso2: "IE", name: "Ireland", dial: "+353" },
  { iso2: "LU", name: "Luxembourg", dial: "+352" },
  { iso2: "DK", name: "Denmark", dial: "+45" },
  { iso2: "SE", name: "Sweden", dial: "+46" },
  { iso2: "NO", name: "Norway", dial: "+47" },
  { iso2: "FI", name: "Finland", dial: "+358" },
  { iso2: "IS", name: "Iceland", dial: "+354" },
  { iso2: "PL", name: "Poland", dial: "+48" },
  { iso2: "CZ", name: "Czechia", dial: "+420" },
  { iso2: "SK", name: "Slovakia", dial: "+421" },
  { iso2: "HU", name: "Hungary", dial: "+36" },
  { iso2: "RO", name: "Romania", dial: "+40" },
  { iso2: "BG", name: "Bulgaria", dial: "+359" },
  { iso2: "GR", name: "Greece", dial: "+30" },
  { iso2: "HR", name: "Croatia", dial: "+385" },
  { iso2: "SI", name: "Slovenia", dial: "+386" },
  { iso2: "EE", name: "Estonia", dial: "+372" },
  { iso2: "LV", name: "Latvia", dial: "+371" },
  { iso2: "LT", name: "Lithuania", dial: "+370" },
  { iso2: "MT", name: "Malta", dial: "+356" },
  { iso2: "CY", name: "Cyprus", dial: "+357" },
  { iso2: "CA", name: "Canada", dial: "+1" },
  { iso2: "AU", name: "Australia", dial: "+61" },
  { iso2: "NZ", name: "New Zealand", dial: "+64" },
  { iso2: "JP", name: "Japan", dial: "+81" },
  { iso2: "KR", name: "South Korea", dial: "+82" },
  { iso2: "CN", name: "China", dial: "+86" },
  { iso2: "IN", name: "India", dial: "+91" },
  { iso2: "BR", name: "Brazil", dial: "+55" },
  { iso2: "MX", name: "Mexico", dial: "+52" },
  { iso2: "AR", name: "Argentina", dial: "+54" },
  { iso2: "ZA", name: "South Africa", dial: "+27" },
  { iso2: "AE", name: "United Arab Emirates", dial: "+971" },
  { iso2: "TR", name: "Turkey", dial: "+90" },
  { iso2: "RU", name: "Russia", dial: "+7" },
  { iso2: "UA", name: "Ukraine", dial: "+380" },
  { iso2: "AL", name: "Albania", dial: "+355" },
  { iso2: "RS", name: "Serbia", dial: "+381" },
];

export const defaultCountry: CountryCode =
  countryCodes.find((c) => c.iso2 === "IT") ?? countryCodes[0]!;

/** 🇮🇹 from "IT" — regional-indicator Unicode trick, not a lookup table. */
export function flagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}

export function findCountryByDial(dial: string): CountryCode | undefined {
  return countryCodes.find((c) => c.dial === dial);
}
