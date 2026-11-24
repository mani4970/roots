"use client";

import { Loader2, Plus, X } from "lucide-react";
import CursorStableInput from "@/components/CursorStableInput";
import { TRANSLATIONS } from "@/lib/bibleData";
import { t, type Lang } from "@/lib/i18n";

const COPY = {
  title: { ko: "본문 정하기", de: "Bibelstelle wählen", en: "Choose passage", fr: "Choisir le passage", es: "Elegir pasaje" },
  translation: { ko: "성경 번역본", de: "Bibelübersetzung", en: "Bible translation", fr: "Traduction biblique", es: "Traducción bíblica" },
  sermonTitle: { ko: "설교 제목", de: "Predigttitel", en: "Sermon title", fr: "Titre du sermon", es: "Título del sermón" },
  sermonTitlePlaceholder: { ko: "예: 두려워하지 말라", de: "z. B. Fürchte dich nicht", en: "e.g. Do not be afraid", fr: "ex. N’aie pas peur", es: "Ej.: No temas" },
  book: { ko: "성경", de: "Buch", en: "Book", fr: "Livre", es: "Libro" },
  startChapter: { ko: "시작 장", de: "Startkapitel", en: "Start chapter", fr: "Chapitre de début", es: "Capítulo inicial" },
  startVerse: { ko: "시작 절", de: "Startvers", en: "Start verse", fr: "Verset de début", es: "Versículo inicial" },
  endChapter: { ko: "끝 장", de: "Endkapitel", en: "End chapter", fr: "Chapitre de fin", es: "Capítulo final" },
  endVerse: { ko: "끝 절", de: "Endvers", en: "End verse", fr: "Verset de fin", es: "Versículo final" },
  addPassage: { ko: "선택한 본문 추가", de: "Ausgewählten Bibeltext hinzufügen", en: "Add selected passage", fr: "Ajouter le passage sélectionné", es: "Añadir el pasaje seleccionado" },
  addPassageHelp: { ko: "여러 본문을 묵상하려면 본문을 바꿔 추가해주세요.", de: "Wenn Sie mehrere Bibeltexte in Ihrer Stillen Zeit betrachten möchten, wählen Sie einen weiteren Text und fügen Sie ihn hinzu.", en: "To reflect on multiple passages, choose another passage and add it.", fr: "Pour inclure plusieurs passages dans votre méditation biblique, choisissez un autre passage puis ajoutez-le.", es: "Para incluir varios pasajes en tu meditación bíblica, selecciona otro y añádelo." },
  finishPassage: { ko: "본문 선택 완료", de: "Bibeltext-Auswahl abschließen", en: "Finish passage selection", fr: "Terminer la sélection du passage", es: "Finalizar selección del pasaje" },
  loading: { ko: "불러오는 중...", de: "Wird geladen...", en: "Loading...", fr: "Chargement...", es: "Cargando..." },
};

const fieldStyle = { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 } as const;
const labelStyle = { fontSize: 10, fontWeight: 700, color: "var(--text-muted-readable)" };

type Coordinate = {
  value: string | number;
  options: readonly (string | number)[];
  onChange: (value: string) => void;
};

type QTManualPassageFormProps = {
  lang: Lang;
  translationId: number;
  onTranslationChange: (id: number) => void;
  book: string;
  books: readonly { value: string; label: string }[];
  onBookChange: (value: string) => void;
  startChapter: Coordinate;
  startVerse: Coordinate;
  endChapter: Coordinate;
  endVerse: Coordinate;
  sermonTitle?: { value: string; onValueChange: (value: string) => void };
  selectedPassages: readonly string[];
  onRemovePassage: (index: number) => void;
  onAddPassage: () => void;
  onFinishPassage: () => void;
  loading?: boolean;
  error?: string;
};

function CoordinateField({ label, coordinate, disabled }: {
  label: string;
  coordinate: Coordinate;
  disabled: boolean;
}) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <span className="qt-passage-coordinate-control">
        <span className="qt-passage-coordinate-value" aria-hidden="true">{coordinate.value}</span>
        <select
          className="input-field qt-passage-coordinate-select"
          value={coordinate.value}
          onChange={event => coordinate.onChange(event.target.value)}
          disabled={disabled}
        >
          {coordinate.options.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </span>
    </label>
  );
}

export default function QTManualPassageForm({
  lang,
  translationId,
  onTranslationChange,
  book,
  books,
  onBookChange,
  startChapter,
  startVerse,
  endChapter,
  endVerse,
  sermonTitle,
  selectedPassages,
  onRemovePassage,
  onAddPassage,
  onFinishPassage,
  loading = false,
  error,
}: QTManualPassageFormProps) {
  const text = (key: keyof typeof COPY) => COPY[key][lang];
  const loadingLabel = loading && <><Loader2 size={16} className="spin" aria-hidden="true" />{text("loading")}</>;

  return (
    <div className="card roots-qt-manual-passage" aria-busy={loading || undefined}>
      <p style={{ fontSize: 12, fontWeight: 800, color: "var(--text2)", marginBottom: 12 }}>{text("title")}</p>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10 }}>
        <label style={fieldStyle}>
          <span style={labelStyle}>{text("translation")}</span>
          <select className="input-field" value={translationId} onChange={event => onTranslationChange(Number(event.target.value))} disabled={loading}>
            {TRANSLATIONS.map(group => (
              <optgroup key={group.group} label={group.group}>
                {group.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        {sermonTitle && (
          <label style={fieldStyle}>
            <span style={labelStyle}>{text("sermonTitle")}</span>
            <CursorStableInput
              className="input-field"
              value={sermonTitle.value}
              onValueChange={sermonTitle.onValueChange}
              placeholder={text("sermonTitlePlaceholder")}
              disabled={loading}
            />
          </label>
        )}
        <label style={fieldStyle}>
          <span style={labelStyle}>{text("book")}</span>
          <select className="input-field" value={book} onChange={event => onBookChange(event.target.value)} disabled={loading}>
            {books.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
          <CoordinateField label={text("startChapter")} coordinate={startChapter} disabled={loading} />
          <CoordinateField label={text("startVerse")} coordinate={startVerse} disabled={loading} />
          <CoordinateField label={text("endChapter")} coordinate={endChapter} disabled={loading} />
          <CoordinateField label={text("endVerse")} coordinate={endVerse} disabled={loading} />
        </div>
        {error && <p role="alert" style={{ fontSize: 12, color: "var(--qt-danger-text)" }}>{error}</p>}
        <button
          type="button"
          onClick={onAddPassage}
          disabled={loading}
          className="btn-outline"
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          {loading ? loadingLabel : <><Plus size={15} aria-hidden="true" /> {text("addPassage")}</>}
        </button>
        <p style={{ fontSize: 11, color: "var(--text-muted-readable)", lineHeight: 1.45, marginTop: -4 }}>{text("addPassageHelp")}</p>
        {selectedPassages.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {selectedPassages.map((passage, index) => (
              <div key={`${passage}-${index}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--qt-sage-surface)", borderRadius: 10, padding: "8px 10px", border: "1px solid var(--qt-sage-border-soft)" }}>
                <span style={{ fontSize: 12, color: "var(--qt-sage-text)", fontWeight: 700, overflowWrap: "anywhere" }}>{passage}</span>
                <button
                  type="button"
                  onClick={() => onRemovePassage(index)}
                  disabled={loading}
                  aria-label={`${t("delete", lang)} ${passage}`}
                  style={{ border: "none", background: "none", color: "var(--text3)", cursor: "pointer", flexShrink: 0 }}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={onFinishPassage} disabled={loading} className="btn-sage" style={{ width: "100%" }}>
          {loading ? loadingLabel : text("finishPassage")}
        </button>
      </div>
    </div>
  );
}
