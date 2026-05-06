import type { CapacitorConfig } from "@capacitor/cli";

const appUrl = process.env.CAPACITOR_SERVER_URL || "https://christian-roots.com";

const config: CapacitorConfig = {
  appId: "com.rootspuce.app",
  appName: "Roots",
  webDir: "capacitor-www",
  server: {
    url: appUrl,
    cleartext: false,
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#F8F7F2",
    },
  },
};

export default config;
