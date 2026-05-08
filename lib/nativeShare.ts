import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

export type ShareInviteParams = {
  title: string;
  text: string;
  url?: string;
};

function isBrowser() {
  return typeof window !== "undefined" && typeof navigator !== "undefined";
}

function isNativeApp() {
  return isBrowser() && Capacitor.isNativePlatform();
}

export async function copyText(text: string): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.warn("Clipboard API failed; trying legacy copy fallback.", error);
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch (error) {
    console.warn("Legacy copy fallback failed.", error);
    return false;
  }
}

function buildShareText(text: string, url?: string) {
  if (!url) return text;
  return text.includes(url) ? text : `${text}
${url}`;
}

export async function shareInvite({ title, text, url }: ShareInviteParams): Promise<"shared" | "copied" | "failed"> {
  if (!isBrowser()) return "failed";

  const shareText = buildShareText(text, url);

  if (isNativeApp()) {
    try {
      // Android message apps often render both `text` and `url`, which duplicates invite links.
      // Keep the link inside text only so every target receives a single clean message.
      await Share.share({ title, text: shareText, dialogTitle: title });
      return "shared";
    } catch (error) {
      // User cancellation should not be treated as an app error.
      console.warn("Native share failed or was cancelled; trying web fallback.", error);
    }
  }

  try {
    if (navigator.share) {
      await navigator.share({ title, text: shareText });
      return "shared";
    }
  } catch (error) {
    console.warn("Web share failed or was cancelled; trying clipboard fallback.", error);
  }

  return (await copyText(shareText)) ? "copied" : "failed";
}
