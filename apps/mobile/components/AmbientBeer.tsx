import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";
import { useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { AMBIENT_SHADER } from "../lib/ambient-shader";

/** Compiled once for the process. */
const effect = Skia.RuntimeEffect.Make(AMBIENT_SHADER);

/**
 * The app's background: a still, dark table — charcoal, a soft vignette, a
 * faint net-line and cup-rack triangle. See lib/ambient-shader.ts for the
 * full design note on why (this replaced an earlier amber/bubble concept
 * that read as a drink, not as a beer-pong app).
 *
 * Absolutely positioned behind everything, `pointerEvents="none"` so it
 * never eats a touch. A single static render, not an animation — the
 * shader itself has no time uniform at all, so there is nothing to freeze;
 * Skia paints this once per resize and never again.
 */
export default function AmbientBeer() {
  const { width, height } = useWindowDimensions();

  const uniforms = useMemo(() => ({ u_res: [width, height] }), [width, height]);
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
