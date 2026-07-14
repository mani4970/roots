"use client";

import type { CSSProperties } from "react";
import type { Lang } from "@/lib/i18n";
import { getDateLocale, parseLocalDateString } from "@/lib/date";
import { getGroupChallengeRequestText } from "@/lib/groupChallengeRequestText";

type GroupChallengeScheduleFieldsProps = {
  lang: Lang;
  startDate: string;
  endDate: string;
  minStartDate: string;
  maxEndDate: string;
  startLabel: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
};

function formatDate(value: string, lang: Lang) {
  if (!value) return "";
  return parseLocalDateString(value).toLocaleDateString(getDateLocale(lang), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function DateField({
  label,
  value,
  min,
  max,
  lang,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  lang: Lang;
  onChange: (value: string) => void;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <label
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: "var(--text3)",
          display: "block",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative", width: "100%" }}>
        <input
          type="date"
          className="input-field"
          value={value}
          min={min}
          max={max}
          onChange={(event) => onChange(event.target.value)}
          style={
            {
              width: "100%",
              height: 46,
              minWidth: 0,
              padding: "0 12px",
              boxSizing: "border-box",
              fontSize: 15,
              color: "transparent",
              caretColor: "transparent",
              WebkitTextFillColor: "transparent",
            } as CSSProperties
          }
        />
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            height: 46,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 10px",
            pointerEvents: "none",
            fontSize: 13,
            color: value ? "var(--text)" : "var(--text3)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {formatDate(value, lang)}
        </span>
      </div>
    </div>
  );
}

export default function GroupChallengeScheduleFields({
  lang,
  startDate,
  endDate,
  minStartDate,
  maxEndDate,
  startLabel,
  onStartDateChange,
  onEndDateChange,
}: GroupChallengeScheduleFieldsProps) {
  const text = getGroupChallengeRequestText(lang);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          borderRadius: 14,
          border: "1px solid rgba(189,139,30,0.22)",
          background: "rgba(232,197,71,0.10)",
          padding: "10px 12px",
          color: "var(--terra-dark)",
          fontSize: 11,
          fontWeight: 750,
          lineHeight: 1.5,
        }}
      >
        {text.leadTimeNotice}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 10,
          width: "100%",
        }}
      >
        <DateField
          label={startLabel}
          value={startDate}
          min={minStartDate}
          lang={lang}
          onChange={onStartDateChange}
        />
        <DateField
          label={text.endDateLabel}
          value={endDate}
          min={startDate || minStartDate}
          max={maxEndDate || undefined}
          lang={lang}
          onChange={onEndDateChange}
        />
      </div>
    </div>
  );
}
