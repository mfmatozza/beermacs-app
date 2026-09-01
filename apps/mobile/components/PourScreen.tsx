import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";
import { useEffect, useMemo } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { BEER_SHADER } from "../lib/beer-shader";
import { usePour } from "../lib/use-pour";

/** Compiled once for the process, not once per mount. */
const effect = Skia.RuntimeEffect.Make(BEER_SHADER);

export default function PourScreen({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const { fill, overlay, percent, finished } = usePour({ ready });

  // A linear clock on the UI thread. Reanimated drives it, so the shader keeps
  // animating without a single frame crossing to JS.
  const clock = useSharedValue(0);
  useEffect(() => {
    clock.value = withRepeat(
      withTiming(600, { duration: 600_000, easing: Easing.linear }),
      -1,
      false
    );
  }, [clock]);

  const uniforms = useDerivedValue(() => ({
    u_res: [width, height],
    u_time: clock.value,
    u_fill: fill.value,
  }));

  const shell = useAnimatedStyle(() => ({ opacity: overlay.value }));

  useEffect(() => {
    if (finished) onDone();
  }, [finished, onDone]);

  const dims = useMemo(() => ({ width, height }), [width, height]);

  if (finished) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, shell]}
      className="bg-stout-900"
      pointerEvents="none"
      accessibilityRole="progressbar"
      accessibilityLabel="Pouring — loading Beermacs"
    >
      {effect ? (
        <Canvas style={dims}>
          <Fill>
            <Shader source={effect} uniforms={uniforms} />
          </Fill>
        </Canvas>
      ) : (
        // Skia failed to compile the shader. Never show a blank screen — a flat
        // amber ground is a worse pour but still a deliberate one.
        <View style={StyleSheet.absoluteFill} className="bg-beer-700" />
      )}

      {/* The wordmark sits in the upper third so the rising head climbs to meet
          it, rather than being swallowed at the halfway point. */}
      <View
        style={StyleSheet.absoluteFill}
        className="items-stretch justify-start pt-[22%]"
        pointerEvents="none"
      >
        <Text
          className="text-center font-display text-6xl leading-[56px] tracking-[1.6px] text-foam-100"
          style={styles.wordmark}
        >
          BEERMACS
        </Text>
        <Text className="mt-2 text-center font-sans-med text-[11px] uppercase tracking-[1.1px] text-foam-300">
          Tournament night
        </Text>
      </View>

      <View className="absolute inset-x-0 bottom-12 items-center" pointerEvents="none">
        <Text className="font-sans-med text-sm tabular-nums text-foam-300">{`${percent}%`}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    // Bebas at hero size needs the shadow to hold its edge once foam is behind
    // it — cream on cream otherwise loses the counters. `textShadow*` has no
    // Tailwind equivalent in NativeWind, so it stays a style.
    textShadowColor: "rgba(10, 9, 8, 0.55)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
});
