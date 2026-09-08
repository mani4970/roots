export type QTLeaveState = { dirty: boolean; busy: boolean };

const HISTORY_KEY = "rootsQTLeaveGuard";

/** A page-local guard. It never stores reflection text or changes application data. */
export function createQTLeaveGuard({
  win,
  getState,
  confirmLeave,
  notifyBusy,
  prepareLeave,
}: {
  win: Window;
  getState: () => QTLeaveState;
  confirmLeave: () => boolean;
  notifyBusy: () => void;
  prepareLeave?: () => void;
}) {
  const id = `qt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let armed = false;
  let bypass = false;
  let disposed = false;
  let guardedHref = win.location.href;
  let baseState: Record<string, unknown> = {};
  let pendingNavigation: (() => void) | null = null;

  const ownsTopEntry = () => win.history.state?.[HISTORY_KEY] === id;
  const needsGuard = () => {
    const state = getState();
    return !bypass && (state.dirty || state.busy);
  };

  function canLeave() {
    if (bypass) return true;
    prepareLeave?.();
    const state = getState();
    if (state.busy) {
      notifyBusy();
      return false;
    }
    return !state.dirty || confirmLeave();
  }

  function arm(pendingInput = false) {
    if (disposed || armed || pendingNavigation || bypass || (!pendingInput && !needsGuard())) return;
    guardedHref = win.location.href;
    baseState = { ...(win.history.state ?? {}) };
    delete baseState[HISTORY_KEY];
    // The adjacent original entry has the same URL/Next router state. Back
    // reaches it before unmounting the editor, so cancellation retains input.
    win.history.pushState({ ...baseState, [HISTORY_KEY]: id }, "", guardedHref);
    armed = true;
  }

  function navigate(action: () => void) {
    if (pendingNavigation) return;
    bypass = true;
    if (armed && ownsTopEntry()) {
      pendingNavigation = action;
      win.history.back();
    } else {
      armed = false;
      action();
    }
  }

  function onPopState(event: PopStateEvent) {
    if (pendingNavigation) {
      const action = pendingNavigation;
      pendingNavigation = null;
      armed = false;
      // Consume only our same-page entry; don't swallow another route's event.
      if (win.location.href === guardedHref) event.stopImmediatePropagation();
      action();
      return;
    }
    if (!armed || ownsTopEntry()) return;

    const targetHref = win.location.href;
    event.stopImmediatePropagation();
    // Restore the editor URL before asking. Native dialogs and React both see
    // the still-mounted editor, including after a multi-entry history jump.
    win.history.pushState({ ...baseState, [HISTORY_KEY]: id }, "", guardedHref);
    if (!canLeave()) return;

    bypass = true;
    armed = false;
    if (targetHref === guardedHref) {
      // Skip the original same-page entry and the guard we just restored.
      if (win.history.length > 2) win.history.go(-2);
      else win.location.assign(new URL("/qt", guardedHref).href);
    } else {
      // A long history jump has no portable delta. Honor the user's chosen
      // destination only after confirmation, without replaying router internals.
      win.location.assign(targetHref);
    }
  }

  function onBeforeUnload(event: BeforeUnloadEvent) {
    if (!bypass) prepareLeave?.();
    if (!needsGuard()) return;
    event.preventDefault();
    event.returnValue = "";
  }

  win.addEventListener("popstate", onPopState, true);
  win.addEventListener("beforeunload", onBeforeUnload);
  arm();

  return {
    sync: () => arm(),
    protectPendingInput: () => arm(true),
    requestLeave(action: () => void) {
      if (pendingNavigation || !canLeave()) return false;
      navigate(action);
      return true;
    },
    leaveAfterSave: navigate,
    dispose() {
      disposed = true;
      win.removeEventListener("popstate", onPopState, true);
      win.removeEventListener("beforeunload", onBeforeUnload);
      if (ownsTopEntry()) {
        const state = { ...win.history.state };
        delete state[HISTORY_KEY];
        win.history.replaceState(state, "", win.location.href);
      }
    },
  };
}
