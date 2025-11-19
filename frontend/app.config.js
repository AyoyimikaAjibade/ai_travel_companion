// app.config.js
export default {
  expo: {
    name: "TWOS",
    slug: "twos",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",

    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#0B1020",
    },

    assetBundlePatterns: ["**/*"],

    ios: {
      supportsTablet: true,
    },

    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0B1020",
      },
    },

    web: {
      favicon: "./assets/favicon.png",
    },

    // ✅ EAS Update config
    updates: {
      url: "https://u.expo.dev/3196fc48-06ca-45ba-a4ef-18b63a94ae84",
    },

    // ✅ Runtime version will follow app version (1.0.0)
    runtimeVersion: {
      policy: "appVersion",
    },

    // ✅ SDK 54: plugin for expo-font
    plugins: ["expo-font"],

    // ✅ EAS project link
    extra: {
      eas: {
        projectId: "3196fc48-06ca-45ba-a4ef-18b63a94ae84",
      },
    },
  },
};
