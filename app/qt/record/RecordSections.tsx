"use client";
import { useLayoutEffect, useRef, useState, type ReactElement } from "react";

type Props = {
  sections: ReactElement[];
  wideDesktop: boolean;
  preferredSplit: number;
};

// Each candidate break keeps both the reading order and every written section intact.
function chooseColumnBreak(heights: number[], gap: number, available: number, preferred: number) {
  const total = heights.reduce((sum, height) => sum + height, 0);
  let left = 0;
  let best = 1;
  let bestHeight = Infinity;
  let preferredHeight = Infinity;
  for (let i = 1; i < heights.length; i++) {
    left += heights[i - 1];
    const height = Math.max(left + (i - 1) * gap, total - left + (heights.length - i - 1) * gap);
    if (height < bestHeight) {
      bestHeight = height;
      best = i;
    }
    if (i === preferred) preferredHeight = height;
  }
  // Give the usual break after meditation priority when all entries are short.
  const tolerance = Math.min(100, Math.min(...heights) + gap) + 1;
  return preferredHeight <= available && preferredHeight <= bestHeight + tolerance ? preferred : best;
}

export default function RecordSections({ sections, wideDesktop, preferredSplit }: Props) {
  const spread = wideDesktop && sections.length > 1;
  const container = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(preferredSplit || 1);
  const keys = sections.map(section => section.key).join("|");
  useLayoutEffect(() => {
    const group = container.current;
    if (!spread || !group) return;
    const entries = Array.from(group.querySelectorAll<HTMLElement>("[data-record-section]"));
    const column = group.firstElementChild;
    if (!column || entries.length < 2) return;

    function measure() {
      if (!group || !column) return;
      const gap = parseFloat(getComputedStyle(column).rowGap) || 0;
      const groupStyle = getComputedStyle(group);
      const page = group.closest(".qt-record-page");
      const available = window.innerHeight - group.getBoundingClientRect().top
        - parseFloat(groupStyle.paddingTop) - parseFloat(groupStyle.paddingBottom)
        - (page ? parseFloat(getComputedStyle(page).paddingBottom) : 0);
      setSplit(chooseColumnBreak(entries.map(el => el.getBoundingClientRect().height), gap, available, preferredSplit));
    }
    measure();
    const observer = new ResizeObserver(measure);
    entries.forEach(el => observer.observe(el));
    const heading = group.parentElement?.querySelector("header");
    if (heading) observer.observe(heading);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [spread, split, keys, preferredSplit]);

  function readingRegion(first?: ReactElement) {
    return wideDesktop && first ? { tabIndex: 0, role: "region", "aria-labelledby": `qt-section-${first.key}` } : {};
  }
  if (!spread) {
    return <div className="qt-record-sections" {...readingRegion(sections[0])} style={{ padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>{sections}</div>;
  }
  const boundary = Math.max(1, Math.min(split, sections.length - 1));
  return (
    <div className="qt-record-sections qt-record-columns" ref={container}>
      <div className="qt-record-column" {...readingRegion(sections[0])}>{sections.slice(0, boundary)}</div>
      <div className="qt-record-column" {...readingRegion(sections[boundary])}>{sections.slice(boundary)}</div>
    </div>
  );
}
