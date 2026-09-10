import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import PourScreen from "../components/PourScreen";
import RegisterScreen from "../components/RegisterScreen";
import { useSessionStore } from "../lib/session-store";
import { raw } from "../lib/theme";
import { useAppBoot } from "../lib/use-app-boot";
import "../global.css";

/**
 * The root. Deliberately thin: providers, the register/sign-in gate, and the
 * pour screen sitting above all of it until boot finishes.
 *
 * The pour is a sibling overlay rather than a route, so whatever's underneath
 * — the register screen or the tab navigator — is already mounted and laid out
 * by the time the glass fills. The hand-off is a cross-fade onto a live
 * screen, never a navigation to a blank one.
 */
export default function RootLayout() {
  const { ready } = useAppBoot();
  const signedIn = useSessionStore((s) => s.signedIn);
  const setSignedIn = useSessionStore((s) => s.setSignedIn);
  const [poured, setPoured] = useState(false);
  const onDone = useCallback(() => setPoured(true), []);
  const onAuthenticated = useCallback(() => setSignedIn(true), [setSignedIn]);

  // Nothing that draws text may mount before the fonts are registered.
  //
  // React Native resolves a Text's font once, at first paint. If the family
  // isn't registered yet it silently falls back to the system face and never
  // re-resolves — a later re-render produces a structurally identical style
  // object, so no update is sent to the native view and the fallback sticks for
  // the life of the screen. It looks like the font "didn't load" when in fact it
  // loaded 80ms too late.
  //
  // Returning null holds the tree until then. The native splash is still up, so
  // this is invisible; the pour's own minimum on-screen time covers the rest.
  if (!ready) return null;

  return (
    <GestureHandlerRootView className="flex-1 bg-stout-900">
      <SafeAreaProvider>
        <StatusBar style="light" />
        {signedIn ? (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: raw.canvas },
              animation: "fade",
            }}
          />
        ) : (
          <RegisterScreen onAuthenticated={onAuthenticated} />
        )}
        {poured ? null : <PourScreen ready={ready} onDone={onDone} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
