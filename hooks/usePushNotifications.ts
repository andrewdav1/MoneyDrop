import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { savePushToken } from "@/lib/firestore";
import { useAuthStore } from "@/store/authStore";

// ---------------------------------------------------------------------------
// Global notification handler — must be set before any notification arrives
// ---------------------------------------------------------------------------
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ---------------------------------------------------------------------------
// Screen routing
// ---------------------------------------------------------------------------
type NotificationScreen = "home" | "drop" | "wallet";

const SCREEN_ROUTES: Record<NotificationScreen, string> = {
  home:   "/(tabs)/home",
  drop:   "/(tabs)/drop",
  wallet: "/(tabs)/wallet",
};

function routeForNotification(
  notification: Notifications.Notification
): string {
  const screen = notification.request.content.data?.screen as
    | NotificationScreen
    | undefined;
  return SCREEN_ROUTES[screen ?? "home"];
}

// ---------------------------------------------------------------------------
// Android notification channel
// ---------------------------------------------------------------------------
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("drops", {
    name: "Drop Alerts",
    description: "Live drop and claim notifications",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    sound: "notification.wav",
    enableVibrate: true,
    showBadge: false,
  });
}

// ---------------------------------------------------------------------------
// Token registration
// ---------------------------------------------------------------------------
async function registerForPushNotifications(): Promise<string | null> {
  // Physical device required — emulators cannot receive push notifications
  if (!Constants.isDevice && !__DEV__) {
    console.info("[Push] Push notifications require a physical device.");
    return null;
  }

  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  const { status } =
    existing === "granted"
      ? { status: existing }
      : await Notifications.requestPermissionsAsync();

  if (status !== "granted") {
    console.info("[Push] Permission denied.");
    return null;
  }

  // projectId is required for SDK 49+. Set it in app.json under extra.eas.projectId
  // or supply it from your EAS build environment.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId as string | undefined;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    console.info("[Push] Registered with token:", token);
    return token;
  } catch (err) {
    console.error("[Push] Failed to get push token:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * usePushNotifications
 *
 * Call once in the root layout after the user is authenticated.
 * Responsibilities:
 *  - Requests notification permission
 *  - Gets the Expo push token and saves it to Firestore
 *  - Navigates to the correct screen when the user taps a notification
 *  - Cleans up subscription listeners on unmount
 */
export function usePushNotifications(): void {
  const appUser = useAuthStore((s) => s.appUser);
  const router  = useRouter();

  // Track the current token so we don't write to Firestore on every render
  const savedToken = useRef<string | null>(null);

  // ── Register and save token ──────────────────────────────────────────────
  useEffect(() => {
    if (!appUser?.uid) return;

    registerForPushNotifications().then(async (token) => {
      if (token === savedToken.current) return; // unchanged
      savedToken.current = token;
      try {
        await savePushToken(appUser.uid, token);
      } catch (err) {
        console.error("[Push] Failed to save token to Firestore:", err);
      }
    });
  }, [appUser?.uid]);

  // ── Handle tap on a notification that arrived while app was open ─────────
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const route = routeForNotification(response.notification);
        router.push(route as any);
      }
    );
    return () => sub.remove();
  }, [router]);

  // ── Handle tap on a notification that launched the app from killed state ──
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const route = routeForNotification(response.notification);
      router.push(route as any);
    });
  }, []); // intentionally empty — only run once on mount
}
