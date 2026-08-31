"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Globe, Loader2, UserPlus, UserRound, X } from "lucide-react";

const COLLAPSED_ITEM_COUNT = 6;

export type ShareTargetGroup = {
  id: string;
  name: string;
  is_public?: boolean | null;
  isFavorite?: boolean | null;
};

export type ShareTargetPartner = {
  id: string;
  name: string;
  avatar_url?: string | null;
  isFavorite?: boolean | null;
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
  invitePartnersLabel?: string;
  groupsLabel: string;
  publicGroupLabel: string;
  privateGroupLabel: string;
  noGroupsLabel: string;
  selectedCountLabel: string;
  selectAllLabel?: string;
  deselectAllLabel?: string;
  showMoreLabel: string;
  showLessLabel: string;
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
  onInvitePartners?: () => void;
  onToggleTarget: (target: string) => void;
  onChangeTargets?: (targets: string[]) => void;
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
  invitePartnersLabel,
  groupsLabel,
  publicGroupLabel,
  privateGroupLabel,
  noGroupsLabel,
  selectedCountLabel,
  selectAllLabel,
  deselectAllLabel,
  showMoreLabel,
  showLessLabel,
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
  onInvitePartners,
  onToggleTarget,
  onChangeTargets,
  onShare,
  onPrivate,
  onClose,
}: SharePromptModalProps) {
  const [partnersExpanded, setPartnersExpanded] = useState(false);
  const [groupsExpanded, setGroupsExpanded] = useState(false);
  const allSelected = selectedTargets.includes("all");
  const directTargets = [
    ...partners.map(partner => `partner_${partner.id}`),
    ...groups.map(group => `group_${group.id}`),
  ];
  const allDirectTargetsSelected = directTargets.length > 0
    && directTargets.every(target => selectedTargets.includes(target));
  const canChangeAllDirectTargets = !!onChangeTargets
    && !!selectAllLabel
    && !!deselectAllLabel
    && directTargets.length > 0;
  const visiblePartners = partnersExpanded ? partners : partners.slice(0, COLLAPSED_ITEM_COUNT);
  const visibleGroups = groupsExpanded ? groups : groups.slice(0, COLLAPSED_ITEM_COUNT);
  const hiddenPartnerCount = Math.max(0, partners.length - COLLAPSED_ITEM_COUNT);
  const hiddenGroupCount = Math.max(0, groups.length - COLLAPSED_ITEM_COUNT);

  function toggleAllDirectTargets() {
    if (!onChangeTargets || directTargets.length === 0) return;

    const directTargetSet = new Set(directTargets);
    const nextTargets = allDirectTargetsSelected
      ? selectedTargets.filter(target => !directTargetSet.has(target))
      : Array.from(new Set([...selectedTargets, ...directTargets]));
    onChangeTargets(nextTargets);
  }


  function renderPartnerOption(partner: ShareTargetPartner) {
    const target = `partner_${partner.id}`;
    const selected = selectedTargets.includes(target);
    return (
      <button
        type="button"
        key={partner.id}
        onClick={() => onToggleTarget(target)}
        disabled={saving}
        aria-label={`${partner.name} · ${partnerSubLabel}`}
        aria-pressed={selected}
        style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, minWidth: 0, minHeight: 64, padding: "10px 32px 10px 10px", borderRadius: 14, border: `1px solid ${selected ? "var(--border-sage-strong)" : "var(--border)"}`, background: selected ? "var(--surface-sage-selected)" : "var(--surface-card-muted)", cursor: saving ? "not-allowed" : "pointer", textAlign: "left", opacity: saving ? 0.7 : 1 }}
      >
        {partner.avatar_url ? (
          <img
            src={partner.avatar_url}
            alt=""
            decoding="async"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: `1px solid ${selected ? "var(--border-sage-strong)" : "var(--border)"}`, flexShrink: 0, WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
          />
        ) : (
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: selected ? "var(--surface-sage-subtle)" : "var(--bg)", border: `1px solid ${selected ? "var(--border-sage-strong)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <UserRound size={16} style={{ color: selected ? "var(--sage-dark)" : "var(--text3)" }} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.35, color: selected ? "var(--sage-dark)" : "var(--text)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflowWrap: "anywhere" }}>{partner.name}</p>
        </div>
        <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, borderRadius: 6, border: `2px solid ${selected ? "var(--sage-action)" : "var(--border)"}`, background: selected ? "var(--sage-action)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {selected && <Check size={11} style={{ color: "var(--on-sage-action)" }} />}
        </div>
      </button>
    );
  }

  function renderGroupOption(group: ShareTargetGroup) {
    const target = `group_${group.id}`;
    const selected = selectedTargets.includes(target);
    return (
      <button
        type="button"
        key={group.id}
        onClick={() => onToggleTarget(target)}
        disabled={saving}
        aria-pressed={selected}
        style={{ position: "relative", display: "flex", alignItems: "center", minWidth: 0, minHeight: 64, padding: "10px 32px 10px 12px", borderRadius: 14, border: `1px solid ${selected ? "var(--border-sage-strong)" : "var(--border)"}`, background: selected ? "var(--surface-sage-selected)" : "var(--surface-card-muted)", cursor: saving ? "not-allowed" : "pointer", textAlign: "left", opacity: saving ? 0.7 : 1 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.35, color: selected ? "var(--sage-dark)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.name}</p>
          <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.is_public ? publicGroupLabel : privateGroupLabel}</p>
        </div>
        <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, borderRadius: 6, border: `2px solid ${selected ? "var(--sage-action)" : "var(--border)"}`, background: selected ? "var(--sage-action)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {selected && <Check size={11} style={{ color: "var(--on-sage-action)" }} />}
        </div>
      </button>
    );
  }

  const optionGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
  } as const;

  const sectionStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minHeight: 0,
    flexShrink: 0,
  } as const;

  const sectionTitleStyle = {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--text3)",
    lineHeight: 1.4,
  } as const;

  function renderSectionHeader(label: string, count: number) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 20, padding: "0 4px" }}>
        <p style={sectionTitleStyle}>{label}</p>
        <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, background: "var(--surface-card-muted)", color: "var(--text3)", fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{count}</span>
      </div>
    );
  }

  function renderExpansionButton(expanded: boolean, hiddenCount: number, onToggle: () => void) {
    return (
      <button
        type="button"
        onClick={onToggle}
        disabled={saving}
        aria-expanded={expanded}
        style={{ alignSelf: "center", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, minHeight: 32, padding: "6px 12px", border: "none", background: "transparent", color: "var(--sage-dark)", fontSize: 11, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.55 : 1 }}
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? showLessLabel : `${showMoreLabel} (+${hiddenCount})`}
      </button>
    );
  }

  function renderAllCommunityOption() {
    return (
      <button
        type="button"
        onClick={() => onToggleTarget("all")}
        disabled={saving}
        aria-pressed={allSelected}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px", borderRadius: 14, border: `1px solid ${allSelected ? "var(--border-sage-strong)" : "var(--border)"}`, background: allSelected ? "var(--surface-sage-selected)" : "var(--surface-card-muted)", cursor: saving ? "not-allowed" : "pointer", textAlign: "left", flexShrink: 0, opacity: saving ? 0.7 : 1 }}
      >
        <Globe size={20} style={{ color: allSelected ? "var(--sage-dark)" : "var(--text3)", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: allSelected ? "var(--sage-dark)" : "var(--text)" }}>{allLabel}</p>
          <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2, lineHeight: 1.45 }}>{allSubLabel}</p>
        </div>
        <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${allSelected ? "var(--sage-action)" : "var(--border)"}`, background: allSelected ? "var(--sage-action)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {allSelected && <Check size={12} style={{ color: "var(--on-sage-action)" }} />}
        </div>
      </button>
    );
  }

  return (
    <div
      className="share-prompt-modal"
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--overlay-modal)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
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
        className="roots-elevation-modal"
        style={{
          background: "var(--surface-card)",
          width: "100%",
          maxWidth: 480,
          borderRadius: 26,
          padding: "20px 18px 16px",
          border: "1px solid var(--border)",
          maxHeight: "min(720px, calc(100dvh - 36px - env(safe-area-inset-top) - env(safe-area-inset-bottom)))",
          display: "flex",
          flexDirection: "column",
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
              type="button"
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

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12, overflowY: "auto", minHeight: 0, flex: "1 1 auto", paddingRight: 2, overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>
          {loadingPartners || loadingGroups ? (
            <p style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", padding: "8px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Loader2 size={14} className="spin" /> {loadingLabel}
            </p>
          ) : (
            <>
              {canChangeAllDirectTargets && (
                <div style={{ display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={toggleAllDirectTargets}
                    disabled={saving}
                    aria-pressed={allDirectTargetsSelected}
                    className="btn-outline"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, width: "auto", padding: "7px 10px", borderRadius: 10, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", opacity: saving ? 0.55 : 1 }}
                  >
                    <Check size={13} />
                    {allDirectTargetsSelected ? deselectAllLabel : selectAllLabel}
                  </button>
                </div>
              )}

              <section style={sectionStyle}>
                {renderSectionHeader(partnersLabel, partners.length)}
                {partners.length > 0 ? (
                  <>
                    <div style={optionGridStyle}>
                      {visiblePartners.map(renderPartnerOption)}
                    </div>
                    {hiddenPartnerCount > 0 && renderExpansionButton(partnersExpanded, hiddenPartnerCount, () => setPartnersExpanded(current => !current))}
                  </>
                ) : (
                    <div style={{ border: "1px dashed var(--border)", background: "var(--surface-card-muted)", borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
                      <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.65, whiteSpace: "pre-line" }}>{noPartnersLabel}</p>
                      {onInvitePartners && invitePartnersLabel && (
                        <button
                          type="button"
                          onClick={onInvitePartners}
                          disabled={saving}
                          className="btn-outline"
                          style={{ marginTop: 12, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 12px", opacity: saving ? 0.55 : 1 }}
                        >
                          <UserPlus size={15} />
                          {invitePartnersLabel}
                        </button>
                      )}
                    </div>
                )}
              </section>

              <div style={{ height: 1, background: "var(--border)", margin: "0 4px", flexShrink: 0 }} />

              <section style={sectionStyle}>
                {renderSectionHeader(groupsLabel, groups.length)}
                {groups.length > 0 ? (
                  <>
                    <div style={optionGridStyle}>
                      {visibleGroups.map(renderGroupOption)}
                    </div>
                    {hiddenGroupCount > 0 && renderExpansionButton(groupsExpanded, hiddenGroupCount, () => setGroupsExpanded(current => !current))}
                  </>
                ) : (
                  <div style={{ border: "1px dashed var(--border)", background: "var(--surface-card-muted)", borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
                    <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.65 }}>{noGroupsLabel}</p>
                  </div>
                )}
              </section>

              <div style={{ height: 1, background: "var(--border)", margin: "0 4px", flexShrink: 0 }} />

              <section style={sectionStyle}>
                {renderAllCommunityOption()}
              </section>
            </>
          )}
        </div>

        <div style={{ flexShrink: 0, paddingTop: 4, background: "var(--surface-card)" }}>
          {selectedTargets.length > 0 && (
            <p style={{ fontSize: 11, color: "var(--sage-dark)", textAlign: "center", marginBottom: 12, fontWeight: 700 }}>{selectedCountLabel}</p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onPrivate} disabled={saving} className="btn-outline" style={{ flex: 1, opacity: saving ? 0.55 : 1 }}>
              {privateActionLabel}
            </button>
            <button type="button" onClick={onShare} disabled={saving || selectedTargets.length === 0} className="btn-sage" style={{ flex: 1, opacity: saving || selectedTargets.length === 0 ? 0.55 : 1 }}>
              {saving ? <Loader2 size={16} className="spin" /> : `${shareActionLabel}${selectedTargets.length > 0 ? ` (${selectedTargets.length})` : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
