// Only the original tab should use browser Back to return to the profile footer.
// A copied link with ?from=profile still opens a profile-layout document.
let pendingDocument: string | null = null;

export function rememberProfileDocumentNavigation(path: string) {
  pendingDocument = path;
}

export function markProfileDocumentEntry() {
  const path = window.location.pathname;
  const isPending = pendingDocument === path;
  pendingDocument = null;
  if (!isPending) return;
  try {
    window.history.replaceState({ ...window.history.state, rootsProfileDocument: path }, "");
  } catch {
    // The explicit profile link remains available when browser history is restricted.
  }
}

export function hasProfileDocumentEntry() {
  return window.history.state?.rootsProfileDocument === window.location.pathname;
}
