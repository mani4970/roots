import type { Lang } from "./i18n";

type Field = HTMLInputElement | HTMLTextAreaElement;

const SAMPLE_LIMIT = 96;
const SESSION_MS = 120_000;
let active: { field: Field; finish: (show: boolean) => void } | null = null;

const timingCopy = {
  ko: {
    active: "입력 시간 측정 중", hint: "2분 안에 Option+Shift+클릭으로 결과 보기",
    empty: "측정한 입력이 없습니다. 같은 칸에서 Option+Shift+클릭한 뒤 글자를 입력해 주세요.",
    title: "입력 시간", unit: "회", max: "최대", columns: "첫 측정 / 이후 중앙값 / 이후 최댓값 (ms)",
    queue: "키 이벤트 전달 대기", key: "키 이벤트 처리 시작 → 입력", before: "입력 직전 이벤트 → 입력",
    frame: "입력 → 다음 프레임 콜백", note: "프레임은 첫 입력과 이후 8회마다 표본을 잡습니다. 실제 화면 표시까지 걸린 시간은 별도입니다.",
  },
  en: {
    active: "Measuring input timing", hint: "Option+Shift+click again within 2 minutes for results",
    empty: "No input measured. Option+Shift+click the same field, then type.",
    title: "Input timing", unit: "", max: "limit", columns: "First / median of the rest / maximum of the rest (ms)",
    queue: "Key event dispatch delay", key: "Key handler start → input", before: "Before-input event → input",
    frame: "Input → next frame callback", note: "The frame callback is sampled on the first input and every 8 inputs afterward. Actual display timing is measured separately.",
  },
  de: {
    active: "Eingabezeit wird gemessen", hint: "Für das Ergebnis innerhalb von 2 Minuten erneut mit Option+Umschalt klicken",
    empty: "Keine Eingabe gemessen. Mit Option+Umschalt in dasselbe Feld klicken und dann tippen.",
    title: "Eingabezeit", unit: "", max: "maximal", columns: "Erster Wert / Median der übrigen / Maximum der übrigen (ms)",
    queue: "Wartezeit des Tastaturereignisses", key: "Beginn der Tastenverarbeitung → Eingabe", before: "Ereignis vor der Eingabe → Eingabe",
    frame: "Eingabe → nächster Frame-Callback", note: "Der Frame-Callback wird bei der ersten und danach bei jeder achten Eingabe gemessen. Die tatsächliche Bildschirmanzeige erfordert eine separate Messung.",
  },
  fr: {
    active: "Mesure du délai de saisie", hint: "Refaites Option+Maj+clic dans les 2 minutes pour voir les résultats",
    empty: "Aucune saisie mesurée. Faites Option+Maj+clic dans le même champ, puis saisissez du texte.",
    title: "Délai de saisie", unit: "", max: "limite", columns: "Première mesure / médiane des suivantes / maximum des suivantes (ms)",
    queue: "Attente de l’événement clavier", key: "Début du traitement de la touche → saisie", before: "Événement avant saisie → saisie",
    frame: "Saisie → prochain rappel d’affichage", note: "Le rappel est mesuré à la première saisie, puis toutes les 8 saisies. L’affichage réel à l’écran demande une mesure distincte.",
  },
  es: {
    active: "Midiendo el tiempo de escritura", hint: "Vuelve a pulsar Opción+Mayús y haz clic antes de 2 minutos para ver el resultado",
    empty: "No se ha medido ninguna entrada. Haz clic en el mismo campo con Opción+Mayús y empieza a escribir.",
    title: "Tiempo de escritura", unit: "", max: "límite", columns: "Primera medida / mediana de las demás / máximo de las demás (ms)",
    queue: "Espera del evento de teclado", key: "Inicio del manejo de la tecla → entrada", before: "Evento anterior a la entrada → entrada",
    frame: "Entrada → siguiente aviso de fotograma", note: "El aviso se mide en la primera entrada y después cada 8 entradas. El momento en que se ve el texto en pantalla requiere otra medición.",
  },
} satisfies Record<Lang, Record<string, string>>;

function timingRow(label: string, samples: number[], unit = "회") {
  const summary = `${label} · ${samples.length}${unit}`;
  if (!samples.length) return summary;
  const first = Math.round(samples[0]);
  if (samples.length === 1) return `${summary}   ${first} / – / –`;
  const later = samples.slice(1).sort((a, b) => a - b);
  const middle = Math.floor(later.length / 2);
  const median = later.length % 2 ? later[middle] : (later[middle - 1] + later[middle]) / 2;
  return `${summary}   ${first} / ${Math.round(median)} / ${Math.round(later[later.length - 1])}`;
}

/** Called only by the opt-in native Mac gesture handler. Never read event or field contents. */
export function toggleMacInputTimingProbe(field: Field): void {
  const loginEmail = location.pathname === "/login" && field.matches('.roots-auth-phase2g input[type="email"]');
  const writer = location.pathname === "/qt/write" && field.matches(".qt-writer-editor textarea");
  if ((!loginEmail && !writer) || !field.isConnected) return;
  if (active?.field === field) {
    active.finish(true);
    return;
  }
  active?.finish(false);

  const controller = new AbortController();
  const options = { capture: true, passive: true, signal: controller.signal };
  const queued: number[] = [];
  const keyToInput: number[] = [];
  const beforeToInput: number[] = [];
  const frames: number[] = [];
  let count = 0;
  let keyAt: number | null = null;
  let queueDelay: number | null = null;
  let beforeAt: number | null = null;
  let frame: number | null = null;
  const lang = document.documentElement.lang.toLowerCase().split("-")[0];
  const copy = timingCopy[Object.prototype.hasOwnProperty.call(timingCopy, lang) ? lang as Lang : "ko"];
  const addedTitle = !field.hasAttribute("title");
  if (addedTitle) field.title = `${copy.active} · ${copy.hint}`;

  // A single static label confirms the opt-in without moving focus or repainting on each edit.
  const badge = document.createElement("div");
  badge.setAttribute("role", "status");
  badge.textContent = copy.active;
  badge.style.cssText = "position:fixed;top:max(8px,env(safe-area-inset-top));right:8px;z-index:9999;pointer-events:none;padding:4px 8px;border-radius:8px;background:var(--surface-sage-selected,#e6efe6);color:var(--text,#202720);font:500 12px/1.4 system-ui";
  document.body.appendChild(badge);

  // A single probe on ancestors detects route removal without observing character or attribute changes.
  const detached = new MutationObserver(() => { if (!field.isConnected) finish(false); });
  for (let parent = field.parentElement; parent; parent = parent.parentElement) {
    detached.observe(parent, { childList: true });
  }
  const expiry = window.setTimeout(() => finish(false), SESSION_MS);
  function finish(show: boolean) {
    if (active?.field !== field) return;
    active = null;
    controller.abort();
    detached.disconnect();
    clearTimeout(expiry);
    if (frame !== null) cancelAnimationFrame(frame);
    if (addedTitle) field.removeAttribute("title");
    badge.remove();
    if (!show) return;
    if (!count) {
      window.alert(copy.empty);
      return;
    }
    window.alert([
      `${copy.title} · ${count}${copy.unit} (${copy.max} ${SAMPLE_LIMIT}${copy.unit})`,
      copy.columns,
      timingRow(copy.queue, queued, copy.unit),
      timingRow(copy.key, keyToInput, copy.unit),
      timingRow(copy.before, beforeToInput, copy.unit),
      timingRow(copy.frame, frames, copy.unit),
      copy.note,
    ].join("\n"));
  }
  active = { field, finish };
  function eligibleEvent(event: Event) {
    if (loginEmail && field.type !== "email") {
      finish(false);
      return false;
    }
    return event.isTrusted && count < SAMPLE_LIMIT;
  }
  field.addEventListener("keydown", event => {
    if (!eligibleEvent(event)) return;
    keyAt = performance.now();
    const delay = keyAt - event.timeStamp;
    // Epoch-based or incompatible event clocks cannot be subtracted from performance.now().
    queueDelay = event.timeStamp > 0 && delay >= 0 && delay <= SESSION_MS ? delay : null;
  }, options);
  field.addEventListener("beforeinput", event => {
    if (eligibleEvent(event)) beforeAt = performance.now();
  }, options);
  field.addEventListener("input", event => {
    if (!eligibleEvent(event)) return;
    const now = performance.now();
    ++count;
    // A composition or paste may have no corresponding recent key event.
    if (keyAt !== null && now - keyAt <= 2_000) {
      keyToInput.push(now - keyAt);
      if (queueDelay !== null) queued.push(queueDelay);
    }
    keyAt = null;
    queueDelay = null;
    if (beforeAt !== null && now - beforeAt <= 2_000) beforeToInput.push(now - beforeAt);
    beforeAt = null;
    if (frame === null && (count - 1) % 8 === 0) {
      frame = requestAnimationFrame(() => {
        frame = null;
        frames.push(performance.now() - now);
      });
    }
  }, options);
  field.addEventListener("blur", () => finish(false), options);
  window.addEventListener("pagehide", () => finish(false), options);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") finish(false);
  }, options);
}
