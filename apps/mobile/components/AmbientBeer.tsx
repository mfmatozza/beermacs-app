import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";
import { useEffect, useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { AMBIENT_SHADER } from "../lib/ambient-shader";

/** Compiled once for the process. */
const effect = Skia.RuntimeEffect.Make(AMBIENT_SHADER);

/**
 * The app's background: a warm amber glow with beer particles drifting up it.
 *
 * Absolutely positioned behind everything, and `pointerEvents="none"` so it
 * never eats a touch. Runs entirely on the UI thread — the clock is a Reanimated
 * shared value, so not one frame crosses to JS.
 */
export default function AmbientBeer() {
  const { width, height } = useWindowDimensions();

  const clock = useSharedValue(0);
  useEffect(() => {
    clock.value = withRepeat(
      withTiming(3600, { duration: 3_600_000, easing: Easing.linear }),
      -1,
      false
    );
  }, [clock]);

  const uniforms = useDerivedValue(() => ({
    u_res: [width, height],
    u_time: clock.value,
  }));

  const dims = useMemo(() => ({ width, height }), [width, height]);

  // Shader failed to compile: fall back to the flat ground rather than white.
  if (!effect) {
    return <View style={StyleSheet.absoluteFill} className="bg-stout-900" pointerEvents="none" />;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={dims}>
        <Fill>
          <Shader source={effect} uniforms={uniforms} />
        </Fill>
      </Canvas>
    </View>
  );
}
