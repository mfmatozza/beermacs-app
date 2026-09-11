import Constants from "expo-constants";

// Runtime config. In dev we prefer EXPO_PUBLIC_API_URL, which Metro inlines into
// the bundle — so changing apps/mobile/.env.local and reloading Metro repoints
// the API WITHOUT a native rebuild. `extra.apiUrl` (baked into the native build
// via app.config.ts) is the fallback and carries the staging/prod URL.
//
// The `__DEV__` guard is load-bearing, not defensive fluff: `.easignore`'s
// presence makes EAS Build ignore .gitignore entirely for archiving, so a
// gitignored apps/mobile/.env.local (this LAN-IP override) rode along into
// EAS's cloud build archive and got inlined into RELEASE bundles too —
// every TestFlight build silently pointed at a developer's home LAN IP
// instead of the real API, until this was caught (docs/DECISIONS.md D21).
// `.easignore` is now fixed to exclude it, but this line means a stray env
// file can never again redirect a release build even if that slips again —
// `__DEV__` is false in every EAS build profile (development, staging,
// production all produce release JS), not a string this file has to trust.
const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  appEnv?: string;
};

export const API_URL =
  (__DEV__ ? process.env.EXPO_PUBLIC_API_URL : undefined) ?? extra.apiUrl ?? "http://localhost:3000";
export const APP_ENV = extra.appEnv ?? "development";
