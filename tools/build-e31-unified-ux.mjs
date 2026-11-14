/* E31 Unified UX production build: exact E30 -> E31 -> preserved alternative E30 design.
 * Does not execute the alternative dock, which would duplicate the existing E30 dock.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const at=p=>path.join(root,p);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const run=spawnSync(process.execPath,['tools/build-e31-candidate.mjs'],{cwd:root,stdio:'inherit',timeout:180000});
if(run.error)throw run.error;
assert.equal(run.status,0,'E31 candidate build failed');
const target=at('site/index.html');
let html=fs.readFileSync(target,'utf8');
const previous=sha(Buffer.from(html));
const css=fs.readFileSync(at('src/legacy-unified-ux/e30-design-system.css'),'utf8');
assert(!/<\\/(?:style|script)>/i.test(css),'Unexpected inline CSS terminator');
assert(html.includes('</head>')&&!html.includes('ledger-e31-unified-ux'),'Unexpected HTML');
html=html.replace('</head>','<style id="ledger-e31-unified-ux">\n'+css+'\n</style>\n</head>');
const bytes=Buffer.from(html,'utf8');
const digest=sha(bytes);
fs.writeFileSync(target,bytes);
const swPath=at('site/sw.js');
let sw=fs.readFileSync(swPath,'utf8');
const oldKey='ledger-e31-'+previous.slice(0,14);
assert(sw.includes(oldKey),'E31 cache version missing');
sw=sw.replaceAll(oldKey,'ledger-e31-'+digest.slice(0,14));
fs.writeFileSync(swPath,sw);
const manifestPath=at('site/site-integrity.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
assert.equal(manifest.hostedHtmlSha256,previous,'E31 manifest mismatch');
Object.assign(manifest,{version:'E31 Unified UX: E30 + E31 + preserved E30 alternative design',sourceE31Sha256:previous,unifiedCssSha256:sha(Buffer.from(css)),hostedHtmlSha256:digest,hostedHtmlBytes:bytes.length,status:'Unified UX production candidate; physical-device acceptance pending'});
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log('Unified UX built',JSON.stringify({sha256:digest,bytes:bytes.length}));
