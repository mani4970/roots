"use client";

import { Component, createRef, type ReactNode } from "react";

type Props = {
  viewKey: string;
  children: ReactNode;
  present?: boolean;
};

type AnchorSnapshot = { element: HTMLElement; top: number; viewKey: string } | null;

/** Keeps an already-visible feed row in place when the challenge above it settles. */
export default class CommunityChallengeBoundary extends Component<Props> {
  private regionRef = createRef<HTMLDivElement>();

  getSnapshotBeforeUpdate(previous: Props): AnchorSnapshot {
    const region = this.regionRef.current;
    if (!region || previous.viewKey !== this.props.viewKey || window.scrollY <= 0) return null;
    if (region.getBoundingClientRect().bottom > 0) return null;
    if (document.querySelector("[data-qt-detail]")) return null;
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && focused.matches("input, textarea, select, [contenteditable='true']")) return null;

    for (const element of document.querySelectorAll<HTMLElement>(
      '[data-qt-card], [data-prayer-card-id], [id^="community-prayer-"]',
    )) {
      if (!(region.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight) {
        return { element, top: rect.top, viewKey: this.props.viewKey };
      }
    }
    return null;
  }

  componentDidUpdate(_previous: Props, _state: unknown, snapshot: AnchorSnapshot) {
    if (!snapshot || snapshot.viewKey !== this.props.viewKey || !snapshot.element.isConnected) return;
    // Native scroll anchoring may already have corrected the change. Apply only
    // the remaining difference, without a smooth animation or a move to the top.
    const difference = snapshot.element.getBoundingClientRect().top - snapshot.top;
    if (Math.abs(difference) > 0.5) window.scrollBy({ top: difference, behavior: "instant" });
  }

  render() {
    if (this.props.present === false || this.props.children == null) return null;
    return <div ref={this.regionRef} data-community-challenge-boundary>{this.props.children}</div>;
  }
}
