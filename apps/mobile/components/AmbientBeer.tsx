import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";
import { useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { AMBIENT_SHADER } from "../lib/ambient-shader";

/** Compiled once for the process. */
const effect = Skia.RuntimeEffect.Make(AMBIENT_SHADER);

/** Frozen at a single instant — see the module doc below for why. Any value
 *  works: the bubble field is a hash-seeded lattice, uniform in density over
 *  time, so t=0 looks exactly as "mid-drift" as any other moment. */
const FROZEN_TIME = 0;

/**
 * The app's background: a warm amber glow with beer particles drifting up it.
 *
 * Absolutely positioned behind everything, and `pointerEvents="none"` so it
 * never eats a touch. A single static render, not an animation: this shader
 * used to be driven by a Reanimated clock ticking every frame for the app's
 * entire lifetime, which meant Skia repainted the full-screen canvas on
 * every frame everywhere in the app, purely for ambience sitting behind the
 * UI. Freezing `u_time` cuts that to one render per resize.
 */
export default function AmbientBeer() {
  const { width, height } = useWindowDimensions();

  const uniforms = useMemo(
    () => ({ u_res: [width, height], u_time: FROZEN_TIME }),
    [width, height]
  );

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
