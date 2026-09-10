import { Platform } from "react-native";
import { api } from "./api";

// Push registration (U-15..U-17). Native modules (expo-notifications /
// expo-device) are loaded LAZILY inside the try/catch — importing them at
// the top level would crash the whole app on a dev build compiled before
// they were added ("Cannot find native module 'ExpoPushTokenManager'").
// This way push simply no-ops until the dev client is rebuilt
// (npx expo run:ios) with the modules compiled in, and it never blocks the
// app from booting.

let handlerSet = false;

export async function registerForPush(): Promise<void> {
  try {
    const Notifications = await import("expo-notifications");
    const Device = await import("expo-device");
    const Constants = (await import("expo-constants")).default;

    // Show notifications while foregrounded, too (set once).
    if (!handlerSet) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      handlerSet = true;
    }

    // Push isn't delivered on simulators/emulators.
    if (!Device.isDevice) return;

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return;

    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)
      ?.eas?.projectId;
    if (!projectId) return; // not configured yet

    const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await api.registerDevice(expoPushToken, Platform.OS === "ios" ? "IOS" : "ANDROID");
  } catch {
    // Native module missing (needs a rebuild) or any other issue — no-op.
    // A player who never gets a push still has the bracket tab's own poll.
  }
}

/**
 * Route the app when a notification is tapped.
 *
 * Two cases, and missing either one makes the deep link look broken half the
 * time: a tap while the app is running, and a tap that launched it cold.
 *
 * Every match-result notification (you're up, confirm this, it's settled)
 * lands on the same place — the bracket tab, where the player's own match
 * already lives (see NextUpCard). There is nothing more specific to route
 * to yet: an admin broadcast or a dispute-needs-staff push has no mobile
 * screen of its own to open, so those are left as a plain app-open.
 */
export async function attachNotificationRouting(navigate: () => void): Promise<() => void> {
  try {
    const Notifications = await import("expo-notifications");

    const isMatchNotification = (response: unknown): boolean => {
      const data = (response as { notification?: { request?: { content?: { data?: unknown } } } })
        ?.notification?.request?.content?.data as { kind?: unknown } | undefined;
      return data?.kind === "match";
    };

    // Cold start: the notification that opened the app.
    const initial = await Notifications.getLastNotificationResponseAsync();
    if (initial && isMatchNotification(initial)) navigate();

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (isMatchNotification(response)) navigate();
    });
    return () => sub.remove();
  } catch {
    // Notifications unavailable in this build; nothing to attach.
    return () => {};
  }
}
