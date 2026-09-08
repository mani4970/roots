/* Offline regression checks using the real writer functions; no service calls. */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app/qt/write/page.tsx"), "utf8");
const ast = ts.createSourceFile("page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function extract(name, tree = ast) {
  let found;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert(found, `Missing actual function: ${name}`);
  return ts.transpileModule(found.getText(tree).replace(/^export /, ""), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None },
  }).outputText;
}

function createContext(options = {}) {
  const state = {
    rows: options.rows ?? [{ id: "draft-1", is_draft: true, meditation: "draft text" }],
    routes: [], queries: [], notices: [], recipients: [], progress: [], savedSnapshots: [],
    recipientsFailures: options.recipientsFailures ?? 0,
    progressFailures: options.progressFailures ?? 0,
    removed: 0, bodyWrites: 0,
  };
  const context = {
    console: { warn() {} },
    setTimeout, clearTimeout,
    window: { clearTimeout },
    saving: false, completionSavingRef: { current: false },
    pendingCompletionRef: { current: null },
    autoSaveTimerRef: { current: null }, draftSaveChainRef: { current: Promise.resolve() },
    selectedDate: options.date ?? "2026-09-06", todayStr: "2026-09-06",
    mode: options.mode ?? "free", selectedTranslation: 92, cur: 5,
    freeText: "My saved reflection", decisions: ["My decision"], answers: {},
    bibleRef: "John 1:1", keyVerse: "1 Beginning", passages: [{ ref: "John 1:1" }],
    passageVerses: [{ num: 1, text: "Beginning" }], selectedVerseNums: ["1"],
    sermonTitle: "", lang: "ko", isEditMode: options.edit === true,
    editId: options.edit ? "record-edit" : null,
    draftBackupUserId: "user-1", hasSchedule: false,
    latestDraftSnapshotRef: { current: null }, lastLocalBackupSignatureRef: { current: "" },
    router: { push: url => state.routes.push(url) },
    leaveAfterSave: action => action(),
    getLocalDateString: () => "2026-09-06",
    nextDraftClientUpdatedAt: () => "2026-09-06T12:00:00.000Z",
    getQtDraftSessionUser: async () => ({ id: "user-1" }),
    trQT: value => value, trQTVars: value => value,
    showToast: value => state.notices.push(value),
    setCompleteShareTargets() {},
    saveQTDraftBackup: snapshot => { state.savedSnapshots.push(snapshot); return true; },
    loadQTDraftBackup: () => state.savedSnapshots.at(-1),
    removeQTDraftBackup: () => { state.removed += 1; },
    replaceQtRecordRecipients: async (_client, id, owner, recipients) => {
      state.recipients.push({ id, owner, recipients: [...recipients] });
      if (state.recipientsFailures-- > 0) throw new Error("Simulated recipient network failure");
    },
    recordProgressBeforeCompletion: async (_client, user, recordId) => {
      state.progress.push({ user, recordId });
      return !(state.progressFailures-- > 0);
    },
    markBibleReflectionCompletedForNotifications: async () => {},
    createBibleReflectionShareNotificationsBestEffort: async () => {},
  };
  for (const [setter, name] of Object.entries({
    setSaving: "saving", setPendingCompletion: "pendingCompletion", setShowCompleteSharePrompt: "showCompleteSharePrompt",
    setBibleStep: "bibleStep", setPassageVerses: "passageVerses", setBibleRef: "bibleRef",
    setPassages: "passages", setKeyVerse: "keyVerse", setSelectedVerseNums: "selectedVerseNums",
    setPassageExpanded: "passageExpanded", setVersePreviewExpanded: "versePreviewExpanded",
    setBibleError: "bibleError", setFreeText: "freeText", setDecisions: "decisions",
  })) context[setter] = value => { context[name] = value; };

  function query(table) {
    let operation = "read", payload, single = false;
    const filters = {};
    return {
      select() { return this; }, eq(key, value) { filters[key] = value; return this; },
      order() { return this; }, single() { single = true; return this; },
      update(value) { operation = "update"; payload = value; return this; },
      insert(value) { operation = "insert"; payload = value; return this; },
      then(resolve, reject) {
        state.queries.push({ table, operation, payload, filters });
        if (operation !== "read" && payload.meditation !== undefined) state.bodyWrites += 1;
        if (operation === "insert") state.rows.push({ ...payload, id: "inserted-1" });
        if (operation === "update") {
          const row = state.rows.find(row => !filters.id || row.id === filters.id);
          if (row) Object.assign(row, payload);
        }
        const result = { data: single ? state.rows.find(row => !filters.id || row.id === filters.id) : state.rows.map(row => ({ ...row })), error: null };
        return Promise.resolve(result).then(resolve, reject);
      },
    };
  }
  context.createClient = () => ({ from: query });
  vm.createContext(context);
  const contentSource = fs.readFileSync(path.join(root, "lib/qtDraftContent.ts"), "utf8");
  const contentTree = ts.createSourceFile("content.ts", contentSource, ts.ScriptTarget.Latest, true);
  vm.runInContext(extract("hasMeaningfulQTWriteDraftContent", contentTree), context);
  for (const name of [
    "resetFreePassageSelection", "getDraftSnapshot", "getDraftSignature", "hasDraftContent", "persistDraftBackup",
    "buildCompleteRecordData", "buildSundayBibleRef", "rememberPendingCompletion", "finishPendingCompletion", "save",
  ]) vm.runInContext(extract(name), context);
  return { state, context };
}

async function run() {
  {
    const { context, state } = createContext();
    context.resetFreePassageSelection();
    assert.equal(context.freeText, "My saved reflection", "Previous preserves free reflection");
    assert.deepEqual(context.decisions, ["My decision"], "Previous preserves decisions");
    assert.equal(context.bibleStep, "select");
    assert.equal(context.keyVerse, "", "Old source selections reset with the source");
    assert.equal(context.persistDraftBackup(), true);
    assert.equal(state.removed, 0, "Returning to selection does not remove today's backup");
    assert.equal(state.savedSnapshots[0].freeText, "My saved reflection");
    assert.equal(state.savedSnapshots[0].decisions[0], "My decision");
  }
  for (const mode of ["free", "6step", "sunday"]) {
    const { context, state } = createContext({ mode, recipientsFailures: 1 });
    context.answers = { meditation: "My saved reflection", closing_prayer: "Prayer" };
    const targets = ["partner-a"];
    await context.save({ visibility: "group-a", partnerRecipientIds: targets });
    assert.equal(state.rows[0].is_draft, false);
    assert(context.pendingCompletionRef.current?.failed, "Committed record enters explicit recovery state");
    assert.equal(state.routes.length, 0, "Do not complete before progress");
    assert.equal(state.bodyWrites, 1);
    assert.equal(state.removed, 0);
    assert.equal(context.persistDraftBackup(), false, "Committed writer cannot recreate a draft");
    // A retry must ignore changed invocation arguments and preserve committed data.
    targets.push("partner-mutated");
    context.freeText = "UNSAVED CHANGE MUST NOT BE CLAIMED AS SAVED";
    await context.save({ visibility: "all", partnerRecipientIds: ["different-partner"] });
    assert.equal(state.bodyWrites, 1, "Retry does not rewrite a completed record");
    assert.equal(state.rows[0].meditation, "My saved reflection");
    assert.equal(state.recipients.length, 2);
    assert.equal(state.recipients[1].recipients.join(","), "partner-a", "Original target snapshot survives retry");
    assert.equal(state.progress.length, 1);
    assert.equal(state.routes.at(-1), "/qt/complete");
  }
  {
    const { context, state } = createContext({ progressFailures: 1 });
    await context.save({ visibility: "private", partnerRecipientIds: [] });
    assert.equal(state.recipients.length, 1);
    assert.equal(state.routes.length, 0);
    await context.save();
    assert.equal(state.recipients.length, 1, "Successful recipient stage is not repeated");
    assert.equal(state.progress.length, 2, "Only failed progress gate retries");
    assert.equal(state.bodyWrites, 1);
    assert.equal(state.routes.at(-1), "/qt/complete");
  }
  {
    const { context, state } = createContext({ date: "2026-09-05", recipientsFailures: 1 });
    assert.equal(context.persistDraftBackup(), false, "No past-date draft mechanism is added");
    await context.save({ visibility: "private", partnerRecipientIds: [] });
    await context.save();
    assert.equal(state.bodyWrites, 1);
    assert.equal(state.routes.at(-1), "/qt/complete", "Same saved past-date record can finish failed sharing");
    assert.equal(state.savedSnapshots.length, 0);
  }
  {
    const { context, state } = createContext({ rows: [{ id: "existing-1", is_draft: false, meditation: "Already completed" }], progressFailures: 1 });
    await context.save({ visibility: "private", partnerRecipientIds: [] });
    assert.equal(state.bodyWrites, 0, "An existing completed record is never overwritten");
    assert.equal(context.pendingCompletionRef.current.existingRecord, true);
    assert.equal(state.rows[0].meditation, "Already completed");
    assert.equal(state.progress.length, 0, "Collision stops for an explicit user choice");
    assert.equal(state.routes.length, 0);
    await context.save();
    assert.equal(state.progress.length, 1);
    assert.equal(state.routes.length, 0, "Failed gate stays on existing-record notice");
    await context.save();
    assert.equal(state.progress.length, 2);
    assert.equal(context.pendingCompletionRef.current.progressSaved, true);
    assert.equal(state.routes.length, 0, "Successful gate keeps collision notice visible until user chooses saved record");
    assert.equal(state.removed, 0, "Current draft backup is retained on collision");
    assert.equal(state.bodyWrites, 0);
  }
  {
    const { context, state } = createContext({ edit: true, rows: [{ id: "record-edit", is_draft: false }] });
    await context.save();
    assert.equal(state.bodyWrites, 1);
    assert.equal(state.progress.length, 0, "Editing does not award completion again");
    assert.equal(state.routes.at(-1), "/qt/record?id=record-edit");
  }
  {
    const { context, state } = createContext();
    await Promise.all([context.save(), context.save()]);
    assert.equal(state.bodyWrites, 1, "Double clicks are serialized by the immediate completion lock");
  }
  assert(source.indexOf("if (pendingCompletion) {\n    return (") < source.indexOf("// ─── 자유형식 작성 화면"), "Committed recovery renders before editable forms");
  console.log("PASS writer protection: free Previous + backup, all written modes, recipient/progress retries, past date, duplicate record, edit, double click");
}

run().catch(error => { console.error(error); process.exitCode = 1; });
