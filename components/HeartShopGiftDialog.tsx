"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Loader2, UserRound, X } from "lucide-react";
import {
  createGiftRequestId, fetchGiftRecipients, getGiftText, sendGift,
  type GiftRecipient,
} from "@/lib/heartShopGifts";
import HeartShopGiftPopup from "@/components/HeartShopGiftPopup";
import styles from "./HeartShopGift.module.css";

type Props = {
  lang: string;
  itemKey: string;
  itemName: string;
  price: number;
  visual: ReactNode;
  onClose: () => void;
  onBusy: (busy: boolean) => void;
  onBalanceChange: (balance: number) => void;
};

export default function HeartShopGiftDialog({ lang, itemKey, itemName, price, visual, onClose, onBusy, onBalanceChange }: Props) {
  const t = getGiftText(lang);
  const [recipients, setRecipients] = useState<GiftRecipient[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ kind: "sent"; name: string } | { kind: "insufficient" } | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [attempt, setAttempt] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [invalidItem, setInvalidItem] = useState(false);
  const senderBusy = useRef(false);
  const mounted = useRef(false);
  const request = useRef<{ recipientId: string; id: string } | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const selected = recipients.find(person => person.userId === selectedId && person.canReceive);
  const eligible = recipients.some(person => person.canReceive);

  useEffect(() => {
    mounted.current = true;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.focus({ preventScroll: true });
    return () => {
      mounted.current = false;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    let current = true;
    setLoadState("loading");
    fetchGiftRecipients(itemKey).then(people => {
      if (!current) return;
      setRecipients(people);
      setLoadState("ready");
    }).catch(() => { if (current) setLoadState("error"); });
    return () => { current = false; };
  }, [itemKey, attempt]);

  async function confirmGift() {
    if (!selected || invalidItem || senderBusy.current || outcome) return;
    senderBusy.current = true;
    panel.current?.focus({ preventScroll: true });
    onBusy(true);
    setSending(true);
    setError("");
    try {
      // Keep this key for transport retries: the server might already have sent it.
      if (request.current?.recipientId !== selected.userId) {
        request.current = { recipientId: selected.userId, id: createGiftRequestId() };
      }
      const result = await sendGift(itemKey, selected.userId, request.current.id, price);
      if (!mounted.current) return;
      if (result.balance !== null) onBalanceChange(result.balance);
      if (result.sent) {
        setOutcome({ kind: "sent", name: selected.displayName || t.companion });
      } else if (["already_owned", "incompatible", "not_companions"].includes(result.reason)) {
        setRecipients(current => current.map(person =>
          person.userId === selected.userId ? { ...person, canReceive: false } : person));
        setSelectedId(null);
        setError(t.recipientUnavailable);
      } else if (result.reason === "insufficient_hearts") {
        setOutcome({ kind: "insufficient" });
      } else if (result.reason === "price_changed" || result.reason === "invalid_item") {
        setInvalidItem(true);
        setError(result.reason === "price_changed" ? t.priceChanged : t.unavailable);
      } else {
        setError(t.sendFailed);
      }
    } catch {
      if (mounted.current) setError(t.sendFailed);
    } finally {
      senderBusy.current = false;
      if (mounted.current) {
        setSending(false);
        onBusy(false);
      }
    }
  }

  if (outcome) {
    return <HeartShopGiftPopup title={outcome.kind === "sent" ? t.sentTo(outcome.name) : t.insufficientHearts} itemName={itemName} visual={visual}
      primaryLabel={t.confirm} onPrimary={onClose} />;
  }

  return (
    <div className={styles.sheetOverlay}
      onClick={event => { if (event.target === event.currentTarget && !senderBusy.current) onClose(); }}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="shop-gift-heading" tabIndex={-1} className={styles.sheet}
        onKeyDown={event => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            if (!senderBusy.current) onClose();
          } else if (event.key === "Tab") {
            const actions = event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
            const first = actions[0], last = actions[actions.length - 1];
            if (!first) { event.preventDefault(); return; }
            if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
              event.preventDefault(); last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault(); first.focus();
            }
          }
        }}>
        <div className={styles.sheetHeader}>
          <h2 id="shop-gift-heading">{t.selectRecipient}</h2>
          <button type="button" className={styles.close} onClick={onClose} disabled={sending} aria-label={t.close}><X size={19} /></button>
        </div>
        <div className={styles.itemSummary}>
          <div className={styles.smallArt}>{visual}</div>
          <strong>{itemName}</strong><span className={styles.price}>💛 {price}</span>
        </div>
        <span className={styles.srOnly} role="status">{loadState === "ready" && eligible ? t.selectCompanion : ""}</span>
        <div className={styles.list} role="group" aria-labelledby="shop-gift-heading" aria-busy={loadState === "loading"}>
          {loadState === "loading" && <p role="status">{t.loading}</p>}
          {loadState === "error" && <div role="alert"><p>{t.loadFailed}</p><button type="button" className={styles.retry} onClick={() => { panel.current?.focus({ preventScroll: true }); setAttempt(n => n + 1); }}>{t.retry}</button></div>}
          {loadState === "ready" && !recipients.length && <p role="status">{t.noCompanions}</p>}
          {loadState === "ready" && recipients.map(person => {
            const picked = person.userId === selectedId && person.canReceive;
            const name = person.displayName || t.companion;
            return (
              <button type="button" key={person.userId} className={styles.recipient}
                data-eligible={person.canReceive} aria-pressed={picked} disabled={!person.canReceive || sending || invalidItem}
                aria-label={person.canReceive ? name : `${name} · ${t.unavailable}`}
                onClick={() => { setSelectedId(person.userId); setError(""); }}>
                <span className={styles.avatar}>{person.avatarUrl ? <img src={person.avatarUrl} alt="" /> : <UserRound size={19} />}</span>
                <span>{name}</span>
                {person.canReceive && <span className={styles.circle} aria-hidden="true">{picked && <Check size={13} strokeWidth={3} />}</span>}
              </button>
            );
          })}
          {loadState === "ready" && recipients.length > 0 && !eligible && !error && <p role="status">{t.nobodyEligible}</p>}
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button className={styles.primary} type="button" disabled={!selected || sending || invalidItem}
          aria-label={selected && !sending ? t.selectAndSend(selected.displayName || t.companion) : undefined}
          onClick={() => void confirmGift()}>
          {sending && <Loader2 className="spin" size={16} aria-hidden="true" />}
          {sending ? t.sending : selected ? t.sendGift : t.selectCompanion}
        </button>
      </div>
    </div>
  );
}
