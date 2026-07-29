import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

/**
 * Gives an immediate, subtle tap when a locally-valid Love Heart action starts.
 *
 * Android's LIGHT impact pattern is noticeably longer on some devices, so a
 * very short vibration is used there. iOS keeps the native light impact. This
 * is deliberately best-effort and must never block the underlying action.
 */
export async function triggerLoveHeartTapHapticBestEffort() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    if (Capacitor.getPlatform() === "android") {
      await Haptics.vibrate({ duration: 10 });
      return;
    }

    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    console.warn("Love Heart haptic feedback unavailable:", error);
  }
}

/**
 * Gives an immediate, subtle tap when a locally-valid reflection nudge starts.
 *
 * This is interaction feedback only; the success toast still waits for the
 * API response. Haptic availability must never block the underlying request.
 */
export async function triggerReflectionNudgeHapticBestEffort() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    if (Capacitor.getPlatform() === "android") {
      await Haptics.vibrate({ duration: 10 });
      return;
    }

    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    console.warn("Reflection nudge haptic feedback unavailable:", error);
  }
}
