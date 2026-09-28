// Local regression suite. No live Supabase/database calls; no credentials needed.
const fs=require('node:fs'),{spawnSync}=require('node:child_process');
const tests=['test-observation-client.cjs','test-observation-ingestion.cjs','test-observation-draft-auth.cjs','test-qt-writer-protection.cjs','test-operations-api.cjs','test-auth-observation.cjs'];
if(fs.existsSync('lib/authErrorCopy.ts'))tests.push('test-auth-ui.cjs');
if(fs.existsSync('lib/queuedAuthLock.ts')){
 if(globalThis.navigator?.locks)tests.push('test-auth-lock-queue.cjs');
 else console.log('SKIP real Web Locks checks: run this suite with Node 24 to include them.');
 tests.push('test-draft-request-cancellation.cjs');
}
for(const name of tests){const result=spawnSync(process.execPath,['scripts/'+name],{stdio:'inherit'});if(result.status!==0)process.exit(result.status??1);}
console.log('Selected operational patch checks passed. SQL engine checks are documented separately.');
