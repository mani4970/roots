"use client";

import { Check, Globe, Loader2, Lock, UserRound, X } from "lucide-react";

export type ShareTargetGroup = {
  id: string;
  name: string;
  is_public?: boolean | null;
};

export type ShareTargetPartner = {
  id: string;
  name: string;
  avatar_url?: string | null;
};

type SharePromptModalProps = {
  title: string;
  description: string;
  helperText: string;
  allLabel: string;
  allSubLabel: string;
  partnersLabel: string;
  partnerSubLabel: string;
  noPartnersLabel: string;
  groupsLabel: string;
  publicGroupLabel: string;
  privateGroupLabel: string;
  noGroupsLabel: string;
  selectedCountLabel: string;
  loadingLabel: string;
  shareActionLabel: string;
  privateActionLabel: string;
  closeLabel: string;
  groups: ShareTargetGroup[];
  partners?: ShareTargetPartner[];
  selectedTargets: string[];
  saving?: boolean;
  loadingGroups?: boolean;
  loadingPartners?: boolean;
  onToggleTarget: (target: string) => void;
  onShare: () => void;
  onPrivate: () => void;
  onClose: () => void;
};

export default function SharePromptModal({
  title,
  description,
  helperText,
  allLabel,
  allSubLabel,
  partnersLabel,
  partnerSubLabel,
  noPartnersLabel,
  groupsLabel,
  publicGroupLabel,
  privateGroupLabel,
  noGroupsLabel,
  selectedCountLabel,
  loadingLabel,
  shareActionLabel,
  privateActionLabel,
  closeLabel,
  groups,
  partners = [],
  selectedTargets,
  saving = false,
  loadingGroups = false,
  loadingPartners = false,
  onToggleTarget,
  onShare,
  onPrivate,
  onClose,
}: SharePromptModalProps) {
  const allSelected = selectedTargets.includes("all");


  function renderPartnerOption(partner: ShareTargetPartner) {
    const target = `partner_${partner.id}`;
    const selected = selectedTargets.includes(target);
    return (
      <button
        key={partner.id}
        onClick={() => onToggleTarget(target)}
        disabled={saving}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px", borderRadius: 14, border: `1px solid ${selected ? "var(--sage)" : "var(--border)"}`, background: selected ? "var(--sage-light)" : "var(--bg3)", cursor: saving ? "not-allowed" : "pointer", textAlign: "left", flexShrink: 0, opacity: saving ? 0.7 : 1 }}
      >
        {partner.avatar_url ? (
          <img
            src={partner.avatar_url}
            alt=""
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: `1px solid ${selected ? "var(--sage)" : "var(--border)"}`, flexShrink: 0, WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
          />
        ) : (
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: selected ? "var(--sage-light)" : "var(--bg)", border: `1px solid ${selected ? "var(--sage)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <UserRound size={16} style={{ color: selected ? "var(--sage-dark)" : "var(--text3)" }} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: selected ? "var(--sage-dark)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{partner.name}</p>
          <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{partnerSubLabel}</p>
        </div>
        <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${selected ? "var(--sage)" : "var(--border)"}`, background: selected ? "var(--sage)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {selected && <Check size={12} style={{ color: "white" }} />}
        </div>
      </button>
    );
  }

  function renderAllCommunityOption() {
    return (
      <button
        onClick={() => onToggleTarget("all")}
        disabled={saving}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px", borderRadius: 14, border: `1px solid ${allSelected ? "var(--sage)" : "var(--border)"}`, background: allSelected ? "var(--sage-light)" : "var(--bg3)", cursor: saving ? "not-allowed" : "pointer", textAlign: "left", flexShrink: 0, opacity: saving ? 0.7 : 1 }}
      >
        <Globe size={20} style={{ color: allSelected ? "var(--sage-dark)" : "var(--text3)", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: allSelected ? "var(--sage-dark)" : "var(--text)" }}>{allLabel}</p>
          <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2, lineHeight: 1.45 }}>{allSubLabel}</p>
        </div>
        <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${allSelected ? "var(--sage)" : "var(--border)"}`, background: allSelected ? "var(--sage)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {allSelected && <Check size={12} style={{ color: "white" }} />}
        </div>
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 280,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "calc(18px + env(safe-area-inset-top)) 18px calc(18px + env(safe-area-inset-bottom))",
        overflow: "hidden",
        overscrollBehavior: "contain",
      }}
    >
      <div
        style={{
          background: "var(--bg2)",
          width: "100%",
          maxWidth: 480,
          borderRadius: 26,
          padding: "20px 18px 16px",
          border: "1px solid var(--border)",
          maxHeight: "min(720px, calc(100dvh - 36px - env(safe-area-inset-top) - env(safe-area-inset-bottom)))",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 18px 52px rgba(0,0,0,0.28)",
          overflow: "hidden",
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", lineHeight: 1.35 }}>{title}</h2>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--sage-dark)", lineHeight: 1.6, marginTop: 8 }}>{description}</p>
            </div>
            <button
              onClick={onClose}
              aria-label={closeLabel}
              disabled={saving}
              style={{ background: "none", border: "none", color: "var(--text3)", cursor: saving ? "not-allowed" : "pointer", padding: 2, opacity: saving ? 0.45 : 1 }}
            >
              <X size={20} />
            </button>
          </div>
          <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6, marginBottom: 14 }}>{helperText}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12, overflowY: "auto", minHeight: 0, flex: "1 1 auto", paddingRight: 2, overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>
          {loadingPartners || loadingGroups ? (
            <p style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", padding: "8px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Loader2 size={14} className="spin" /> {loadingLabel}
            </p>
          ) : (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", marginTop: 4, paddingLeft: 4, flexShrink: 0 }}>{partnersLabel}</p>
              {partners.length > 0 ? partners.map(renderPartnerOption) : (
                <p style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", padding: "8px 0" }}>{noPartnersLabel}</p>
              )}

              <div style={{ height: 1, background: "var(--border)", margin: "8px 4px", flexShrink: 0 }} />

              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", marginTop: 4, paddingLeft: 4, flexShrink: 0 }}>{groupsLabel}</p>
              {groups.length > 0 ? groups.map(group => {
                const target = `group_${group.id}`;
                const selected = selectedTargets.includes(target);
                return (
                  <button
                    key={group.id}
                    onClick={() => onToggleTarget(target)}
                    disabled={saving}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px", borderRadius: 14, border: `1px solid ${selected ? "var(--sage)" : "var(--border)"}`, background: selected ? "var(--sage-light)" : "var(--bg3)", cursor: saving ? "not-allowed" : "pointer", textAlign: "left", flexShrink: 0, opacity: saving ? 0.7 : 1 }}
                  >
                    <Lock size={20} style={{ color: selected ? "var(--sage-dark)" : "var(--text3)", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: selected ? "var(--sage-dark)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.name}</p>
                      <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{group.is_public ? publicGroupLabel : privateGroupLabel}</p>
                    </div>
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${selected ? "var(--sage)" : "var(--border)"}`, background: selected ? "var(--sage)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {selected && <Check size={12} style={{ color: "white" }} />}
                    </div>
                  </button>
                );
              }) : (
                <p style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", padding: "8px 0" }}>{noGroupsLabel}</p>
              )}

              <div style={{ height: 1, background: "var(--border)", margin: "8px 4px", flexShrink: 0 }} />
              {renderAllCommunityOption()}
            </>
          )}
        </div>

        <div style={{ flexShrink: 0, paddingTop: 4, background: "var(--bg2)" }}>
          {selectedTargets.length > 0 && (
            <p style={{ fontSize: 11, color: "var(--sage-dark)", textAlign: "center", marginBottom: 12, fontWeight: 700 }}>{selectedCountLabel}</p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onPrivate} disabled={saving} className="btn-outline" style={{ flex: 1, opacity: saving ? 0.55 : 1 }}>
              {privateActionLabel}
            </button>
            <button onClick={onShare} disabled={saving || selectedTargets.length === 0} className="btn-sage" style={{ flex: 1, opacity: saving || selectedTargets.length === 0 ? 0.55 : 1 }}>
              {saving ? <Loader2 size={16} className="spin" /> : `${shareActionLabel}${selectedTargets.length > 0 ? ` (${selectedTargets.length})` : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
