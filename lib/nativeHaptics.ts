import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

/**
 * Gives an immediate, subtle tap when a locally-valid Love Heart action starts.
 * This is deliberately best-effort: missing native plugins, disabled device
 * haptics, and older app binaries must never block the underlying action.
 */
export async function triggerLoveHeartTapHapticBestEffort() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    console.warn("Love Heart haptic feedback unavailable:", error);
  }
}
