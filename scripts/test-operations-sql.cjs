/* Real PostgreSQL engine in WASM. Isolated from Supabase; no network or credentials. */
const { PGlite } = require(process.env.OPS_PGLITE_MODULE || '@electric-sql/pglite');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
let checks=0;
async function main(){
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); grant usage on schema public to anon,authenticated,service_role;`);
 await db.exec(fs.readFileSync(path.join(root,'docs/operations/install.sql'),'utf8'));
 await db.exec(fs.readFileSync(path.join(root,'docs/operations/report-views.sql'),'utf8'));
 async function check(name,fn){await fn();checks++;console.log('PASS '+name);}
 const user='11111111-1111-4111-8111-111111111111',session='22222222-2222-4222-8222-222222222222',flow='33333333-3333-4333-8333-333333333333';
 const event=(id,name='save_error',time='2026-09-28T10:00:00Z',details={})=>({event_id:`aaaaaaaa-aaaa-4aaa-8aaa-${String(id).padStart(12,'0')}`,flow_id:flow,scope:'qt_write',event_name:name,client_kind:'web-desktop',build_tag:'obs-20260916-v1',record_id:null,client_at:time,elapsed_ms:100,details});
 const ingest=(events,owner=user)=>db.query('select public.ingest_app_ops($1,$2,$3,$4::jsonb) as result',[owner,session,'f'.repeat(64),JSON.stringify(events)]);
 await db.query('insert into auth.users values ($1)',[user]);
 await check('installation starts disabled and cannot insert even with a valid service request',async()=>{
  assert.equal((await ingest([event(1)])).rows[0].result.disabled,true);
  assert.equal((await db.query('select count(*)::int as n from app_ops_events')).rows[0].n,0);
 });
 await check('anon and authenticated cannot read diagnostics or call privileged routines',async()=>{
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);
   for(const sql of ['select * from app_ops_events','select * from app_ops_cases','select * from app_ops_health_report','select public.cleanup_app_ops()']) await assert.rejects(db.query(sql),/permission denied/);
   await assert.rejects(ingest([event(1)]),/permission denied/);
   await db.exec('reset role');
  }
 });
 await db.exec('update app_ops_settings set enabled=true');
 await check('service role can ingest; duplicate IDs cannot replace previous evidence',async()=>{
  await db.exec('set role service_role'); await ingest([event(1)]);await ingest([event(1,'save_ok')]); await db.exec('reset role');
  assert.equal((await db.query('select event_name from app_ops_events')).rows[0].event_name,'save_error');
 });
 await check('database rejects private detail keys, unknown events and oversized details atomically',async()=>{
  for(const e of [event(2,'unknown'),event(2,'save_error',undefined,{email:'private'}),event(2,'save_error',undefined,{error_code:'x'.repeat(2500)})]) await assert.rejects(ingest([e]));
  assert.equal((await db.query('select count(*)::int as n from app_ops_events')).rows[0].n,1);
 });
 await check('guest traffic is auth-only and can never create a business record observation',async()=>{
  await assert.rejects(ingest([event(2)],null));
  await ingest([{...event(3,'auth_failed'),scope:'auth',details:{auth_action:'login',error_code:'invalid_credentials',attempt:1}}],null);
  assert.equal((await db.query("select category from app_ops_cases where event_name='auth_failed'")).rows[0].category,'expected_input');
 });
 await check('rate quota and event insert share one transaction, including rollback on rejection',async()=>{
  const before=(await db.query("select used from app_ops_limits where bucket='global'")).rows[0].used;
  await db.query("update app_ops_limits set used=240 where bucket=$1",['user:'+user]);
  await assert.rejects(ingest([event(4)]),e=>e.code==='PT429');
  assert.equal((await db.query("select used from app_ops_limits where bucket='global'")).rows[0].used,before);
  assert.equal((await db.query("select count(*)::int as n from app_ops_events where event_id=$1",[event(4).event_id])).rows[0].n,0);
  await db.query("update app_ops_limits set used=0 where bucket=$1",['user:'+user]);
 });
 await check('recovery requires the same flow/account and the correct later stage',async()=>{
  await ingest([event(5,'recipients_error','2026-09-28T11:00:00Z'),event(6,'progress_ok','2026-09-28T11:01:00Z')]);
  assert.equal((await db.query("select recovery_state from app_ops_cases where event_name='recipients_error'")).rows[0].recovery_state,'no_recovery_evidence');
  await ingest([event(7,'recipients_ok','2026-09-28T11:02:00Z')]);
  assert.equal((await db.query("select recovery_state from app_ops_cases where event_name='recipients_error'")).rows[0].recovery_state,'client_reported_recovery');
  await ingest([{...event(8,'save_ok','2026-09-28T11:03:00Z'),flow_id:session}]);
  assert.equal((await db.query("select recovery_state from app_ops_cases where event_name='save_error'")).rows[0].recovery_state,'no_recovery_evidence');
 });
 await check('only the matching auth attempt notice is linked; reset acceptance does not resolve login failure',async()=>{
  await ingest([{...event(9,'notice_rendered','2026-09-28T10:00:01Z'),scope:'auth',details:{auth_action:'login',attempt:2,notice_key:'login_error'}}],null);
  assert.equal((await db.query("select notice_key from app_ops_cases where event_name='auth_failed'")).rows[0].notice_key,null);
  await ingest([{...event(10,'auth_succeeded','2026-09-28T10:00:02Z'),scope:'auth',details:{auth_action:'password_reset'}}],null);
  assert.equal((await db.query("select recovery_state from app_ops_cases where event_name='auth_failed'")).rows[0].recovery_state,'no_recovery_evidence');
 });
 await check('retention deletes only expired diagnostics and records maintenance health',async()=>{
  await db.exec("update app_ops_events set received_at=now()-interval '31 days' where event_name='save_error'");
  const result=await db.query('select cleanup_app_ops() as removed');assert.equal(Number(result.rows[0].removed),1);
  assert.ok((await db.query('select last_cleanup_at from app_ops_health_report')).rows[0].last_cleanup_at);
  assert.equal((await db.query('select count(*)::int as n from auth.users')).rows[0].n,1);
 });
 await check('detail investigations cannot exceed seven days',async()=>{
  await assert.rejects(db.exec("update app_ops_settings set detail_started_at=now(),detail_until=now()+interval '8 days'"));
 });
 await check('read-only investigation query compiles against the verified QT schema',async()=>{
  await db.exec('create table public.qt_records(id uuid,user_id uuid,is_draft boolean,completed_at timestamptz);create table public.qt_record_recipients(qt_record_id uuid,owner_id uuid);create table public.prayer_items(id uuid,user_id uuid,is_answered boolean,answered_at timestamptz);create table public.prayer_item_recipients(prayer_item_id uuid,owner_id uuid);create schema cron;create table cron.job(jobid bigint,jobname text,active boolean);create table cron.job_run_details(jobid bigint,status text,start_time timestamptz,end_time timestamptz);');
  await db.exec(fs.readFileSync(path.join(root,'docs/operations/investigate.sql'),'utf8'));
 });
 await db.close();console.log(`${checks} PostgreSQL engine checks passed. pg_cron worker execution requires deployment verification.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
