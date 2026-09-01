import Constants from "expo-constants";

// Runtime config. In dev we prefer EXPO_PUBLIC_API_URL, which Metro inlines into
// the bundle — so changing apps/mobile/.env.local and reloading Metro repoints
// the API WITHOUT a native rebuild. `extra.apiUrl` (baked into the native build
// via app.config.ts) is the fallback and carries the staging/prod URL.
const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  appEnv?: string;
};

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? "http://localhost:3000";
export const APP_ENV = extra.appEnv ?? "development";
