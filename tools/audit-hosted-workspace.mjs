#!/usr/bin/env node
/**
 * Check the emitted public A-E bundle, including byte-for-byte preservation of
 * the formerly hosted E31 standalone app. No network or production mutation.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const site='site',hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const index=fs.readFileSync(path.join(site,'index.html'));
const classic=fs.readFileSync(path.join(site,'legacy/index.html'));
const meta=JSON.parse(fs.readFileSync(path.join(site,'site-integrity.json'),'utf8'));
const old=JSON.parse(fs.readFileSync(path.join(site,'legacy/site-integrity.json'),'utf8'));
const sw=fs.readFileSync(path.join(site,'sw.js'),'utf8');
assert.equal(meta.workspaceHtmlSha256,hash(index));
assert.equal(meta.workspaceHtmlBytes,index.length);
assert.equal(meta.classicE31Sha256,hash(classic));
assert.equal(meta.classicE31Sha256,old.hostedHtmlSha256,'Classic E31 must be preserved byte-for-byte');
assert.match(meta.version,/A-E hosted workspace/);
assert.match(index.toString(),/src\/features\/experience\/workspace\/workspace\.mjs/);
assert.match(index.toString(),/src\/features\/accessibility\/a11y\.css/);
assert(!index.toString().includes('Preview of the Ledger CV Studio workspace.'));
assert.match(sw,/ledger-workspace-[a-f0-9]{14}/);
assert(sw.includes('SKIP_WAITING')&&!sw.includes('self.skipWaiting()'+';'), 'No unrequested activation');
for(const rel of ['src/features/experience/workspace/workspace.mjs','src/features/experience/workspace/career-journey-view.mjs',
 'src/domain/storage/career-journey-store.mjs','src/core/workspace-persistence.mjs',
 'src/features/ats/engine.mjs','src/features/cover-letter/letter.mjs','src/features/interview/interview.mjs',
 'src/features/linkedin-coach/linkedin.mjs','src/features/templates/registry.mjs',
 'src/features/accessibility/a11y.css','favicon.svg','site.webmanifest']){
 assert(fs.statSync(path.join(site,rel)).isFile(),'Missing hosted module: '+rel);
}
const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
assert.equal(config.buildCommand,'node tools/build-workspace-vercel.mjs');
assert.equal(config.outputDirectory,'site');
assert.equal(config.git?.deploymentEnabled?.main,false,'Automatic production deployment must remain opt-in');
assert.equal(meta.noBundledPrivateData,true);
const dirs=[path.join(site,'src')];let count=0;
while(dirs.length){const current=dirs.pop();for(const e of fs.readdirSync(current,{withFileTypes:true})){
 if(e.isDirectory()){assert(!/^(?:tests?|fixtures?|node_modules|vendor|\.git)$/i.test(e.name),'Private directory published');dirs.push(path.join(current,e.name));continue;}
 if(e.isFile())count++;
}}
assert(count>=40,'Too few public feature modules');
console.log('PASS A-E hosted build',JSON.stringify({htmlSha256:meta.workspaceHtmlSha256,classicSha256:meta.classicE31Sha256,modules:meta.publicModuleCount,filesChecked:count}));
