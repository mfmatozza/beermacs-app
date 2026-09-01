import { timing } from "./theme";
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
import { ensureSession } from "./auth-client";

void SplashScreen.preventAutoHideAsync();

/**
 * Everything that must be true before the app is worth showing.
 *
 * Right now that's fonts. In phase 2 it also becomes: session restored, venue
 * resolved, tonight's tournament fetched. The shape is deliberately a single
 * `ready` boolean so the pour screen never has to learn what it's waiting for.
 */
export interface AppBoot {
  readonly ready: boolean;
  /** Set when boot failed but we're proceeding anyway, for a toast later. */
  readonly degraded: string | null;
  /** False when we could not reach the API — bar wifi, usually. */
  readonly online: boolean;
}

export function useAppBoot(): AppBoot {
  const [fontsLoaded, fontError] = useFonts({
    BebasNeue_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [timedOut, setTimedOut] = useState(false);
  const [online, setOnline] = useState(true);

  // Make sure the device has a session, creating an anonymous one if not.
  // Deliberately NOT part of `ready`: a bar's wifi should not be able to hold
  // the app on a splash screen. If this fails the app still opens, and the
  // screens that need a session say so.
  useEffect(() => {
    let cancelled = false;
    void ensureSession().then((ok) => {
      if (!cancelled) setOnline(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Never hang on boot. If a font CDN or a cold cache is being slow, show the
  // app in the fallback face rather than holding a splash screen forever.
  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), timing.bootTimeoutMs);
    return () => clearTimeout(id);
  }, []);

  const ready = fontsLoaded || fontError !== null || timedOut;

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

  return { ready, degraded, online };
}
