// Better Auth client for the app.
//
// The session token lives in expo-secure-store (Keychain / Android Keystore),
// not AsyncStorage — it is a bearer credential, and AsyncStorage is plain text
// readable by anything with filesystem access on a rooted device.
//
// One account type for everyone (docs/DECISIONS.md D10): email + password +
// phone, whether you're a player or a venue owner. No anonymous sign-in — the
// spec requires contact details from every user (G-1), so there is nothing an
// anonymous session could usefully skip past any more.

import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "./config";

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: "beermacs",
      storagePrefix: "beermacs",
      storage: SecureStore,
    }),
  ],
});

/**
 * Whether this device already has a session. Never creates one — registration
 * (email/password/phone) is now an explicit screen, not something boot can
 * paper over. Returns false both when there's genuinely no session and when
 * the API couldn't be reached, which the caller treats the same way: show the
 * registration/sign-in screen.
 */
export async function hasStoredSession(): Promise<boolean> {
  try {
    const existing = await authClient.getSession();
    return Boolean(existing.data?.session);
  } catch (e) {
    if (__DEV__) console.warn("[auth] session check threw:", String(e));
    return false;
  }
}
