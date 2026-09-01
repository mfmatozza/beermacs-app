/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  // The app has one look: a dark bar at 11pm. There is no light mode to switch
  // to, so dark is the design rather than a variant.
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // The beer. `beer-500` is the beermacs.com brand gold, hsl(40 100% 48%),
        // carried over from the old web app's CSS custom properties.
        beer: {
          100: "#FFF0CE",
          200: "#FFDE95",
          300: "#FFC85A",
          400: "#FFB12A",
          500: "#F5A300",
          600: "#D07F00",
          700: "#A15D00",
          800: "#6E3D00",
        },
        // The head. Not white — beer foam is warm, and grey in shadow.
        foam: {
          100: "#FFFCF5",
          200: "#F7EFDD",
          300: "#E4D6BB",
          400: "#C6B392",
        },
        // The glass. Warm-biased neutrals, never a pure grey.
        //
        // Lifted across the board from the first pass, which read as a black
        // rectangle on a phone. Cards now sit two steps off the ground instead
        // of one, and 900 is only used where something must recede — the
        // ambient shader paints the real background.
        stout: {
          400: "#5A4F41",
          500: "#413830",
          600: "#302A23",
          700: "#241F1A",
          750: "#1D1915",
          800: "#171410",
          850: "#12100D",
          900: "#0A0908",
        },
        // Type on dark.
        cream: {
          DEFAULT: "#F1EADB",
          dim: "#A89D8A",
          faint: "#6E6555",
        },
        // Match state. Deliberately off the amber axis so state never reads as
        // brand: a green pill means "in play", not "on brand".
        live: { DEFAULT: "#63B87C", wash: "#20392A" },
        dispute: { DEFAULT: "#E05B45", wash: "#401D17" },
        notice: { DEFAULT: "#5C9FBA", wash: "#182E35" },

        /// Translucent amber, for glow and lit edges. Layered over the ambient
        /// shader rather than over a solid colour, so these are rgba.
        glow: {
          soft: "rgba(245, 163, 0, 0.14)",
          edge: "rgba(245, 163, 0, 0.40)",
          rim: "rgba(255, 205, 120, 0.55)",
        },
      },
      fontFamily: {
        // Values must match the keys passed to `useFonts` in lib/use-app-boot.ts.
        //
        // The KEYS must not collide with Tailwind's built-in font-weight
        // utilities. Naming these `medium` and `bold` generated two rules for
        // the same class — `.font-bold { font-family: DMSans_700Bold }` from
        // here AND `.font-bold { font-weight: 700 }` from the default weight
        // scale. iOS cannot resolve a custom family together with a weight, so
        // it silently fell back to the system font. Hence `sans-med`/`sans-bold`.
        display: ["BebasNeue_400Regular"],
        sans: ["DMSans_400Regular"],
        "sans-med": ["DMSans_500Medium"],
        "sans-bold": ["DMSans_700Bold"],
      },
    },
  },
  plugins: [],
};
