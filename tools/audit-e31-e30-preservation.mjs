#!/usr/bin/env node
/* E31 regression gate: keep the E30 frozen release immutable while E31 is
 * developed separately. No build or network side effects. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const build=read('tools/build-e30-ui.mjs');
const config=JSON.parse(read('vercel.json'));
const pkg=JSON.parse(read('package.json'));
const css=read('src/styles/e30-design-system.css');
const js=read('src/features/ui/e30-tools.inline.js');
const verify=read('tools/verify-live-e30.mjs');
const checks=[
 ['E30 Vercel builder remains pinned',config.buildCommand==='node tools/build-e30-ui.mjs'&&config.outputDirectory==='site'],
 ['E30 package builder remains pinned',pkg.scripts.build==='node tools/build-e30-ui.mjs'],
 ['E30 exact output digest gate preserved',build.includes("assert.equal(hash,'1dd5b058bc10e058825e37ec0de706f42efe2ac89c602a87909672f948dc546c'")],
 ['E29 source digest gate preserved',build.includes("assert.equal(sha(baseline),pinnedE29")],
 ['No E31 script injected into frozen E30 build',!build.includes('e31-')],
 ['E30 menu controls have accessible state',js.includes("button.setAttribute('aria-expanded','false')")&&js.includes("event.key==='Escape'")],
 ['E30 menu hidden content respects hidden state',css.includes('.e30-tools-content[hidden]{display:none!important}')],
 ['E30 screen keyboard focus visible',css.includes(':focus-visible')],
 ['E30 reduced motion supported',css.includes('prefers-reduced-motion:reduce')],
 ['E30 print dock hidden',css.includes('@media print{.e30-tools-dock{display:none!important}}')],
 ['Public verifier checks exact HTML bytes',verify.includes('home.bytes.length,expectedBytes')],
 ['Public verifier hashes actual HTML',verify.includes("crypto.createHash('sha256').update(home.bytes)")],
 ['Public verifier checks all three endpoints',["get('/')","get('/sw.js')","get('/site-integrity.json')"].every(x=>verify.includes(x))],
 ['Public verifier fails closed',verify.includes('process.exitCode=1')]
];
let failed=0;
for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL')+' '+name);if(!ok)failed++}
console.log(JSON.stringify({status:failed?'FAIL':'PASS',checks:checks.length,failed,sourceDigest:{e30Css:hash(css),e30Tools:hash(js)}}));
if(failed)process.exitCode=1;
