/// <reference types="@capacitor/push-notifications" />
import type { CapacitorConfig } from "@capacitor/cli";

const appUrl = process.env.CAPACITOR_SERVER_URL || "https://www.christian-roots.com";

const config: CapacitorConfig = {
  appId: "com.rootspuce.app",
  appName: "Roots",
  webDir: "capacitor-www",
  server: {
    url: appUrl,
    cleartext: false,
    androidScheme: "https",
    allowNavigation: [
      "christian-roots.com",
      "www.christian-roots.com",
    ],
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_roots_notification",
      iconColor: "#6B8E5A",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#F8F7F2",
    },
  },
};

export default config;
