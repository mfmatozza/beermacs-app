import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import PourScreen from "../components/PourScreen";
import { raw } from "../lib/theme";
import { useAppBoot } from "../lib/use-app-boot";
import "../global.css";

/**
 * The root. Deliberately thin: providers, and the pour screen sitting above the
 * router until boot finishes.
 *
 * The pour is a sibling overlay rather than a route, so the app underneath is
 * already mounted and laid out by the time the glass fills — the hand-off is a
 * cross-fade onto a live screen, not a navigation to a blank one.
 */
export default function RootLayout() {
  const { ready } = useAppBoot();
  const [poured, setPoured] = useState(false);
  const onDone = useCallback(() => setPoured(true), []);

  return (
    <GestureHandlerRootView className="flex-1 bg-stout-900">
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: raw.canvas },
            animation: "fade",
          }}
        />
        {poured ? null : <PourScreen ready={ready} onDone={onDone} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
