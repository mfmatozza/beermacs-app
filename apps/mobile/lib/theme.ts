// Values that cannot be expressed as a Tailwind class.
//
// Colours and spacing live in tailwind.config.js and are used as `className`
// strings. What's left is what JavaScript has to hand to something that isn't
// a React Native style: Skia's canvas, the status bar, and Reanimated's timing.

/**
 * Height of the tab bar, excluding the safe-area inset.
 *
 * Lives here because two files need to agree on it: the tabs layout sets the
 * bar's height, and every scrolling screen has to pad its content by the same
 * amount or the last row sits underneath it.
 *
 * The raised centre button is NOT inside the bar (see CenterTabButton), so this
 * is just the bar's own height.
 */
export const TAB_BAR_HEIGHT = 60;

/** Raw hex, for the few APIs that take a colour value rather than a class. */
export const raw = {
  canvas: "#0A0908",
  surface: "#151310",
  raised: "#1C1915",
  hairline: "#25211B",
  foam: "#FFFCF5",
  foamShade: "#E4D6BB",
  beer: "#F5A300",
  /// Tab bar tints. Icon colours are props, not classes, so `className`
  /// cannot reach them — they have to be values.
  tabActive: "#F5A300",
  tabInactive: "#8A8070",
  textFaint: "#8A8070",
} as const;

/**
 * Durations and easings as data, so the pour screen and anything animated later
 * agree on what "fast" means. Bezier control points are stored as raw numbers
 * because the consumers differ: Reanimated wants Easing.bezier(...).
 */
export const duration = {
  fast: 200,
  medium: 320,
  /** How long a full pour takes if the app is already warm. */
  pour: 2600,
  /** Foam settling after the glass is full. */
  settle: 900,
} as const;

export const easing = {
  out: [0.22, 1, 0.36, 1] as const,
  /** Liquid rising: quick as the stream hits, slow as it fills. */
  pour: [0.14, 0.72, 0.24, 1] as const,
} as const;

export const timing = {
  /**
   * Never show the pour for less than this, even on a warm start — the app is
   * ready in 40ms and a splash that flickers reads as a bug, not as branding.
   */
  minPourMs: 1600,
  /** Give up waiting on fonts and show the app anyway. */
  bootTimeoutMs: 6000,
} as const;
