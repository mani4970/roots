/* Content-free observation client invariants. No real network, storage, or DB. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const QUEUE_KEY = 'roots_observation_queue_v1';
const NOW = Date.parse('2026-09-16T08:00:00.000Z');
const PRIVATE = 'DO_NOT_RECORD_PRIVATE_PRAYER_OR_TESTIMONY';
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function transpile(relative) {
  return ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    fileName: relative,
  }).outputText;
}
function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}
function harness(options = {}) {
  let time = NOW, nextUuid = 1, nextTimer = 1;
  const storage = new Map(options.storage || []), timers = new Map(), requests = [], posts = [];
  const listeners = new Map();
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [time])); }
    static now() { return time; }
  }
  const document = { visibilityState: 'visible', addEventListener: addListener, removeEventListener: removeListener };
  function addListener(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); }
  function removeListener(name, fn) { listeners.get(name)?.delete(fn); }
  const window = { location: { origin: 'https://roots.test', pathname: '/qt/write' }, addEventListener: addListener, removeEventListener: removeListener };
  const context = {
    Date: Clock, console, URL, TextEncoder, TextDecoder, Blob, AbortController,
    navigator: { userAgent: options.ua || 'Mozilla/5.0 Macintosh', maxTouchPoints: options.touch || 0, onLine: options.online !== false },
    document, window,
    crypto: { randomUUID: () => `aaaaaaaa-aaaa-4aaa-8aaa-${String(nextUuid++).padStart(12, '0')}` },
    sessionStorage: {
      getItem(key) { if (options.storageThrows) throw new Error(PRIVATE); return storage.get(key) ?? null; },
      setItem(key, value) { if (options.storageThrows) throw new Error(PRIVATE); storage.set(key, String(value)); },
      removeItem(key) { if (options.storageThrows) throw new Error(PRIVATE); storage.delete(key); },
    },
    setTimeout(fn, delay) { const id = nextTimer++; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const moduleCache = new Map();
  const exportsFor = (relative, mocks = {}) => {
    const exports = {};
    vm.runInNewContext(transpile(relative), {
      ...context, exports, module: { exports },
      require(name) {
        if (Object.prototype.hasOwnProperty.call(mocks, name)) return mocks[name];
        if (name === '@capacitor/core') return { Capacitor: { isNativePlatform: () => !!options.native, getPlatform: () => options.native || 'web' } };
        if (name === '@/lib/observationSchema') {
          if (!moduleCache.has(name)) moduleCache.set(name, exportsFor('lib/observationSchema.ts'));
          return moduleCache.get(name);
        }
        if (name === '@/lib/observationErrorDetails') {
          if (!moduleCache.has(name)) moduleCache.set(name, exportsFor('lib/observationErrorDetails.ts'));
          return moduleCache.get(name);
        }
        throw new Error(`Unexpected test import: ${name}`);
      },
    }, { filename: relative });
    return exports;
  };
  const campaign = () => ({ enabled: true, build_tag: 'obs-20260916-v1', starts_at: new Date(time - 1000).toISOString(), ends_at: new Date(time + 3600000).toISOString() });
  const state = { fetch: null };
  context.fetch = async (url, init = {}) => {
    const request = { url, ...init };
    requests.push(request);
    if (init.method === 'POST') posts.push(JSON.parse(init.body));
    if (state.fetch) return state.fetch(request);
    return response(init.method === 'POST' ? { ok: true } : campaign());
  };
  const sdk = exportsFor('lib/appObservation.ts');
  return {
    sdk, state, context, storage, posts, requests, timers, listeners, exportsFor, campaign,
    advance(ms) { time += ms; },
    queue() { return JSON.parse(storage.get(QUEUE_KEY) || '[]'); },
    async drain(limit = 15) { for (let i = 0; i < limit; i++) await sdk.flushObservations(); },
  };
}
const cases = [];
function test(name, fn) { cases.push({ name, fn }); }

test('delivery exceptions stay out of business callers and methods remain synchronous', async () => {
  const h = harness({ storageThrows: true, online: false });
  h.state.fetch = async () => { throw new Error(PRIVATE); };
  let businessCompleted = false;
  assert.doesNotThrow(() => {
    h.sdk.setObservationUser(USER_A);
    const flow = h.sdk.beginObservation('qt_write', USER_A, { mode: 'free' });
    assert.equal(h.sdk.observe(flow, 'save_requested'), undefined);
    businessCompleted = true;
  });
  assert.equal(businessCompleted, true);
  await assert.doesNotReject(h.sdk.flushObservations());
  const diagnostic = h.sdk.observationError(new Error(PRIVATE));
  assert.equal(diagnostic.error_code, 'unknown');
  assert.equal(diagnostic.error_name, 'Error');
  assert.ok(!JSON.stringify(diagnostic).includes(PRIVATE));
  const badError = Object.defineProperty({}, 'code', { get() { throw new Error(PRIVATE); } });
  assert.doesNotThrow(() => h.sdk.observationError(badError));
});

test('malformed sessionStorage and denied storage do not block delivery', async () => {
  for (const options of [{ storage: [[QUEUE_KEY, '{broken']] }, { storageThrows: true }, { storage: [[QUEUE_KEY, JSON.stringify([null, {}, { userId: USER_A, event: { content: PRIVATE } }])]] }]) {
    const h = harness(options);
    h.sdk.setObservationUser(USER_A);
    const flow = h.sdk.beginObservation('prayer', USER_A);
    h.sdk.observe(flow, 'action_started', { mode: 'create' });
    await h.sdk.flushObservations();
    assert.ok(h.posts.length);
    assert.ok(h.posts.flatMap(p => p.events).some(e => e.event_name === 'action_started'));
    assert.ok(!JSON.stringify(h.posts).includes(PRIVATE));
  }
});

test('failed delivery replays identical UUIDs and payloads for server idempotency', async () => {
  const h = harness();
  let fail = true;
  h.state.fetch = async request => {
    if (request.method !== 'POST') return response(h.campaign());
    if (fail) { fail = false; throw new Error(PRIVATE); }
    return response({ ok: true });
  };
  h.sdk.setObservationUser(USER_A);
  const flow = h.sdk.beginObservation('qt_write', USER_A, { mode: 'free' });
  h.sdk.observe(flow, 'save_error', { error_code: '42501' });
  await h.sdk.flushObservations();
  await h.sdk.flushObservations();
  assert.equal(h.posts.length, 2);
  assert.deepEqual(h.posts[1], h.posts[0]);
  assert.equal(h.queue().length, 0);
});

test('old account events cannot be sent under a new account after in-flight config', async () => {
  const h = harness(), pending = deferred();
  let first = true;
  h.state.fetch = async request => {
    if (request.method === 'POST') return response({ ok: true });
    if (first) { first = false; return pending.promise; }
    return response(h.campaign());
  };
  h.sdk.setObservationUser(USER_A);
  const oldFlow = h.sdk.beginObservation('qt_write', USER_A);
  const oldIds = new Set(h.queue().map(row => row.event.event_id));
  const flushing = h.sdk.flushObservations();
  h.sdk.setObservationUser(USER_B);
  // An old async save can finish after sign-in changed.
  h.sdk.observe(oldFlow, 'save_ok');
  pending.resolve(response(h.campaign()));
  await flushing;
  await h.drain(3);
  assert.ok(h.posts.some(post => post.user_id === USER_B));
  for (const post of h.posts.filter(post => post.user_id === USER_B)) {
    assert.ok(post.events.every(event => !oldIds.has(event.event_id) && event.flow_id !== oldFlow.id));
  }
});

test('a stale disabled POST response cannot discard the new account queue', async () => {
  const h = harness(), pending = deferred(), entered = deferred();
  let oldPost = true;
  h.state.fetch = async request => {
    if (request.method !== 'POST') return response(h.campaign());
    if (oldPost) { oldPost = false; entered.resolve(); return pending.promise; }
    return response({ ok: true });
  };
  h.sdk.setObservationUser(USER_A);
  const flushing = h.sdk.flushObservations();
  await entered.promise;
  h.sdk.setObservationUser(USER_B);
  const nextFlow = h.sdk.beginObservation('qt_photo', USER_B);
  h.sdk.observe(nextFlow, 'save_requested');
  pending.resolve(response({ disabled: true }));
  await flushing;
  await h.drain(3);
  assert.ok(h.posts.some(post => post.user_id === USER_B && post.events.some(event => event.flow_id === nextFlow.id)));
});

test('an old async save cannot join a new user batch while its config is loading', async () => {
  const h = harness(), pending = deferred();
  h.sdk.setObservationUser(USER_A);
  const oldFlow = h.sdk.beginObservation('qt_write', USER_A);
  h.sdk.setObservationUser(USER_B);
  h.state.fetch = async request => request.method === 'POST' ? response({ ok: true }) : pending.promise;
  const flushing = h.sdk.flushObservations();
  h.sdk.observe(oldFlow, 'save_ok');
  pending.resolve(response(h.campaign()));
  await flushing;
  assert.ok(h.posts.length);
  assert.ok(h.posts.every(post => post.user_id === USER_B && post.events.every(event => event.flow_id !== oldFlow.id)));
});

test('account changes during response JSON parsing cannot clear new user events', async () => {
  const h = harness(), pending = deferred(), entered = deferred();
  let oldPost = true;
  h.state.fetch = async request => {
    if (request.method !== 'POST') return response(h.campaign());
    if (oldPost) {
      oldPost = false;
      return {ok:true,status:200,json:()=>{entered.resolve();return pending.promise;}};
    }
    return response({ok:true});
  };
  h.sdk.setObservationUser(USER_A);
  const flushing = h.sdk.flushObservations();
  await entered.promise;
  h.sdk.setObservationUser(USER_B);
  const flow = h.sdk.beginObservation('prayer', USER_B);
  h.sdk.observe(flow, 'action_started', {mode:'create'});
  pending.resolve({disabled:true});
  await flushing;
  await h.drain(3);
  assert.ok(h.posts.some(post=>post.user_id===USER_B && post.events.some(event=>event.flow_id===flow.id)));
});

test('queue is bounded at 120 and reports overflow instead of hiding loss', async () => {
  const h = harness();
  h.sdk.setObservationUser(USER_A);
  const flow = h.sdk.beginObservation('qt_write', USER_A);
  for (let i = 0; i < 170; i++) h.sdk.observe(flow, 'save_requested', { attempt: i });
  assert.ok(h.queue().length <= 120);
  await h.drain();
  const dropped = h.posts.flatMap(post => post.events).filter(event => event.event_name === 'telemetry_dropped');
  assert.ok(dropped.some(event => event.details.count > 0));
});

test('exhausted delivery attempts report loss when the network recovers', async () => {
  const h = harness();
  let fail = true;
  h.state.fetch = async request => request.method === 'POST' && fail ? response({}, 500) : response(request.method === 'POST' ? { ok: true } : h.campaign());
  h.sdk.setObservationUser(USER_A);
  const flow = h.sdk.beginObservation('qt_write', USER_A);
  h.sdk.observe(flow, 'save_requested');
  await h.drain(4);
  fail = false;
  h.sdk.observe(flow, 'completion_ready');
  await h.drain();
  assert.ok(h.posts.flatMap(post => post.events).some(event => event.event_name === 'telemetry_dropped' && event.details.count > 0));
});

test('every POST stays below 28 KiB even with the largest allowlisted details', async () => {
  const h = harness();
  h.sdk.setObservationUser(USER_A);
  const flow = h.sdk.beginObservation('qt_write', USER_A);
  const details = { mode:'6step', phase:'daily_completion', source:'completion_screen', reason:'newer_server_snapshot', reward_kind:'companion_announcement', action:'confirm', measurement:'dom_layout', outcome:'already_seen', error_code:'PGRST999' };
  for (const key of ['updated','eligible','foreground','interrupted','reduced_motion','automatic','recovery','persisted','past_date','retry','local_backup','existing_record','sharing_failed']) details[key] = true;
  for (const key of ['streak_days','total_days','count','attempt','upload_attempt','progress_days']) details[key] = 1000000;
  for (let i = 0; i < 45; i++) h.sdk.observe(flow, 'save_requested', details);
  await h.drain();
  const posts = h.requests.filter(request => request.method === 'POST');
  assert.ok(posts.length > 1);
  for (const post of posts) assert.ok(Buffer.byteLength(post.body, 'utf8') <= 28 * 1024, `oversize POST: ${Buffer.byteLength(post.body)} bytes`);
});

test('raw writing, messages, paths, recipient IDs and invalid error codes are removed', async () => {
  const h = harness();
  h.sdk.setObservationUser(USER_A);
  const flow = h.sdk.beginObservation('prayer', USER_A);
  h.sdk.observe(flow, 'action_failed', { mode:'create', phase:'body', error_code:PRIVATE, content:PRIVATE, testimony:PRIVATE, message:PRIVATE, email:PRIVATE, filename:PRIVATE, recipient_id:USER_B, source:PRIVATE });
  h.sdk.reportObservationClientError('unhandled_rejection', new Error(PRIVATE));
  h.sdk.observe(flow, PRIVATE, { mode:'create' });
  await h.sdk.flushObservations();
  const serialized = JSON.stringify(h.posts);
  assert.ok(!serialized.includes(PRIVATE));
  assert.ok(!serialized.includes(USER_B));
  const event = h.posts.flatMap(post => post.events).find(event => event.event_name === 'action_failed');
  assert.deepEqual(Object.keys(event.details).sort(), ['foreground','interrupted','mode','phase']);
  assert.equal(h.sdk.observationError({ code:'HELLO' }).error_code, 'unknown');
});

test('resumed flows participate in background interruption tracking', async () => {
  const h = harness();
  h.sdk.setObservationUser(USER_A);
  const original = h.sdk.beginObservation('qt_write', USER_A);
  h.sdk.rememberObservationFlow(original, 'writer');
  const resumed = h.sdk.resumeObservationFlow('writer', USER_A);
  assert.ok(resumed);
  assert.equal(resumed.id, original.id);
  assert.equal(h.sdk.resumeObservationFlow('writer', USER_B), null);
  h.context.document.visibilityState = 'hidden';
  h.sdk.observationVisibilityChanged();
  assert.equal(resumed.interrupted, true);
  assert.equal(h.sdk.resumeObservationFlow('../bad', USER_A), null);
});

test('global error and visibility monitoring continues after a one-hour app session', async () => {
  const h = harness();
  h.sdk.setObservationUser(USER_A);
  const firstId = h.queue().find(row=>row.event.event_name==='app_ready').event.flow_id;
  await h.sdk.flushObservations();
  h.advance(60*60*1000+1);
  h.sdk.reportObservationClientError('unhandled_error', {code:'42501'});
  h.context.document.visibilityState = 'hidden';
  h.sdk.observationVisibilityChanged();
  await h.drain();
  const events = h.posts.flatMap(post=>post.events);
  const error = events.find(event=>event.event_name==='client_error');
  const background = events.find(event=>event.event_name==='app_backgrounded');
  assert.ok(error && background);
  assert.notEqual(error.flow_id, firstId);
  assert.equal(background.flow_id, error.flow_id);
  assert.equal(background.details.interrupted, true);
});

test('supported browser and native platforms always produce schema-accepted events', async () => {
  const samples = [
    [{ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X)'},'web-mac'],
    [{ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X)',touch:5},'web-ipad'],
    [{ua:'Mozilla/5.0 (iPad; CPU OS)'},'web-ipad'],
    [{ua:'Mozilla/5.0 (iPhone; CPU iPhone OS)'},'web-ios'],
    [{ua:'Mozilla/5.0 (Linux; Android 14)'},'web-android'],
    [{native:'ios',ua:'Mozilla/5.0 (iPad; CPU OS)',touch:5},'native-ipad'],
    [{native:'android',ua:'Android'},'native-android'],
    [{native:'unexpected'},'unknown'],
  ];
  for (const [options, expected] of samples) {
    const h = harness(options);
    h.sdk.setObservationUser(USER_A);
    await h.sdk.flushObservations();
    const ready = h.posts.flatMap(post => post.events).find(event => event.event_name === 'app_ready');
    assert.ok(ready, JSON.stringify(options));
    assert.equal(ready.client_kind, expected);
  }
});

function bridgeHarness(options = {}) {
  const h = harness(), session = deferred(), users = [], effects = [], errors = [];
  let authCallback, unsubscribed = false;
  const bridge = h.exportsFor('components/AppObservationBridge.tsx', {
    react: { useEffect(fn) { effects.push(fn); } },
    '@/lib/supabase': { createClient() {
      if (options.createThrows) throw new Error(PRIVATE);
      return { auth: {
        getSession: () => session.promise,
        onAuthStateChange(callback) { authCallback = callback; return { data: { subscription: { unsubscribe() { unsubscribed = true; if (options.unsubscribeThrows) throw new Error(PRIVATE); } } } }; },
      } };
    } },
    '@/lib/appObservation': { setObservationUser:user=>users.push(user), flushObservations:async()=>{}, observationVisibilityChanged(){}, reportObservationClientError:(...args)=>errors.push(args) },
  });
  assert.equal(bridge.default(), null);
  const cleanup = effects[0]();
  return { ...h, session, users, errors, cleanup, get unsubscribed(){return unsubscribed;}, auth:(user)=>authCallback('SIGNED_IN',user?{user:{id:user}}:null) };
}

test('bridge ignores initial getSession after a newer auth event', async () => {
  const h = bridgeHarness();
  h.auth(USER_B);
  h.session.resolve({data:{session:{user:{id:USER_A}}}});
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(h.users, [USER_B]);
  h.cleanup();
  assert.equal(h.unsubscribed, true);
  assert.ok(Array.from(h.listeners.values()).every(handlers=>handlers.size===0));
});

test('bridge startup/disposal failures and late session results do not affect the app', async () => {
  const startup = bridgeHarness({createThrows:true});
  assert.doesNotThrow(startup.cleanup);
  const h = bridgeHarness({unsubscribeThrows:true});
  assert.doesNotThrow(h.cleanup);
  h.session.resolve({data:{session:{user:{id:USER_A}}}});
  await Promise.resolve(); await Promise.resolve();
  assert.equal(h.users.length, 0);
});

test('abort, native timeout, application draft timeout and programming errors stay distinct', () => {
  const {sdk} = harness();
  for (const [input, code, kind] of [
    [{name:'AbortError', message:'The operation was aborted'}, 'aborted', 'request_aborted'],
    [{name:'TimeoutError'}, 'timeout', 'request_timeout'],
    [new Error('[qt draft timeout] save_own_qt_draft (10000ms)'), 'timeout', 'draft_timeout'],
    [new Error('completed photo record lookup timed out'), 'timeout', 'photo_record_timeout'],
    [new TypeError('Load failed'), 'network', 'network_fetch'],
    [new TypeError(PRIVATE), 'unknown', 'js_type'],
    [new ReferenceError(PRIVATE), 'unknown', 'js_reference'],
    [{code:'42501'}, '42501', 'database'],
    [{message:'TypeError: Failed to fetch',code:''}, 'network', 'network_fetch'],
  ]) {
    const d=sdk.observationError(input);
    assert.equal(d.error_code,code); assert.equal(d.error_kind,kind);
    assert.equal(d.diagnostic_version,2); assert.equal(d.route,'qt_write');
    assert.ok(!JSON.stringify(d).includes(PRIVATE));
  }
});

test('photo wrapper retains the underlying database or network failure', () => {
  const {sdk}=harness();
  for (const cause of [{code:'42501',message:PRIVATE}, new TypeError('Load failed')]) {
    const d=sdk.observationError({name:'QTPhotoRecordError',code:'load_failed',message:PRIVATE,causeValue:cause});
    assert.equal(d.wrapper_code,'load_failed');
    assert.equal(d.error_name,'QTPhotoRecordError');
    assert.ok(['42501','network'].includes(d.error_code));
    assert.ok(!JSON.stringify(d).includes(PRIVATE));
  }
});

test('photo storage upload and verification deadlines retain timeout diagnostics through wrappers', () => {
  const {sdk}=harness();
  for (const label of ['photo upload timed out','photo download verification timed out']) {
    const cause=new Error(label);
    for (const input of [cause,{name:'QTPhotoStorageError',code:'upload_failed',message:PRIVATE,causeValue:cause}]) {
      const d=sdk.observationError(input);
      assert.equal(d.error_code,'timeout');assert.equal(d.error_kind,'photo_storage_timeout');
      if(input!==cause) {
        assert.equal(d.error_name,'QTPhotoStorageError');assert.equal(d.wrapper_code,'upload_failed');
        assert.equal(d.cause_name,'Error');
      }
      assert.ok(!JSON.stringify(d).includes(PRIVATE));assert.ok(!JSON.stringify(d).includes(label));
    }
  }
});

test('syntax diagnostics distinguish JavaScript source errors from explicit JSON parser errors', () => {
  const {sdk}=harness();
  for (const [message,kind] of [
    ["Unexpected token ')'",'js_syntax'],
    ["Identifier 'JSON' has already been declared",'js_syntax'],
    ['JSON.parse: unexpected character at line 1 column 1 of the JSON data','json_parse'],
    ['JSON Parse error: Unexpected identifier "bad"','json_parse'],
    ['Unexpected end of JSON input','json_parse'],
    ['Expected property name or \'}\' in JSON at position 1 (line 1 column 2)','json_parse'],
    ['Unexpected token \'b\', "bad" is not valid JSON','json_parse'],
  ]) {
    assert.equal(sdk.observationError({name:'SyntaxError',message}).error_kind,kind);
    // Browser ErrorEvents may contain a message without an error object.
    const eventDetails=sdk.observationError(null,{message:'Uncaught SyntaxError: '+message});
    assert.equal(eventDetails.error_kind,kind);assert.equal(eventDetails.error_present,false);
    assert.ok(!JSON.stringify(eventDetails).includes(message));
  }
});

test('actual photo error names and fixed storage wrapper codes survive without arbitrary error text', () => {
  const {sdk}=harness();
  assert.equal(sdk.observationError({name:'QTPhotoPreparationError',message:PRIVATE}).error_name,'QTPhotoPreparationError');
  assert.equal(sdk.observationError({name:'QTPhotoStorageError',code:'upload_verification_failed',message:PRIVATE}).wrapper_code,'upload_verification_failed');
  const privateCode=sdk.observationError({name:'QTPhotoStorageError',code:PRIVATE,message:PRIVATE});
  assert.equal(privateCode.wrapper_code,undefined);assert.ok(!JSON.stringify(privateCode).includes(PRIVATE));
  assert.equal(sdk.observationError({name:'Error',code:'upload_failed'}).wrapper_code,undefined);
});

test('ErrorEvent without error keeps a safe category and exact asset position', async () => {
  const h=harness();h.sdk.setObservationUser(USER_A);
  h.sdk.reportObservationClientError('unhandled_error',null,{
    message:'ResizeObserver loop completed with undelivered notifications.',
    filename:'https://roots.test/_next/static/chunks/app/profile/page-0123456789abcdef.js?token='+PRIVATE,
    lineno:1,colno:19312,
  });
  const d=h.queue().find(row=>row.event.event_name==='client_error').event.details;
  assert.equal(d.error_kind,'resize_observer'); assert.equal(d.error_present,false);
  assert.equal(d.error_script,'page-0123456789abcdef.js');assert.equal(d.error_column,19312);
  assert.ok(!JSON.stringify(d).includes(PRIVATE));assert.ok(!JSON.stringify(d).includes('https'));
  await h.sdk.flushObservations();
  assert.equal(h.posts.flatMap(p=>p.events).find(e=>e.event_name==='client_error').details.error_column,19312);
});

test('bridge forwards browser location metadata even when event.error is absent', () => {
  const h=bridgeHarness();
  const event={error:null,message:'Script error.',filename:'https://roots.test/_next/static/chunks/1801-3121bf33b19d6848.js',lineno:1,colno:99};
  for(const fn of h.listeners.get('error')) fn(event);
  assert.equal(h.errors[0][1],null);assert.equal(h.errors[0][2].filename,event.filename);
  assert.equal(h.errors[0][2].message,'Script error.');h.cleanup();
});

test('only same-origin hashed bundle positions survive V8 and WebKit stacks', () => {
  const {sdk}=harness();
  for(const stack of [
    'Error: '+PRIVATE+'\n    at secret (https://roots.test/_next/static/chunks/1801-3121bf33b19d6848.js:1:420)\n    at other (https://roots.test/_next/static/chunks/2775.83b08f832fc1f708.js:2:550)',
    'secret@https://roots.test/_next/static/chunks/1801-3121bf33b19d6848.js:1:420\nother@https://roots.test/_next/static/chunks/2775.83b08f832fc1f708.js:2:550',
  ]) {
    const d=sdk.observationError({name:'Error',message:PRIVATE,stack});
    assert.equal(d.error_script,'1801-3121bf33b19d6848.js'); assert.equal(d.error_column,420);
    assert.equal(d.caller_script,'2775.83b08f832fc1f708.js');
    assert.ok(!JSON.stringify(d).includes(PRIVATE)); assert.ok(!JSON.stringify(d).includes('secret'));
  }
  for(const filename of ['https://other.test/_next/static/chunks/page-0123456789abcdef.js','https://roots.test/'+PRIVATE+'.js','https://roots.test/_next/static/chunks/'+PRIVATE+'.js']) {
    assert.equal(sdk.observationError(null,{filename,lineno:1,colno:2}).error_script,undefined);
  }
});

test('cyclic causes, throwing getters and private rejection strings cannot break callers or leak', () => {
  const {sdk}=harness();const cyclic={name:'Error',message:PRIVATE};cyclic.cause=cyclic;
  const bad=new Proxy({}, {get(){throw new Error(PRIVATE);}});
  for(const input of [cyclic,bad,PRIVATE,null,42]) {
    let d;assert.doesNotThrow(()=>{d=sdk.observationError(input);});
    assert.ok(!JSON.stringify(d).includes(PRIVATE));
  }
});

test('server schema rejects raw messages, source URLs, unknown names and invalid diagnostic positions', () => {
  const h=harness(),schema=h.exportsFor('lib/observationSchema.ts');
  const d=schema.sanitizeObservationDetails({diagnostic_version:2,error_name:PRIVATE,cause_name:PRIVATE,error_kind:PRIVATE,route:'/qt/record?body='+PRIVATE,error_script:'https://roots.test/'+PRIVATE,caller_script:PRIVATE,error_line:-1,error_column:Infinity,http_status:999,message:PRIVATE,stack:PRIVATE,online:true});
  assert.deepEqual(JSON.parse(JSON.stringify(d)),{diagnostic_version:2,online:true});
});

(async () => {
  let failed = 0;
  for (const {name, fn} of cases) {
    try { await fn(); process.stdout.write(`PASS ${name}\n`); }
    catch (error) { failed++; process.stderr.write(`FAIL ${name}\n${error.stack}\n`); }
  }
  process.stdout.write(`${cases.length-failed}/${cases.length} observation client checks passed\n`);
  process.exitCode = failed ? 1 : 0;
})();
