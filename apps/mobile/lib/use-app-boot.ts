// Deep imports, not the package barrels. `@expo-google-fonts/dm-sans` has no
// `exports` map and its index requires every weight it ships, so importing three
// named exports from the barrel drags all eighteen .ttf files (~1MB) into the
// bundle. Each weight is its own module — take only the three we use.
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue/400Regular";
import { DMSans_400Regular } from "@expo-google-fonts/dm-sans/400Regular";
import { DMSans_500Medium } from "@expo-google-fonts/dm-sans/500Medium";
import { DMSans_700Bold } from "@expo-google-fonts/dm-sans/700Bold";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { hasStoredSession } from "./auth-client";
import { useSessionStore } from "./session-store";
import { timing } from "./theme";

void SplashScreen.preventAutoHideAsync();

/**
 * Everything that must be true before the app is worth showing: fonts loaded,
 * and whether this device already has a session. The shape is deliberately a
 * few booleans rather than a state machine so the pour screen never has to
 * learn what it's waiting for — it just watches `ready`.
 */
export interface AppBoot {
  readonly ready: boolean;
  /** Set when boot failed but we're proceeding anyway, for a toast later. */
  readonly degraded: string | null;
}

export function useAppBoot(): AppBoot {
  const [fontsLoaded, fontError] = useFonts({
    BebasNeue_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [timedOut, setTimedOut] = useState(false);
  const signedIn = useSessionStore((s) => s.signedIn);
  const setSignedIn = useSessionStore((s) => s.setSignedIn);

  useEffect(() => {
    let cancelled = false;
    void hasStoredSession().then((ok) => {
      if (!cancelled) setSignedIn(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Never hang on boot. If a font CDN or a cold cache is being slow — or the
  // session check hangs on bad wifi — show the app (falling through to the
  // registration screen) rather than holding a splash screen forever.
  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), timing.bootTimeoutMs);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (timedOut && signedIn === null) setSignedIn(false);
  }, [timedOut, signedIn, setSignedIn]);

  const fontsSettled = fontsLoaded || fontError !== null || timedOut;
  // The timeout effect above guarantees signedIn is non-null by the time
  // timedOut flips, so this alone is a sufficient (and simpler) condition.
  const ready = fontsSettled && signedIn !== null;

  // Hand off from the native splash to our own the moment we can draw. The pour
  // screen is mounted above the app, so this swap is invisible.
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Surface a failed font load in development. Silent fallback to the system
  // face is exactly the bug class that shipped the wrong typeface for two
  // builds without anything in the logs.
  useEffect(() => {
    if (__DEV__ && fontError) console.warn("[boot] font load failed:", fontError);
  }, [fontError]);

  const degraded = fontError
    ? `Fonts failed to load: ${fontError.message}`
    : timedOut && !fontsLoaded
      ? "Boot timed out; running with system fonts."
      : null;

  return { ready, degraded };
}
