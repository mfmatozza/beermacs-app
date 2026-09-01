import { duration, easing, timing } from "./theme";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  Easing,
  runOnJS,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

/**
 * Orchestrates the pour against the app's actual readiness.
 *
 * Two rules, both about not lying to the user:
 *
 *  - The glass fills most of the way immediately, then *waits* at ~78% until the
 *    app is genuinely ready. A progress bar that races to 100% and then sits
 *    there is the thing everyone hates about splash screens.
 *  - It never shows for less than `timing.minPourMs`. On a warm start the app is
 *    ready in 40ms, and a splash that flashes reads as a bug rather than as
 *    branding.
 */
export interface Pour {
  /** 0 → 1, drives `u_fill` in the shader. */
  readonly fill: SharedValue<number>;
  /** 1 → 0 as the overlay hands off to the app. */
  readonly overlay: SharedValue<number>;
  /** Whole-number percentage for the readout, updated on the JS thread. */
  readonly percent: number;
  readonly finished: boolean;
}

/** Where the pour parks while it waits for the app. */
const HOLD_AT = 0.78;

export function usePour({ ready }: { ready: boolean }): Pour {
  const fill = useSharedValue(0);
  const overlay = useSharedValue(1);
  const [percent, setPercent] = useState(0);
  const [finished, setFinished] = useState(false);
  const startedAt = useRef(Date.now());

  // The pour itself. Quick as the stream hits the bottom, slow as it fills —
  // which is what the `easing.pour` control points describe.
  useEffect(() => {
    fill.value = withTiming(HOLD_AT, {
      duration: duration.pour,
      easing: Easing.bezier(...easing.pour),
    });
  }, [fill]);

  // A cheap readout tick. Deliberately not driven off the shared value: reading
  // it every frame on the JS thread is exactly the bridge traffic Reanimated
  // exists to avoid, and the number only needs to look alive.
  useEffect(() => {
    if (finished) return;
    const id = setInterval(() => {
      setPercent((p) => {
        const ceiling = ready ? 100 : Math.round(HOLD_AT * 100);
        return Math.min(ceiling, p + (ready ? 7 : 3));
      });
    }, 90);
    return () => clearInterval(id);
  }, [ready, finished]);

  // Top it up and hand off, once the app is ready and the floor has passed.
  useEffect(() => {
    if (!ready) return;

    const elapsed = Date.now() - startedAt.current;
    const wait = Math.max(0, timing.minPourMs - elapsed);

    const id = setTimeout(() => {
      // The overflow: the head surges past the top edge.
      fill.value = withTiming(1, {
        duration: duration.settle,
        easing: Easing.bezier(...easing.out),
      });

      // A single tap as the glass goes over. One, not a pattern — haptics on a
      // splash screen stop being charming the second time you see them.
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      overlay.value = withDelay(
        duration.settle - 120,
        withTiming(0, { duration: duration.medium }, (done) => {
          "worklet";
          if (done) runOnJS(setFinished)(true);
        })
      );
    }, wait);

    return () => clearTimeout(id);
  }, [ready, fill, overlay]);

  return { fill, overlay, percent, finished };
}
