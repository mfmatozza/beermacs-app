import type { ExpoConfig } from "expo/config";

// APP_ENV is injected by the EAS build profile (see eas.json) or the shell.
const APP_ENV = (process.env.APP_ENV ?? "development") as "development" | "staging" | "production";

const API_URL: Record<typeof APP_ENV, string> = {
  // Dev points at localhost so the app talks to a locally-run apps/web.
  development: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
  staging: "https://beermacs-app.vercel.app",
  production: "https://beermacs-app.vercel.app",
};

const config: ExpoConfig = {
  name: APP_ENV === "production" ? "Beermacs" : `Beermacs (${APP_ENV})`,
  slug: "beermacs",
  scheme: "beermacs",
  version: "0.1.0",
  orientation: "portrait",
  // The app is dark by design — see tailwind.config.js. Letting it follow the
  // OS would only ever produce a dark app with a light status bar.
  userInterfaceStyle: "dark",
  backgroundColor: "#0A0908",
  icon: "./assets/icon.png",
  ios: {
    bundleIdentifier: "com.beermacs.app",
    supportsTablet: false,
    infoPlist: {
      // The app only makes standard HTTPS calls (no custom/non-exempt
      // encryption), so it qualifies for the export compliance exemption.
      // Without this, every build sits in "Missing Compliance" in App Store
      // Connect and can't reach TestFlight testers until answered by hand.
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.beermacs.app",
    adaptiveIcon: {
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
      backgroundColor: "#0A0908",
    },
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 180,
        resizeMode: "contain",
        backgroundColor: "#0A0908",
      },
    ],
  ],
  extra: {
    apiUrl: API_URL[APP_ENV],
    appEnv: APP_ENV,
  },
  experiments: {
    typedRoutes: true,
  },
};

export default config;
