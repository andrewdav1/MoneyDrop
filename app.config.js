const { existsSync } = require("fs");
const { resolve } = require("path");

// Use the plist if it exists locally or if EAS injects it via the env var.
const googleServicesPlist =
  process.env.GOOGLE_SERVICES_PLIST ||
  (existsSync(resolve(__dirname, "GoogleService-Info.plist"))
    ? "./GoogleService-Info.plist"
    : undefined);

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: "MoneyDrop",
  slug: "moneydrop",
  version: "1.0.0",
  scheme: "moneydrop",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#0A0A0A",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.adavz.moneydrop",
    ...(googleServicesPlist ? { googleServicesFile: googleServicesPlist } : {}),
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#0A0A0A",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    package: "com.moneydrop.app",
    predictiveBackGestureEnabled: false,
    permissions: [
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION",
    ],
  },
  web: {
    bundler: "metro",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-camera",
      {
        cameraPermission:
          "Allow MoneyDrop to access your camera to scan QR codes.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Allow MoneyDrop to access your photos to upload clue images.",
        cameraPermission:
          "Allow MoneyDrop to use your camera to capture clue images.",
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Allow MoneyDrop to use your location to verify you are near the drop.",
      },
    ],
    [
      "@stripe/stripe-react-native",
      {
        merchantIdentifier: "merchant.com.adavz.moneydrop",
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/icon.png",
        color: "#FFD700",
        defaultChannel: "drops",
        androidMode: "default",
        sounds: ["./assets/notification.wav"],
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: "155906e1-6c2e-40b7-83c5-ca05a999f11e",
    },
  },
};
