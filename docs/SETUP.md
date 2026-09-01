# Setup

## Requirements

- Node >= 20 (repo is developed on 24)
- npm 11 (the repo pins `packageManager`)
- Xcode for iOS, Android Studio + a JDK for Android

## Install

```sh
npm install
```

## Running the app

`@shopify/react-native-skia` is a native module, so **Expo Go will not work** —
the loading screen is a Skia fragment shader. You need a development build:

```sh
cd apps/mobile
npm run ios          # or: npm run android
```

That runs `expo prebuild` (generating `ios/`, which is gitignored), installs
pods and builds. First build takes several minutes. After that:

```sh
npm run dev          # Metro only; the installed dev client reconnects
```

If Metro reports port 8081 is taken by another project, stop that one rather
than moving ports — the dev client on the simulator is pinned to what it was
built against.

## Environment

```sh
cp apps/mobile/.env.example apps/mobile/.env.local
```

Use `.env.local`, never `.env`: EAS Build loads `.env` into cloud builds, so a
local override would end up baked into a shipped binary.
