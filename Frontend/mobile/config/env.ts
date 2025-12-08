// config/env.ts
// Centralized environment configuration for the mobile app

import { Platform } from "react-native";
import Constants from "expo-constants";

type ExtraConfig = {
  apiBaseUrl?: string;
  googleMapsApiKey?: string;
  appEnv?: string;
};

const extra = (Constants.expoConfig?.extra || {}) as ExtraConfig;

/**
 * Get the backend API base URL.
 *
 * Priority:
 * 1. EXPO_PUBLIC_API_BASE_URL_ANDROID / EXPO_PUBLIC_API_BASE_URL_IOS
 * 2. extra.apiBaseUrl from app.config.js (optional)
 * 3. Local dev fallbacks (localhost / 10.0.2.2)
 */
export const getApiBaseUrl = (): string => {
  // 1) From EXPO_PUBLIC_* env vars (preferred for JS code)
  const fromEnv =
    Platform.OS === "android"
      ? process.env.EXPO_PUBLIC_API_BASE_URL_ANDROID
      : process.env.EXPO_PUBLIC_API_BASE_URL_IOS;

  if (fromEnv) {
    return fromEnv;
  }

  // 2) From app.config.js -> extra.apiBaseUrl (optional backup)
  if (extra.apiBaseUrl) {
    return extra.apiBaseUrl;
  }

  // 3) Dev fallback for local backend
  if (__DEV__) {
    if (Platform.OS === "android") {
      return "http://10.0.2.2:7500";
    }
    return "http://localhost:7500/api";
  }

  console.warn(
    "[env] API base URL not configured. Set EXPO_PUBLIC_API_BASE_URL_ANDROID / EXPO_PUBLIC_API_BASE_URL_IOS or extra.apiBaseUrl."
  );
  return "";
};

/**
 * Get Google Maps API key from environment configuration.
 *
 * Priority:
 * 1. EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
 * 2. extra.googleMapsApiKey from app.config.js (optional)
 */
export const getGoogleMapsApiKey = (): string => {
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const fromExtra = extra.googleMapsApiKey;

  const apiKey = fromEnv || fromExtra || "";

  if (!apiKey) {
    console.warn(
      "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY not set"
    );
  }

  return apiKey;
};

// Expose constants for convenience
export const API_BASE_URL = getApiBaseUrl();
export const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();
export const APP_ENV = extra.appEnv || process.env.APP_ENV || "development";
