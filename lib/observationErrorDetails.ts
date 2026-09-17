import { sanitizeObservationDetails, sanitizeObservationErrorCode, sanitizeObservationScript, type ObservationDetails } from "@/lib/observationSchema";

export type ObservationErrorContext = {
  message?: unknown;
  filename?: unknown;
  lineno?: unknown;
  colno?: unknown;
};

function read(value: unknown, key: string): unknown {
  try { return value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined; }
  catch { return undefined; }
}
function string(value: unknown, limit = 4000): string {
  return typeof value === "string" ? value.slice(0, limit) : "";
}

function kind(value: unknown, fallbackMessage?: unknown): string {
  const name = read(value, "name");
  const message = string(read(value, "message") ?? (typeof value === "string" ? value : fallbackMessage));
  // Inspect locally, emit fixed labels only. No raw message/stack is retained.
  if (/^\[qt draft timeout\] /.test(message)) return "draft_timeout";
  if (/^(?:completed photo record lookup|photo record verification|photo session refresh|photo user verification|photo record insert|photo record update) timed out$/.test(message)) return "photo_record_timeout";
  if (/^photo (?:progress recovery|progress|recipients|visibility|recipient cleanup|private fallback|notification completion|share options) timed out$/.test(message)) return "photo_stage_timeout";
  if (/^photo (?:upload|download verification) timed out$/.test(message)) return "photo_storage_timeout";
  if (read(value, "isAcquireTimeout") === true || /^(?:Navigator|Process)LockAcquireTimeoutError$/.test(string(name)) || /(?:Navigator LockManager|LockManager lock)/.test(message)) return "auth_lock";
  if (name === "TimeoutError" || /^TimeoutError: /.test(message)) return "request_timeout";
  if (name === "AbortError" || /^AbortError: /.test(message)) return "request_aborted";
  if (/^ResizeObserver loop (?:limit exceeded|completed with undelivered notifications\.?)/.test(message)) return "resize_observer";
  if (/^Script error\.?$/.test(message)) return "script_redacted";
  if (name === "ChunkLoadError" || /^Loading chunk [0-9]+ failed/.test(message)) return "chunk_load";
  if (name === "AuthSessionMissingError" || /^(?:Auth session missing!?|not authenticated)$/i.test(message)) return "auth_session";
  if (/^(?:Invalid Refresh Token|Refresh Token Not Found|Refresh Token Already Used)/i.test(message)) return "auth_refresh";
  if (name === "NetworkError" || name === "AuthRetryableFetchError" || /^(?:TypeError: )?(?:Failed to fetch|Load failed|Network request failed|NetworkError when attempting to fetch resource\.?)$/i.test(message)) return "network_fetch";
  if (name === "ReferenceError" || /^ReferenceError: /.test(message)) return "js_reference";
  if (name === "TypeError" || /^TypeError: /.test(message)) return "js_type";
  if (name === "SyntaxError" || /^(?:Uncaught )?SyntaxError: /.test(message)) {
    const syntaxMessage = message.replace(/^(?:Uncaught )?SyntaxError: /, "");
    // "Unexpected token" also describes JavaScript source errors. Only known
    // JSON parser wording supports the more specific JSON classification.
    return /^(?:JSON\.parse|JSON Parse error):|\bin JSON at (?:position \d+|line \d+ column \d+)|\bUnexpected end of JSON input\b|\bis not valid JSON\b/i.test(syntaxMessage)
      ? "json_parse" : "js_syntax";
  }
  if (name === "QuotaExceededError") return "storage_quota";
  const code = string(read(value, "code"));
  if (/^(?:[0-9][0-9A-Z]{4}|PGRST[0-9]{3})$/.test(code)) return "database";
  const status = read(value, "status") ?? read(value, "statusCode");
  if (typeof status === "number" && status >= 400 && status <= 599) return "http_error";
  return "unknown";
}

function route(): string {
  try {
    const routes: Record<string, string> = {
      "/": "home", "/qt": "qt", "/qt/write": "qt_write", "/qt/photo": "qt_photo",
      "/qt/complete": "qt_complete", "/qt/record": "qt_record", "/prayer": "prayer",
      "/profile": "profile", "/community": "community", "/login": "login",
    };
    return routes[window.location.pathname] ?? "other";
  } catch { return "other"; }
}

type Position = { script: string; line: number; column: number };
function position(filename: unknown, line: unknown, column: unknown): Position | null {
  try {
    if (typeof filename !== "string" || filename.length > 2048 || typeof window === "undefined") return null;
    const url = new URL(filename, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith("/_next/static/chunks/")) return null;
    const script = sanitizeObservationScript(url.pathname.split("/").pop());
    const lineNumber = Number(line), columnNumber = Number(column);
    if (!script || !Number.isInteger(lineNumber) || !Number.isInteger(columnNumber) || lineNumber < 1 || columnNumber < 1 || lineNumber > 10000000 || columnNumber > 10000000) return null;
    return { script, line: lineNumber, column: columnNumber };
  } catch { return null; }
}

function stackPositions(value: unknown): Position[] {
  const stack = string(read(value, "stack"), 8000);
  const result: Position[] = [];
  // V8 and WebKit frame locations. Drop function names, URL hosts/query data,
  // messages and all paths that are not same-origin production chunk assets.
  const pattern = /((?:https?:\/\/[^\s@()]+)?\/_next\/static\/chunks\/[^\s()]+?):([0-9]+):([0-9]+)(?:\)?\s*(?:\n|$))/g;
  for (const match of stack.matchAll(pattern)) {
    const frame = position(match[1], match[2], match[3]);
    if (frame) result.push(frame);
    if (result.length >= 2) break;
  }
  return result;
}

/** Bounded, synchronous diagnostics. Works for wrapped errors and ErrorEvents
 * without event.error; cannot affect the original exception or app operation. */
export function observationErrorDetails(error: unknown, context: ObservationErrorContext = {}): ObservationDetails & { error_code: string } {
  const minimal = { error_code: "unknown" };
  try {
    const chain: unknown[] = [error];
    const seen = new Set<unknown>([error]);
    for (let depth = 0; depth < 3; depth += 1) {
      const previous = chain[chain.length - 1];
      const cause = read(previous, "causeValue") ?? read(previous, "cause");
      if (cause == null || seen.has(cause)) break;
      chain.push(cause); seen.add(cause);
    }
    let selected = chain[chain.length - 1];
    let errorKind = kind(selected, context.message);
    // A wrapper's cause is the useful failure, e.g. a PostgREST code or fetch
    // error inside QTPhotoRecordError('load_failed').
    for (const value of [...chain].reverse()) {
      const candidate = kind(value);
      if (candidate !== "unknown") { selected = value; errorKind = candidate; break; }
    }
    const selectedCode = sanitizeObservationErrorCode(read(selected, "code"));
    const codes: Record<string, string> = {
      draft_timeout: "timeout", photo_record_timeout: "timeout", photo_stage_timeout: "timeout", photo_storage_timeout: "timeout", request_timeout: "timeout",
      request_aborted: "aborted", network_fetch: "network", auth_lock: "timeout", auth_session: "auth", auth_refresh: "auth", storage_quota: "storage",
    };
    const errorCode = selectedCode ?? codes[errorKind] ?? "unknown";
    const data: Record<string, unknown> = {
      diagnostic_version: 2, error_code: errorCode, error_kind: errorKind,
      error_name: string(read(error, "name")) || "unknown",
      error_present: error != null,
      message_present: !!string(read(error, "message") ?? (typeof error === "string" ? error : context.message)),
      route: route(),
    };
    if (typeof navigator !== "undefined") data.online = navigator.onLine;
    const wrapperCode = read(error, "code");
    if (read(error, "name") === "QTPhotoRecordError" || read(error, "name") === "QTPhotoStorageError") data.wrapper_code = wrapperCode;
    if (selected !== error) data.cause_name = string(read(selected, "name")) || "unknown";
    const status = read(selected, "status") ?? read(selected, "statusCode");
    if (typeof status === "number") data.http_status = status;
    const explicit = position(context.filename, context.lineno, context.colno);
    const frames = [...(explicit ? [explicit] : []), ...stackPositions(selected), ...(selected !== error ? stackPositions(error) : [])];
    const unique = frames.filter((frame, index) => frames.findIndex(other => other.script === frame.script && other.line === frame.line && other.column === frame.column) === index).slice(0, 2);
    for (const [index, frame] of unique.entries()) {
      const prefix = index === 0 ? "error" : "caller";
      data[`${prefix}_script`] = frame.script;
      data[`${prefix}_line`] = frame.line;
      data[`${prefix}_column`] = frame.column;
    }
    return { ...sanitizeObservationDetails(data), error_code: errorCode };
  } catch { return minimal; }
}
