"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Clock, Loader2, X } from "lucide-react";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";
import {
  applyNotificationSettings,
  getNotificationSettings,
  isLocalNotificationsAvailable,
  inputValueToTime,
  timeToInputValue,
  type RootsNotificationSettings,
} from "@/lib/localNotifications";
import {
  DEFAULT_PUSH_NOTIFICATION_PREFERENCES,
  loadPushNotificationPreferences,
  savePushNotificationPreferences,
  type RootsPushNotificationPreferences,
} from "@/lib/notifications/preferences";
import { getNotificationSettingsText } from "@/lib/notifications/settingsText";
import {
  disableCurrentUserPushTokens,
  registerCurrentDeviceForPushNotifications,
} from "@/lib/notifications/pushTokens";

type Props = {
  onClose: () => void;
  onSaved?: (message: string) => void;
};

function Toggle({ checked, onChange, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      aria-pressed={checked}
      disabled={disabled}
      style={{
        width: 48,
        minWidth: 48,
        maxWidth: 48,
        height: 28,
        flex: "0 0 48px",
        boxSizing: "border-box",
        borderRadius: 999,
        border: "none",
        background: checked ? "var(--sage-action)" : "var(--profile-card-muted-surface)",
        padding: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: checked ? "flex-end" : "flex-start",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        transition: "all .18s ease",
      }}
    >
      <span style={{ width: 22, height: 22, flex: "0 0 22px", borderRadius: "50%", background: "var(--profile-toggle-knob)", boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }} />
    </button>
  );
}

function TimeRow({
  title,
  description,
  enabled,
  time,
  disabled,
  onEnabledChange,
  onTimeChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  time: string;
  disabled: boolean;
  onEnabledChange: (value: boolean) => void;
  onTimeChange: (value: string) => void;
}) {
  return (
    <div style={{ padding: "14px 0", borderTop: "1px solid var(--border)" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>{title}</p>
          <p style={{ fontSize: 12, lineHeight: 1.55, color: "var(--profile-muted-text)" }}>{description}</p>
        </div>
        <Toggle checked={enabled} onChange={onEnabledChange} disabled={disabled} />
      </div>
      <label style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 12, background: "var(--profile-card-muted-surface)", border: "1px solid var(--border)", opacity: disabled || !enabled ? 0.6 : 1 }}>
        <Clock size={14} style={{ color: "var(--profile-sage-notice-text)" }} />
        <input
          type="time"
          value={time}
          disabled={disabled || !enabled}
          onChange={(event) => onTimeChange(event.target.value)}
          style={{ background: "transparent", border: "none", color: "var(--text)", fontSize: 13, fontWeight: 700, outline: "none" }}
        />
      </label>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  enabled,
  disabled,
  onEnabledChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  disabled: boolean;
  onEnabledChange: (value: boolean) => void;
}) {
  return (
    <div style={{ padding: "12px 0", borderTop: "1px solid var(--border)" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>{title}</p>
          <p style={{ fontSize: 12, lineHeight: 1.55, color: "var(--profile-muted-text)" }}>{description}</p>
        </div>
        <Toggle checked={enabled} onChange={onEnabledChange} disabled={disabled} />
      </div>
    </div>
  );
}

export default function NotificationSettingsModal({ onClose, onSaved }: Props) {
  const lang = useLang();
  const pushText = useMemo(() => getNotificationSettingsText(lang), [lang]);
  const [settings, setSettings] = useState<RootsNotificationSettings>(() => getNotificationSettings());
  const [pushPreferences, setPushPreferences] = useState<RootsPushNotificationPreferences>(DEFAULT_PUSH_NOTIFICATION_PREFERENCES);
  const [loadingPushPreferences, setLoadingPushPreferences] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const notificationsAvailable = useMemo(() => isLocalNotificationsAvailable(), []);
  const disabled = !settings.enabled;
  const pushDisabled = loadingPushPreferences || !pushPreferences.pushEnabled;

  useEffect(() => {
    let cancelled = false;

    loadPushNotificationPreferences()
      .then((preferences) => {
        if (!cancelled) setPushPreferences(preferences);
      })
      .catch((error) => {
        console.warn("푸시 알림 설정 불러오기 실패:", error);
        if (!cancelled) setMessage(pushText.loadFailed);
      })
      .finally(() => {
        if (!cancelled) setLoadingPushPreferences(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pushText.loadFailed]);

  function update(next: Partial<RootsNotificationSettings>) {
    setSettings(current => ({ ...current, ...next }));
  }

  function normalizePushPreferences(preferences: RootsPushNotificationPreferences): RootsPushNotificationPreferences {
    return {
      ...preferences,
      groupQtEnabled: preferences.groupNotificationsEnabled,
      groupPrayerEnabled: preferences.groupNotificationsEnabled,
      groupAnsweredPrayerEnabled: preferences.groupNotificationsEnabled,
      partnerQtEnabled: preferences.partnerNotificationsEnabled,
      partnerPrayerEnabled: preferences.partnerNotificationsEnabled,
      partnerAnsweredPrayerEnabled: preferences.partnerNotificationsEnabled,
    };
  }

  function updatePush(next: Partial<RootsPushNotificationPreferences>) {
    setPushPreferences(current => normalizePushPreferences({ ...current, ...next }));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const normalizedPushPreferences = normalizePushPreferences(pushPreferences);
      await savePushNotificationPreferences(normalizedPushPreferences);
      setPushPreferences(normalizedPushPreferences);

      let pushWarning = "";
      if (normalizedPushPreferences.pushEnabled) {
        const pushRegistration = await registerCurrentDeviceForPushNotifications();
        if (!pushRegistration.ok && pushRegistration.status === "permission_denied") {
          pushWarning = pushText.pushPermissionDenied;
        } else if (!pushRegistration.ok && pushRegistration.status === "registration_failed") {
          pushWarning = pushText.pushRegistrationFailed;
        }
      } else {
        await disableCurrentUserPushTokens();
      }

      const result = await applyNotificationSettings(settings, lang);
      if (!notificationsAvailable || result.permission === "unavailable") {
        setMessage(pushWarning || t("notifications_native_only", lang));
      } else if (settings.enabled && result.permission !== "granted") {
        setMessage(t("notifications_permission_denied", lang));
      } else {
        const okMessage = pushWarning || t("notifications_saved", lang);
        setMessage(okMessage);
        if (!pushWarning) onSaved?.(okMessage);
      }
    } catch (error) {
      console.error("알림 설정 저장 실패:", error);
      setMessage(t("notifications_save_failed", lang));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 180, background: "var(--overlay-modal)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 18px" }}>
      <div onClick={event => event.stopPropagation()} style={{ width: "100%", maxWidth: 410, maxHeight: "calc(100vh - 72px)", overflowY: "auto", background: "var(--profile-modal-surface)", border: "1px solid var(--border)", borderRadius: 26, padding: "22px 18px 18px", boxShadow: "var(--shadow-modal)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: 14, background: "var(--profile-selected-surface)", color: "var(--profile-sage-notice-text)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Bell size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontSize: 17, fontWeight: 900, color: "var(--text)", marginBottom: 4 }}>{t("notifications_title", lang)}</h3>
              <p style={{ fontSize: 12, lineHeight: 1.55, color: "var(--profile-muted-text)" }}>{pushText.modalDescription}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ borderRadius: 16, background: "var(--profile-sage-notice-surface)", border: "1px solid var(--profile-sage-notice-border)", color: "var(--profile-sage-notice-text)", padding: "12px 13px", fontSize: 12, fontWeight: 750, lineHeight: 1.65, whiteSpace: "pre-line", marginBottom: 12 }}>
          {pushText.updateNotice}
        </div>

        {!notificationsAvailable && (
          <div style={{ borderRadius: 16, background: "var(--profile-gold-surface)", border: "1px solid var(--profile-gold-border)", color: "var(--profile-gold-text)", padding: "11px 12px", fontSize: 12, lineHeight: 1.55, marginBottom: 12 }}>
            {t("notifications_native_only", lang)}
          </div>
        )}

        <div style={{ borderRadius: 18, background: "var(--profile-card-muted-surface)", border: "1px solid var(--border)", padding: "14px 14px 0", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, paddingBottom: 14 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 850, color: "var(--text)", marginBottom: 4 }}>{t("notifications_master_toggle", lang)}</p>
              <p style={{ fontSize: 12, lineHeight: 1.55, color: "var(--profile-muted-text)" }}>{pushText.devicePermissionDescription}</p>
            </div>
            <Toggle checked={settings.enabled} onChange={(value) => update({ enabled: value })} />
          </div>

          <TimeRow
            title={t("notifications_morning_title", lang)}
            description={t("notifications_morning_desc", lang)}
            enabled={settings.morningEnabled}
            time={timeToInputValue(settings.morningTime)}
            disabled={disabled}
            onEnabledChange={(value) => update({ morningEnabled: value })}
            onTimeChange={(value) => update({ morningTime: inputValueToTime(value, settings.morningTime) })}
          />
          <TimeRow
            title={t("notifications_evening_title", lang)}
            description={pushText.eveningReminderDescription}
            enabled={settings.eveningEnabled}
            time={timeToInputValue(settings.eveningTime)}
            disabled={disabled}
            onEnabledChange={(value) => update({ eveningEnabled: value })}
            onTimeChange={(value) => update({ eveningTime: inputValueToTime(value, settings.eveningTime) })}
          />
          <TimeRow
            title={t("notifications_prayer_title", lang)}
            description={t("notifications_prayer_desc", lang)}
            enabled={settings.prayerEnabled}
            time={timeToInputValue(settings.prayerTime)}
            disabled={disabled}
            onEnabledChange={(value) => update({ prayerEnabled: value })}
            onTimeChange={(value) => update({ prayerTime: inputValueToTime(value, settings.prayerTime) })}
          />
        </div>

        <div style={{ borderRadius: 18, background: "var(--profile-card-muted-surface)", border: "1px solid var(--border)", padding: "14px 14px 0", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, paddingBottom: 14 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 850, color: "var(--text)", marginBottom: 4 }}>{pushText.pushTitle}</p>
              <p style={{ fontSize: 12, lineHeight: 1.55, color: "var(--profile-muted-text)" }}>{pushText.pushDescription}</p>
            </div>
            <Toggle checked={pushPreferences.pushEnabled} onChange={(value) => updatePush({ pushEnabled: value })} disabled={loadingPushPreferences} />
          </div>

          <ToggleRow
            title={pushText.groupTitle}
            description={pushText.groupDescription}
            enabled={pushPreferences.groupNotificationsEnabled}
            disabled={pushDisabled}
            onEnabledChange={(value) => updatePush({ groupNotificationsEnabled: value })}
          />

          <ToggleRow
            title={pushText.partnerTitle}
            description={pushText.partnerDescription}
            enabled={pushPreferences.partnerNotificationsEnabled}
            disabled={pushDisabled}
            onEnabledChange={(value) => updatePush({ partnerNotificationsEnabled: value })}
          />
        </div>

        {message && <p style={{ fontSize: 12, color: message === t("notifications_saved", lang) ? "var(--profile-sage-notice-text)" : "var(--profile-danger-text)", lineHeight: 1.55, marginBottom: 12 }}>{message}</p>}

        <button
          onClick={save}
          disabled={saving}
          style={{ width: "100%", padding: "13px 14px", background: "var(--sage-action)", border: "none", borderRadius: 14, color: "var(--on-sage-action)", fontSize: 14, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          {saving ? <Loader2 size={15} className="spin" /> : null}
          {t("notifications_save", lang)}
        </button>
      </div>
    </div>
  );
}
