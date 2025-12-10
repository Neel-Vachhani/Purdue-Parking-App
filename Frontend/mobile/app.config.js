// app.config.js
import 'dotenv/config';

export default {
  expo: {
    name: "boilerpark",
    slug: "boilerpark",
    scheme: "boilerpark",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/NormalIcon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/NormalIcon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.anthonymccrovitz.boilerpark",
      usesAppleSignIn: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription:
          "Boiler Park needs your location to calculate travel times to parking garages when you don't have a starting location saved.",
        NSUserNotificationAlertStyle: "alert"
      },
      buildNumber: "14"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.anthonymccrovitz.boilerpark",
      edgeToEdgeEnabled: true,
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION"
      ],
      intentFilters: [
        {
          action: "VIEW",
          data: [{ scheme: "boilerpark", host: "*" }],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ],
      predictiveBackGestureEnabled: false
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-build-properties",
        {
          ios: { useFrameworks: "static" }
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Boiler Park needs your location to calculate travel times to parking garages when you don't have a starting location saved."
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#CEB888",
          sounds: [],
          mode: "production"
        }
      ],
      "expo-font"
    ],
    notification: {
      icon: "./assets/icon.png",
      color: "#CEB888",
      iosDisplayInForeground: true,
      androidMode: "default",
      androidCollapsedTitle: "#{unread_notifications} new notifications"
    },
    extra: {
      apiBaseUrl: process.env.API_BASE_URL_PROD,
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      eas: {
        projectId: "f7f0a87c-ad0b-4832-90a4-c220db3cb701"
      }
    },
    owner: "boilerpark"
  }
};
