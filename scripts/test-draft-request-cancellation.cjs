const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {createClient}=require('@supabase/supabase-js');
const timers=new Map();let next=0,signal,requests=0;
const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/qtDraftSync.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports,AbortController,Promise,Date,Error,window:{setTimeout:(fn,ms)=>{timers.set(++next,{fn,ms});return next;},clearTimeout:id=>timers.delete(id)}});
const payload={date:'2026-09-28',clientUpdatedAt:'2026-09-28T12:00:00.000Z',qtMode:'free',currentStep:1,bibleVersion:'92',bibleRef:'fixture',keyVerse:'',openingPrayer:'',summary:'',meditation:'PRIVATE FIXTURE',application:'',decision:'',closingPrayer:''};
function client(fetch){return createClient('https://test.invalid','mock',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch}});}
(async()=>{
 const db=client(async(_url,init)=>{requests++;signal=init.signal;return new Promise((_r,reject)=>{const fail=()=>reject(new DOMException('aborted','AbortError'));if(signal.aborted)fail();else signal.addEventListener('abort',fail,{once:true});});});
 const save=m.exports.saveQtDraftAtomically(db,payload);const rejected=assert.rejects(save,/\[qt draft timeout\] save_own_qt_draft/);
 for(let i=0;i<50&&!signal;i++)await new Promise(r=>setImmediate(r));
 assert.ok(signal,'Real Supabase request received AbortSignal');assert.equal(signal.aborted,false);
 const timer=[...timers.values()].find(t=>t.ms===10000);assert.ok(timer);timer.fn();await rejected;assert.equal(signal.aborted,true);assert.equal(requests,1);console.log('PASS deadline aborts the real PostgREST request and preserves the draft timeout result');
 timers.clear();const ok=client(async()=>new Response(JSON.stringify({status:'saved',id:'fixture-record',updated_at:payload.clientUpdatedAt,draft_client_updated_at:payload.clientUpdatedAt}),{status:200,headers:{'content-type':'application/json'}}));
 const result=await m.exports.saveQtDraftAtomically(ok,payload);assert.equal(result.id,'fixture-record');assert.equal(timers.size,0);console.log('PASS success retains the RPC result and clears the deadline');
 console.log('2 real SDK cancellation checks passed; fetch is mocked. Server cancellation is not implied.');
})().catch(e=>{console.error(e);process.exitCode=1;});
