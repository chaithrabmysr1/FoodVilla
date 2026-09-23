import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import * as notificationApi from "../api/notificationApi";

// Foreground display behavior — without this, notifications received while
// the app is open are silently swallowed on some platforms.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Requests permission and registers this device's Expo push token with
 * notification-service (POST /api/notifications/devices).
 *
 * Note: notification-service currently only STORES the token — no push
 * provider is wired up on the backend to actually send anything yet (see
 * CONFIGURATION.md). This registers the device so that's a config change,
 * not a mobile-side change, once it exists. Also requires a real EAS
 * projectId (app.json -> extra.eas.projectId) to get a token at all; this
 * repo doesn't have one configured, so registration is a no-op until it does.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push tokens aren't available on simulators/emulators.
    return null;
  }

  const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn("Skipping push registration: no EAS projectId configured in app.json");
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") {
    return null;
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const platform = Platform.OS === "ios" ? "ios" : "android";
    await notificationApi.registerDevice(tokenResponse.data, platform);
    return tokenResponse.data;
  } catch (err) {
    console.warn("Push registration failed", err);
    return null;
  }
}
