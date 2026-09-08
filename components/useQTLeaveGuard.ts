"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import type { Lang } from "@/lib/i18n";
import { qtFlowCopy } from "@/lib/qtFlowCopy";
import { createQTLeaveGuard } from "@/lib/qtLeaveGuard";

export function useQTLeaveGuard({ dirty, busy, lang }: { dirty: boolean; busy: boolean; lang: Lang }) {
  const router = useRouter();
  const stateRef = useRef({ dirty, busy, lang });
  stateRef.current = { dirty, busy, lang };
  const guardRef = useRef<ReturnType<typeof createQTLeaveGuard> | null>(null);

  useEffect(() => {
    const guard = createQTLeaveGuard({
      win: window,
      getState: () => stateRef.current,
      confirmLeave: () => window.confirm(qtFlowCopy("leaveUnsaved", stateRef.current.lang)),
      notifyBusy: () => window.alert(qtFlowCopy("savingWait", stateRef.current.lang)),
      // Apple editors emit their final composing value on blur. Commit it
      // before consulting dirty state, including the very first typed letter.
      prepareLeave: () => {
        const active = document.activeElement;
        if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) {
          flushSync(() => active.blur());
        }
      },
    });
    guardRef.current = guard;

    const onPendingInput = (event: Event) => {
      const field = event.target;
      if ((field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) && !field.readOnly && !field.disabled) {
        // Install the same-page history entry before a buffered Apple input
        // reaches React, so immediate browser Back can still ask and retain it.
        guard.protectPendingInput();
      }
    };

    const onLinkClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const target = new URL(anchor.href, window.location.href);
      if (!/^https?:$/.test(target.protocol) || target.href === window.location.href) return;
      const current = new URL(window.location.href);
      if (target.origin === current.origin && target.pathname === current.pathname && target.search === current.search) return;
      if (!stateRef.current.dirty && !stateRef.current.busy) return;
      event.preventDefault();
      event.stopPropagation();
      guard.requestLeave(() => {
        if (target.origin === current.origin) router.push(`${target.pathname}${target.search}${target.hash}`);
        else window.location.assign(target.href);
      });
    };
    document.addEventListener("click", onLinkClick, true);
    document.addEventListener("beforeinput", onPendingInput, true);
    return () => {
      document.removeEventListener("click", onLinkClick, true);
      document.removeEventListener("beforeinput", onPendingInput, true);
      guard.dispose();
      if (guardRef.current === guard) guardRef.current = null;
    };
  }, [router]);

  useEffect(() => { guardRef.current?.sync(); }, [dirty, busy]);

  const requestLeave = useCallback((action: () => void) => {
    if (guardRef.current) return guardRef.current.requestLeave(action);
    if (stateRef.current.busy) return false;
    if (stateRef.current.dirty && !window.confirm(qtFlowCopy("leaveUnsaved", stateRef.current.lang))) return false;
    action();
    return true;
  }, []);

  const leaveAfterSave = useCallback((action: () => void) => {
    if (guardRef.current) guardRef.current.leaveAfterSave(action);
    else action();
  }, []);

  return { requestLeave, leaveAfterSave };
}
