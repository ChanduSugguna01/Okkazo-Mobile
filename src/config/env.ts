import { Platform } from "react-native";

const fallbackBackendUrl = Platform.select({
  android: "http://10.0.2.2:8080",
  default: "http://localhost:8080",
});

export const BACKEND_URL = (
  process.env.EXPO_PUBLIC_BACKEND_URL ?? fallbackBackendUrl ?? "http://localhost:8080"
).replace(/\/$/, "");

export const GOOGLE_CLIENT_IDS = {
  expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ?? "",
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "",
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "",
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
};

export const hasGoogleClientConfig = Object.values(GOOGLE_CLIENT_IDS).some(Boolean);
