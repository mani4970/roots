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

function checkEntryDates() {
  const modules = {};
  for (const name of ["date", "qtEntry"]) {
    const exports = {};
    const text = fs.readFileSync(path.join(root, `lib/${name}.ts`), "utf8");
    const { outputText } = ts.transpileModule(text, {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    });
    vm.runInNewContext(outputText, {
      exports, URLSearchParams,
      require(id) {
        assert.ok(id === "@/lib/date" || id === "./date", `Unexpected dependency: ${id}`);
        return modules.date;
      },
    });
    modules[name] = exports;
  }
  const today = "2026-09-06";
  const resolve = query => modules.qtEntry.resolveQTEntryDate(new URLSearchParams(query), today);
  for (const query of ["", "entry=home&date=2026-09-05", "entry=qt&resume=true&date=2026-09-05"]) {
    assert.deepEqual({ ...resolve(query) }, { date: today, isCatchUp: false }, "New and resumed entries use the device date");
  }
  assert.deepEqual({ ...resolve("editId=record-edit&entry=qt&catchup=true&date=2026-09-05") },
    { date: today, isCatchUp: false }, "The edit URL cannot supply the persisted record date");
  assert.deepEqual({ ...resolve("entry=qt&catchup=true&date=2026-09-05") },
    { date: "2026-09-05", isCatchUp: true }, "A selected past date stays fixed in catch-up");
  assert.deepEqual({ ...resolve("entry=qt&catchup=true&date=2024-02-29") },
    { date: "2024-02-29", isCatchUp: true }, "A real leap day is accepted");
  for (const query of [
    "entry=home&catchup=true&date=2026-09-05",
    "catchup=true&date=2026-09-05",
    "entry=qt&catchup=true",
    "entry=qt&catchup=true&date=2026-9-05",
    "entry=qt&catchup=true&date=2026-02-29",
    "entry=qt&catchup=true&date=2026-08-32",
    "entry=qt&catchup=true&date=2026-09-06",
    "entry=qt&catchup=true&date=2026-09-07",
  ]) assert.equal(resolve(query), null, `Invalid catch-up route is rejected: ${query}`);
}

function createContext(options = {}) {
  const today = options.today ?? "2026-09-06";
  const state = {
    rows: options.rows ?? [{ id: "draft-1", is_draft: true, meditation: "draft text" }],
    routes: [], queries: [], notices: [], recipients: [], progress: [], savedSnapshots: [], observations: [],
    challengeCaptures: [], challengeCompletions: [], shareBadgeChecks: [], homeReturns: [],
    adventCaptures: [], adventCompletions: [],
    recipientsFailures: options.recipientsFailures ?? 0,
    progressFailures: options.progressFailures ?? 0,
    removed: 0, bodyWrites: 0,
  };
  const context = {
    console: { warn() {}, error() {} },
    beginObservation: () => null, rememberObservationFlow() {},
    observe: (_flow, event, details) => state.observations.push({ event, details }),
    observationError: error => error?.code ? { error_code: error.code } : {},
    getCompletionObservation: () => null, completionObservationRef: { current: null },
    completionRetryRef: { current: false }, retryToastObservationRef: { current: null },
    setTimeout, clearTimeout,
    window: { clearTimeout },
    saving: false, completionSavingRef: { current: false },
    pendingCompletionRef: { current: null },
    completionShareRecordRef: { current: null }, completionHomeReturnRef: { current: null },
    resumePendingRef: { current: null }, resumeGenerationRef: { current: 0 },
    autoSaveTimerRef: { current: null }, draftSaveChainRef: { current: Promise.resolve() },
    selectedDate: options.date ?? today, todayStr: today,
    savedEditDate: options.edit && !Object.hasOwn(options, "savedEditDate")
      ? options.date ?? "2026-09-06" : options.savedEditDate ?? null,
    mode: options.mode ?? "free", selectedTranslation: 92, cur: 5,
    freeText: "My saved reflection", decisions: ["My decision"], answers: {},
    bibleRef: "John 1:1", keyVerse: "1 Beginning", passages: [{ ref: "John 1:1" }],
    passageVerses: [{ num: 1, text: "Beginning" }], selectedVerseNums: ["1"],
    sermonTitle: "", lang: "ko", isEditMode: options.edit === true,
    editId: options.edit ? "record-edit" : null,
    draftBackupUserId: "user-1", hasSchedule: false,
    latestDraftSnapshotRef: { current: null }, lastLocalBackupSignatureRef: { current: "" },
    router: { push: url => state.routes.push(url), replace: url => state.routes.push(url) },
    leaveAfterSave: action => action(),
    getLocalDateString: () => today,
    nextDraftClientUpdatedAt: () => "2026-09-06T12:00:00.000Z",
    getQtDraftSessionUser: async () => ({ id: "user-1" }),
    t: value => value, trQT: value => value, trQTVars: value => value,
    showToast: value => state.notices.push(value),
    setCompleteShareTargets() {},
    saveQTDraftBackup: snapshot => { state.savedSnapshots.push(snapshot); return true; },
    loadQTDraftBackup: () => state.savedSnapshots.at(-1),
    removeQTDraftBackup: () => { state.removed += 1; },
    syncQtCompletionRecipients: async (_client, id, owner, recipients) => {
      state.recipients.push({ id, owner, recipients: [...recipients] });
      if (state.recipientsFailures-- > 0) throw new Error("Simulated recipient network failure");
    },
    recordProgressBeforeCompletion: async (_client, user, recordId) => {
      state.progress.push({ user, recordId });
      return !(state.progressFailures-- > 0);
    },
    recordBibleReflectionProgress: async (_client, user, date) => { state.progress.push({ user, date }); },
    withQtDraftTimeout: promise => promise,
    markBibleReflectionCompletedForNotifications: async () => {},
    createBibleReflectionShareNotificationsBestEffort: async () => {},
    // Imported service boundaries stay offline; retain their inputs so the
    // actual writer's completion ordering and retry snapshot can be checked.
    capturePersonalChallengeCompletion: (userId, completionDate) => {
      const proof = options.personalChallengeContext ?? null;
      state.challengeCaptures.push({ userId, completionDate, proof });
      return proof;
    },
    recordPersonalChallengeReflectionCompletedBestEffort: async (_client, userId, date, recordId, proof) => {
      state.challengeCompletions.push({ userId, date, recordId, proof });
    },
    captureAdventCompletion: (userId, completionDate) => {
      const proof = completionDate === today ? options.adventCompletion ?? null : null;
      state.adventCaptures.push({ userId, completionDate, proof });
      return proof;
    },
    recordAdventCompletion: (_client, userId, date, recordId, utcOffsetMinutes) => {
      state.adventCompletions.push({ userId, date, recordId, utcOffsetMinutes });
      return options.adventRequest ?? Promise.resolve(true);
    },
    checkAndAwardQtShareBadges: async (_client, userId) => { state.shareBadgeChecks.push(userId); },
    markPostReflectionHomeReturn: completion => { state.homeReturns.push(completion); },
  };
  for (const [setter, name] of Object.entries({
    setChapter: "chapter", setStartV: "startV", setEndV: "endV", setEndChapter: "endChapter", setCrossChapter: "crossChapter",
    setCompletionReady: "completionReady", setSaving: "saving", setPendingCompletion: "pendingCompletion", setShowCompleteSharePrompt: "showCompleteSharePrompt",
    setBibleStep: "bibleStep", setPassageVerses: "passageVerses", setBibleRef: "bibleRef",
    setPassages: "passages", setKeyVerse: "keyVerse", setSelectedVerseNums: "selectedVerseNums",
    setPassageExpanded: "passageExpanded",
    setBibleError: "bibleError", setFreeText: "freeText", setDecisions: "decisions",
  })) context[setter] = value => { context[name] = value; };

  function query(table) {
    let operation = "read", payload, single = false;
    const filters = {};
    return {
      select() { return this; }, eq(key, value) { filters[key] = value; return this; },
      order() { return this; }, single() { single = true; return this; }, maybeSingle() { single = true; return this; },
      update(value) { operation = "update"; payload = value; return this; },
      insert(value) { operation = "insert"; payload = value; return this; },
      then(resolve, reject) {
        state.queries.push({ table, operation, payload, filters });
        if (operation !== "read" && payload.meditation !== undefined) state.bodyWrites += 1;
        if (operation === "insert") state.rows.push({ ...payload, id: "inserted-1" });
        if (operation === "update") {
          if (filters.id === "record-edit" && options.editError) {
            return Promise.resolve({ data: null, error: options.editError }).then(resolve, reject);
          }
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
    "handleChapterChange", "getDraftSnapshot", "getDraftSignature", "hasDraftContent", "persistDraftBackup",
    "buildStandardBibleRef", "buildCompleteRecordData", "buildSundayBibleRef", "rememberPendingCompletion", "finishPendingCompletion",
    "cancelDeferredResume", "returnHomeAfterCompletion", "isCompletedQtDateConflict", "observeSaveFailure", "save",
  ]) vm.runInContext(extract(name), context);
  if (options.useRealDateProgress) vm.runInContext(extract("recordProgressBeforeCompletion"), context);
  return { state, context };
}

async function run() {
  checkEntryDates();
  {
    const { context, state } = createContext();
    context.handleChapterChange("2");
    assert.equal(context.freeText, "My saved reflection", "Previous preserves free reflection");
    assert.deepEqual(context.decisions, ["My decision"], "Previous preserves decisions");
    assert.equal(context.chapter, "2");
    assert.equal(context.startV, "1");
    assert.equal(context.endV, "1");
    assert.equal(context.persistDraftBackup(), true);
    assert.equal(state.removed, 0, "Returning to selection does not remove today's backup");
    assert.equal(state.savedSnapshots[0].freeText, "My saved reflection");
    assert.equal(state.savedSnapshots[0].decisions[0], "My decision");
  }
  for (const mode of ["free", "6step", "sunday"]) {
    const proof = Object.freeze({ userId: "user-1", completionDate: "2026-09-06", utcOffsetMinutes: 0, capturedAt: "2026-09-06T12:00:00.000Z" });
    const { context, state } = createContext({ mode, recipientsFailures: 1, personalChallengeContext: proof });
    context.answers = { meditation: "My saved reflection", closing_prayer: "Prayer" };
    context.resumePendingRef.current = { context: "pending foreground draft" };
    const targets = ["partner-a"];
    await context.save({ visibility: "group-a", partnerRecipientIds: targets });
    assert.equal(context.resumePendingRef.current, null, "Completion cancels deferred draft resumption");
    assert.equal(context.resumeGenerationRef.current, 1, "Already queued draft guards become invalid");
    assert.equal(state.rows[0].is_draft, false);
    assert(context.pendingCompletionRef.current?.failed, "Committed record enters explicit recovery state");
    assert.equal(state.routes.length, 0, "Do not navigate before progress");
    assert.notEqual(context.completionReady, true, "Do not complete before progress");
    assert.equal(state.bodyWrites, 1);
    assert.equal(state.removed, 0);
    assert.equal(state.challengeCompletions.length, 0, "Challenge completion waits for the existing progress gate");
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
    assert.equal(state.challengeCaptures.length, 1, "Retry reuses the context captured before the saved body");
    assert.equal(state.challengeCompletions.length, 1);
    assert.equal(state.challengeCompletions[0].proof, state.challengeCaptures[0].proof);
    assert.equal(context.completionShareRecordRef.current.meditation, "My saved reflection", "Share preview retains the committed body on retry");
    assert.equal(context.completionReady, true, "Existing in-page completion screen is ready");
    context.returnHomeAfterCompletion();
    assert.equal(state.homeReturns.length, 1, "Confirmed completion carries its record back to Home");
    assert.equal(state.homeReturns[0].qtRecordId, "draft-1");
    assert.equal(state.routes.at(-1), "/");
    context.returnHomeAfterCompletion();
    assert.equal(state.homeReturns.length, 1, "The same completion handoff is consumed once");
  }
  {
    const completion = { completionDate: "2026-12-05", utcOffsetMinutes: -60 };
    const { context, state } = createContext({
      today: completion.completionDate,
      recipientsFailures: 1,
      progressFailures: 1,
      adventCompletion: completion,
      adventRequest: new Promise(() => {}),
    });
    await context.save({ visibility: "private", partnerRecipientIds: [] });
    assert.equal(state.adventCompletions.length, 0, "No Advent credit before sharing is committed");
    await context.save();
    assert.equal(state.adventCompletions.length, 0, "No Advent credit after failed progress");
    let timeout;
    try {
      const completedBeforeAdvent = await Promise.race([
        context.save().then(() => true),
        new Promise(resolve => { timeout = setTimeout(() => resolve(false), 1500); }),
      ]);
      assert.equal(completedBeforeAdvent, true, "Advent recording never delays QT completion");
    } finally { clearTimeout(timeout); }
    assert.equal(context.completionReady, true);
    assert.equal(state.adventCaptures.length, 1);
    assert.deepEqual(state.adventCompletions, [{ userId: "user-1", date: completion.completionDate, recordId: "draft-1", utcOffsetMinutes: -60 }]);
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
    assert.equal(context.completionReady, true, "Existing in-page completion screen is ready");
  }
  {
    const { context, state } = createContext({ date: "2026-09-05", recipientsFailures: 1, useRealDateProgress: true });
    assert.equal(context.persistDraftBackup(), false, "No past-date draft mechanism is added");
    await context.save({ visibility: "private", partnerRecipientIds: [] });
    await context.save();
    assert.equal(state.bodyWrites, 1);
    assert.equal(state.rows[0].date, "2026-09-05", "The saved record uses the selected catch-up date");
    assert.equal(state.progress.length, 0, "A past date does not write today's progress");
    assert.equal(state.adventCompletions.length, 0, "A past date does not unlock Advent gifts");
    assert.equal(context.completionReady, true, "Same saved past-date record can finish failed sharing");
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
    const completed = { id: "past-existing", date: "2026-09-05", is_draft: false, meditation: "Already completed yesterday" };
    const { context, state } = createContext({ date: completed.date, rows: [{ ...completed }] });
    await context.save({ visibility: "private" });
    assert.equal(state.bodyWrites, 0, "A past entry completed elsewhere after the picker loaded is not overwritten");
    assert.deepEqual(state.rows, [completed]);
    assert.equal(state.progress.length, 0);
    assert.equal(state.recipients.length, 0);
    assert.equal(state.routes.length, 0);
    assert.ok(state.notices.includes("이미 큐티 기록이 있어요"), "An existing past record gets a date notice");
  }
  for (const mode of ["free", "6step", "sunday"]) {
    const savedEditDate = "2026-07-01";
    const other = { id: "record-other", user_id: "user-1", is_draft: false, date: "2026-09-06", meditation: "Today's completed reflection" };
    const { context, state } = createContext({
      edit: true, mode, savedEditDate, date: other.date,
      rows: [{ id: "record-edit", user_id: "user-1", is_draft: false, date: savedEditDate, meditation: "Previous text" }, { ...other }],
    });
    context.answers = { meditation: "My saved reflection" };
    await context.save();
    assert.equal(state.bodyWrites, 1);
    const update = state.queries.find(query => query.operation === "update");
    assert.equal(update.table, "qt_records");
    assert.deepEqual(update.filters, { id: "record-edit", user_id: "user-1", is_draft: false });
    assert.equal(Object.hasOwn(update.payload, "date"), false, "An edit never sends a replacement date");
    assert.equal(Object.hasOwn(update.payload, "user_id"), false, "An edit never sends a replacement owner");
    assert.equal(state.rows[0].date, savedEditDate, "The persisted old date survives editing");
    assert.equal(state.rows[0].meditation, "My saved reflection");
    assert.deepEqual(state.rows[1], other, "Editing leaves the other day's record intact");
    assert.equal(state.progress.length, 0, "Editing does not award completion again");
    assert.equal(state.adventCaptures.length, 0, "Editing does not capture Advent eligibility");
    assert.equal(state.recipients.length, 0, "Editing does not repeat sharing");
    assert.equal(state.routes.at(-1), "/qt/record?id=record-edit");
  }
  {
    const { context, state } = createContext({ edit: true, savedEditDate: null });
    await context.save();
    assert.equal(state.queries.length, 0, "An edit needs the saved record before it can write");
    assert.deepEqual(state.notices, ["qt_record_error_load"]);
    assert.equal(state.routes.length, 0);
  }
  for (const { editError, isDateConflict } of [
    {
      editError: { code: "23505", message: 'duplicate key value violates unique constraint "uq_qt_records_one_completed_per_user_date"' },
      isDateConflict: true,
    },
    {
      editError: { code: "23505", message: "duplicate key", details: "Key (user_id, date)=(user-1, 2026-09-06) already exists." },
      isDateConflict: true,
    },
    {
      editError: { code: "23505", message: 'duplicate key value violates unique constraint "other_unique_index"', details: "Key (id)=(record-edit) already exists." },
      isDateConflict: false,
    },
    {
      editError: { code: "57014", message: "canceling statement due to statement timeout" },
      isDateConflict: false,
    },
  ]) {
    const row = { id: "record-edit", user_id: "user-1", is_draft: false, date: "2026-09-06", meditation: "Saved text" };
    const { context, state } = createContext({ edit: true, editError, rows: [{ ...row }] });
    await context.save();
    assert.deepEqual(state.notices, [isDateConflict ? "묵상 수정 날짜 충돌" : "저장에 실패했어요. 다시 시도해주세요."]);
    const failure = state.observations.find(item => item.event === "save_error");
    assert.equal(failure.details.phase, "edit_record");
    assert.equal(failure.details.reason, isDateConflict ? "duplicate_completed" : undefined);
    assert.equal(context.completionRetryRef.current, !isDateConflict);
    assert.equal(Boolean(context.retryToastObservationRef.current), !isDateConflict);
    assert.equal(context.freeText, "My saved reflection", "The editor keeps the unsaved text");
    assert.deepEqual(context.decisions, ["My decision"]);
    assert.deepEqual(state.rows, [row], "A rejected edit leaves the saved entry intact");
    assert.equal(state.routes.length, 0, "The editor stays open");
  }
  {
    const { context, state } = createContext();
    await Promise.all([context.save(), context.save()]);
    assert.equal(state.bodyWrites, 1, "Double clicks are serialized by the immediate completion lock");
  }
  assert(source.indexOf("if (pendingCompletion) {\n    return (") < source.indexOf("// ─── 자유형식 작성 화면"), "Committed recovery renders before editable forms");
  console.log("PASS writer protection: fixed entry dates, chapter change + backup, recipient/progress retries, Advent completion gate, past date + duplicate, fixed edit dates and date-error notice, double click");
}

run().catch(error => { console.error(error); process.exitCode = 1; });
