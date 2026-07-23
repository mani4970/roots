"use client";

import { Loader2 } from "lucide-react";
import type { OAuthProvider } from "@/lib/nativeOAuth";

export type AuthOAuthProvider = OAuthProvider;

type AuthOAuthButtonsProps = {
  googleLabel: string;
  appleLabel: string;
  loadingProvider: AuthOAuthProvider | null;
  onProviderClick: (provider: AuthOAuthProvider) => void | Promise<void>;
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M16.49 12.74c-.02-2.16 1.77-3.2 1.85-3.25-1.01-1.48-2.57-1.68-3.12-1.7-1.33-.14-2.59.78-3.26.78-.68 0-1.72-.76-2.83-.74-1.45.02-2.79.84-3.54 2.14-1.52 2.64-.39 6.55 1.09 8.69.72 1.04 1.58 2.21 2.71 2.17 1.09-.04 1.5-.7 2.81-.7 1.31 0 1.67.7 2.83.68 1.17-.02 1.91-1.06 2.63-2.1.83-1.21 1.17-2.38 1.19-2.44-.03-.01-2.28-.87-2.3-3.53h-.06zM14.35 6.38c.6-.73 1.01-1.74.9-2.75-.87.04-1.92.58-2.55 1.31-.56.65-1.05 1.68-.92 2.67.97.08 1.96-.49 2.57-1.23z" />
    </svg>
  );
}

export default function AuthOAuthButtons({
  googleLabel,
  appleLabel,
  loadingProvider,
  onProviderClick,
}: AuthOAuthButtonsProps) {
  const disabled = loadingProvider !== null;

  return (
    <>
      <button
        type="button"
        onClick={() => { void onProviderClick("google"); }}
        disabled={disabled}
        style={{ width: "100%", background: "var(--auth-oauth-surface)", color: "var(--text)", fontSize: 14, fontWeight: 500, padding: "14px 16px", borderRadius: 16, border: "1px solid var(--auth-oauth-border)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 10, cursor: disabled ? "default" : "pointer", opacity: disabled && loadingProvider !== "google" ? 0.72 : 1 }}
      >
        {loadingProvider === "google" ? <Loader2 size={18} className="spin" /> : <GoogleIcon />}
        {googleLabel}
      </button>
      <button
        type="button"
        onClick={() => { void onProviderClick("apple"); }}
        disabled={disabled}
        style={{ width: "100%", background: "var(--auth-apple-surface)", color: "var(--auth-apple-text)", fontSize: 14, fontWeight: 600, padding: "14px 16px", borderRadius: 16, border: "1px solid var(--auth-apple-border)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16, cursor: disabled ? "default" : "pointer", opacity: disabled && loadingProvider !== "apple" ? 0.72 : 1 }}
      >
        {loadingProvider === "apple" ? <Loader2 size={18} className="spin" /> : <AppleIcon />}
        {appleLabel}
      </button>
    </>
  );
}
