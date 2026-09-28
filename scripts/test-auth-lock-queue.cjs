/* Uses the installed Supabase navigatorLock and Node's real Web Locks API. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const sdk=require('@supabase/supabase-js');
const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/queuedAuthLock.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports,require:()=>sdk,Map,Promise});
const queue=m.exports.createQueuedAuthLock;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let checks=0;async function check(name,run){await run();checks++;console.log('PASS '+name);}
(async()=>{
 await check('same-client queue prevents the installed SDK from stealing its own active lock',async()=>{
  let inFlight=0,max=0;const lock=queue(sdk.navigatorLock);
  const tasks=[0,1,2].map(i=>lock('roots-test-local',25,async()=>{inFlight++;max=Math.max(max,inFlight);await delay(i===0?60:5);inFlight--;return i;}));
  assert.deepEqual(await Promise.all(tasks),[0,1,2]);assert.equal(max,1);
 });
 await check('zero-timeout calls fail immediately when queued and never run later',async()=>{
  const lock=queue(sdk.navigatorLock);let called=false;const first=lock('roots-test-zero',100,()=>delay(30));
  await assert.rejects(lock('roots-test-zero',0,async()=>{called=true;}),e=>e.isAcquireTimeout===true);
  await first;assert.equal(called,false);
 });
 await check('callback rejection does not poison subsequent calls',async()=>{
  const lock=queue(sdk.navigatorLock),failure=new Error('fixture');
  const first=lock('roots-test-error',100,async()=>{throw failure;});const second=lock('roots-test-error',100,async()=>7);
  await assert.rejects(first,e=>e===failure);assert.equal(await second,7);
 });
 await check('separate clients still use a common browser lock',async()=>{
  const a=queue(sdk.navigatorLock),b=queue(sdk.navigatorLock);let active=0,max=0;
  const work=async()=>{active++;max=Math.max(max,active);await delay(20);active--;};
  await Promise.all([a('roots-test-tabs',500,work),b('roots-test-tabs',500,work)]);assert.equal(max,1);
 });
 await check('different lock names do not block each other and negative timeout survives',async()=>{
  const calls=[];const lock=queue(async(name,timeout,fn)=>{calls.push([name,timeout]);return fn();});let release;
  const first=lock('one',-1,()=>new Promise(r=>release=r));await Promise.resolve();
  assert.equal(await lock('two',-1,async()=>2),2);release(1);assert.equal(await first,1);assert.deepEqual(calls,[['one',-1],['two',-1]]);
 });
 await check('installed Supabase login, simultaneous user/session reads, refresh and logout retain their outcomes',async()=>{
  const user={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'fixture@example.invalid'};
  const token=()=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000)})).toString('base64url'),'c2lnbmF0dXJl'].join('.');
  const data=()=>({access_token:token(),refresh_token:'fixture-refresh',expires_in:3600,token_type:'bearer',user});
  const storage=new Map(),changes=[];
  const client=sdk.createClient('https://fixture.invalid','mock',{auth:{storageKey:'roots-test-sdk',storage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,lock:queue(sdk.navigatorLock),lockAcquireTimeout:25},global:{fetch:async(url,init)=>{
   if(String(url).includes('/user')){await delay(60);return new Response(JSON.stringify(user),{status:200,headers:{'content-type':'application/json'}});}
   if(String(url).includes('/token')) return new Response(JSON.stringify(data()),{status:200,headers:{'content-type':'application/json'}});
   if(String(url).includes('/logout')) return new Response(null,{status:204});
   throw Error('Unexpected mocked endpoint');
  }}});
  const sub=client.auth.onAuthStateChange(event=>changes.push(event)).data.subscription;
  assert.equal((await client.auth.signInWithPassword({email:user.email,password:'fixture'})).error,null);
  const reads=await Promise.all([client.auth.getUser(),client.auth.getSession(),client.auth.getUser()]);
  assert.ok(reads.every(r=>r.error===null));assert.equal(reads[0].data.user.id,user.id);assert.equal(reads[1].data.session.user.id,user.id);
  assert.equal((await client.auth.refreshSession()).error,null);
  assert.equal((await client.auth.signOut()).error,null);assert.equal((await client.auth.getSession()).data.session,null);
  assert.ok(changes.includes('SIGNED_IN')&&changes.includes('TOKEN_REFRESHED')&&changes.includes('SIGNED_OUT'));
  sub.unsubscribe();await client.auth.stopAutoRefresh();
 });
 console.log(`${checks} auth queue checks passed with real Web Locks.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
