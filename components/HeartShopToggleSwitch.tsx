"use client";

import { Loader2 } from "lucide-react";

type HeartShopToggleSwitchProps = {
  enabled: boolean;
  loading?: boolean;
  enabledLabel: string;
  disabledLabel: string;
  onChange: (enabled: boolean) => void;
  ariaLabel?: string;
};

export default function HeartShopToggleSwitch({
  enabled,
  loading = false,
  enabledLabel,
  disabledLabel,
  onChange,
  ariaLabel,
}: HeartShopToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel ?? (enabled ? enabledLabel : disabledLabel)}
      onClick={() => onChange(!enabled)}
      disabled={loading}
      style={{
        position: "relative",
        width: 76,
        height: 38,
        padding: 0,
        borderRadius: 999,
        border: enabled
          ? "1px solid rgba(95,136,99,.5)"
          : "1px solid rgba(130,130,130,.2)",
        background: enabled
          ? "linear-gradient(180deg, var(--heart-shop-action), var(--sage-dark))"
          : "linear-gradient(180deg, rgba(220,222,218,.92), rgba(198,201,197,.92))",
        color: enabled ? "var(--heart-shop-on-action)" : "rgba(89,91,88,.68)",
        boxShadow: enabled
          ? "inset 0 1px 0 rgba(255,255,255,.18), 0 3px 8px rgba(77,105,80,.18)"
          : "inset 0 1px 1px rgba(255,255,255,.75), 0 3px 8px rgba(54,58,54,.10)",
        cursor: loading ? "default" : "pointer",
        opacity: loading ? 0.68 : 1,
        transition: "background 180ms ease, border-color 180ms ease, opacity 180ms ease",
        flexShrink: 0,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "50%",
          left: enabled ? 9 : 37,
          transform: "translateY(-50%)",
          fontSize: 10.5,
          fontWeight: 950,
          letterSpacing: ".2px",
          lineHeight: 1,
          transition: "left 180ms ease",
        }}
      >
        {enabled ? enabledLabel : disabledLabel}
      </span>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 3,
          left: enabled ? 41 : 3,
          width: 30,
          height: 30,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #fff, #f2f2ef)",
          border: "1px solid rgba(95,96,92,.12)",
          boxShadow: "0 2px 6px rgba(42,44,42,.22)",
          transition: "left 180ms ease",
        }}
      >
        {loading && <Loader2 size={14} className="spin" style={{ color: "var(--sage-dark)" }} />}
      </span>
    </button>
  );
}
