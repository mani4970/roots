"use client";

import type { Lang } from "@/lib/i18n";
import { getDateLocale, parseLocalDateString } from "@/lib/date";
import { getGroupChallengeRequestText } from "@/lib/groupChallengeRequestText";
import { clampDateInputToRange } from "@/lib/groupChallengeRequestDates";

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
          fontSize: 10,
          fontWeight: 800,
          color: "var(--text3)",
          display: "block",
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 40,
          minWidth: 0,
        }}
      >
        <div
          className="input-field"
          aria-hidden="true"
          style={{
            width: "100%",
            height: 40,
            minWidth: 0,
            padding: "0 6px",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            lineHeight: 1.2,
            color: value ? "var(--text)" : "var(--text3)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            letterSpacing: "-0.2px",
          }}
        >
          {formatDate(value, lang)}
        </div>
        <input
          type="date"
          value={value}
          min={min}
          max={max}
          aria-label={label}
          onChange={(event) =>
            onChange(clampDateInputToRange(event.target.value, min, max))
          }
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            width: "100%",
            height: "100%",
            minWidth: 0,
            margin: 0,
            padding: 0,
            border: 0,
            opacity: 0,
            cursor: "pointer",
            fontSize: 16,
          }}
        />
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
          border: "1px solid var(--community-gold-border)",
          background: "var(--community-gold-surface)",
          padding: "10px 12px",
          color: "var(--community-gold-text)",
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
          gap: 8,
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
