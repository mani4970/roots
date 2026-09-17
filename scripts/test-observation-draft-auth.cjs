/* Offline auth fallback contract: no database, network or account changes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'lib/qtDraftSync.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
function setup(session, user, diagnosticThrows = false) {
  const calls = [], failures = [], timers = new Map(); let timerId = 0;
  const module = { exports: {} };
  vm.runInNewContext(js, {
    exports: module.exports, module, Promise, Date, Error,
    require: () => { throw new Error('Unexpected runtime dependency'); },
    window: { setTimeout: (fn, ms) => { timers.set(++timerId, {fn, ms}); return timerId; }, clearTimeout: id => timers.delete(id) },
  });
  const supabase = { auth: {
    getSession: () => { calls.push('session'); return session(); },
    getUser: () => { calls.push('user'); return user(); },
  } };
  const result = module.exports.getQtDraftSessionUser(supabase, (stage, error) => {
    failures.push({stage, error}); if (diagnosticThrows) throw new Error('diagnostic failure');
  });
  return { calls, failures, timers, result };
}
const okUser = { id: 'test-user' };
const emptySession = () => Promise.resolve({data:{session:null},error:null});
const userSuccess = () => Promise.resolve({data:{user:okUser},error:null});
const ticks = async () => { for(let i=0;i<8;i++) await Promise.resolve(); };
let checks = 0;
async function check(name, run) { await run(); checks++; console.log('PASS '+name); }
(async () => {
  await check('cached session succeeds without an extra user request', async () => {
    const h=setup(()=>Promise.resolve({data:{session:{user:okUser}},error:null}), userSuccess);
    assert.equal(await h.result,okUser);assert.deepEqual(h.calls,['session']);assert.equal(h.failures.length,0);
  });
  await check('cached session failure preserves the existing user fallback', async () => {
    const failure=new TypeError('Load failed');
    const h=setup(()=>Promise.reject(failure),userSuccess);
    assert.equal(await h.result,okUser);assert.deepEqual(h.calls,['session','user']);
    assert.equal(h.failures[0].stage,'cached_session');assert.equal(h.failures[0].error,failure);
  });
  await check('final user lookup failure is preserved without changing the null result', async () => {
    const failure={code:'42501',message:'private diagnostic input'};
    const h=setup(emptySession,()=>Promise.resolve({data:{user:null},error:failure}));
    assert.equal(await h.result,null);assert.equal(h.failures.at(-1).stage,'user_check');assert.equal(h.failures.at(-1).error,failure);
  });
  await check('diagnostic callback failures cannot cancel auth fallback', async () => {
    const h=setup(()=>Promise.reject(new Error('failure')),userSuccess,true);
    assert.equal(await h.result,okUser);assert.deepEqual(h.calls,['session','user']);
  });
  await check('4s and 6s deadlines retain timing, fallback order and their diagnostic stages', async () => {
    const pending=()=>new Promise(()=>{});const h=setup(pending,pending);
    assert.equal([...h.timers.values()][0].ms,4000);[...h.timers.values()][0].fn();await ticks();
    const next=[...h.timers.values()].find(t=>t.ms===6000);assert.ok(next);next.fn();
    assert.equal(await h.result,null);assert.deepEqual(h.calls,['session','user']);
    assert.deepEqual(h.failures.map(f=>f.stage),['cached_session','user_check']);
    assert.ok(h.failures[1].error.message.includes('[qt draft timeout] auth.getUser (6000ms)'));
  });
  console.log(checks+' draft auth checks passed; no live calls.');
})().catch(error=>{console.error(error);process.exitCode=1;});
