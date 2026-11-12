/* E30 — deterministically layer one UI design system over the frozen E29/E28 app.
 * No editing of E28's OCR, CV model, storage, export, or document template source.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const at=p=>path.join(root,p);
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const E29='c04684c7ff79cae0068a8e44408b25b86a751d08d14909cdd1006cedefcc8767';
const E28='73ca54189b8db116c5f9760f9372dc2082a836de5dfcbdea43c03eff436dcbd7';
const base=spawnSync(process.execPath,['tools/build-e29-vercel.mjs'],{
 cwd:root,stdio:'inherit',timeout:180000
});
if(base.error)throw base.error;
assert.equal(base.status,0,'Frozen E29 reconstruction failed');
const target=at('site/index.html');
const original=fs.readFileSync(target);
assert.equal(hash(original),E29,'Refusing to restyle a changed or unknown E29 app');
const manifestPath=at('site/site-integrity.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
assert.equal(manifest.sourceE28Sha256,E28,'E28 business logic unexpectedly changed');
fs.mkdirSync(at('dist'),{recursive:true});
fs.writeFileSync(at('dist/E29_Hosted_Baseline.html'),original);
const css=fs.readFileSync(at('hosting/e30-design-system.css'),'utf8');
const behavior=fs.readFileSync(at('hosting/e30-tools-dock.js'),'utf8');
new vm.Script(behavior,{filename:'e30-tools-dock.js'});
assert(css.includes('never')&&css.includes('#ledgerE30Dock'),'Missing UI-only design scope');
assert(!/<\/style/i.test(css)&&!/<\/script/i.test(behavior),'Unsafe inline closing sequence');
const old=original.toString('utf8');
let next=old;
const head=next.indexOf('</head>');
const body=next.lastIndexOf('</body>');
assert(head>0&&body>head&&body>next.length-20000,'Unexpected document structure');
next=next.slice(0,head)+
 '<meta name="ledger-ui-version" content="e30-unified-ux">\n'+
 '<style id="ledgerE30DesignSystem">\n'+css+'\n</style>\n'+next.slice(head);
const bodyIndex=next.lastIndexOf('</body>');
next=next.slice(0,bodyIndex)+
 '<script id="ledgerE30ToolsDock">\n'+behavior+'\n</script>\n'+next.slice(bodyIndex);
const changed=Buffer.from(next,'utf8');
assert(changed.length>original.length,'Unexpected no-op styling build');
assert.equal(next.replace(/<meta name="ledger-ui-version" content="e30-unified-ux">\n<style id="ledgerE30DesignSystem">[\s\S]*?<\/style>\n/,'')
 .replace(/<script id="ledgerE30ToolsDock">[\s\S]*?<\/script>\n/,''),
 old,'Frozen E29 application source not preserved outside E30 additions');
fs.writeFileSync(target,changed);
const newHash=hash(changed);
const workerPath=at('site/sw.js');
const sw=fs.readFileSync(workerPath,'utf8');
assert(/const CACHE='ledger-e29-[a-f0-9]+';/.test(sw),'Unknown prior service worker cache marker');
let upgraded=sw.replace(/const CACHE='ledger-e29-[a-f0-9]+';/,
 "const CACHE='ledger-e30-"+newHash.slice(0,16)+"';");
upgraded=upgraded.replace("if(key.startsWith('ledger-e29-')&&key!==CACHE)",
 "if((key.startsWith('ledger-e29-')||key.startsWith('ledger-e30-'))&&key!==CACHE)");
assert(upgraded.includes("ledger-e30-"+newHash.slice(0,16)));
fs.writeFileSync(workerPath,upgraded);
Object.assign(manifest,{
 version:'E30 unified UX/UI on frozen E29/E28 application',
 status:'DEPLOYABLE BETA — NOT FORMAL HUMAN/DEVICE ACCEPTANCE',
 sourceE28Sha256:E28,previousHostedE29Sha256:E29,
 hostedHtmlSha256:newHash,hostedHtmlBytes:changed.length,
 designSystem:'E30 Teal / Ink / Warm Neutral UI',
 designCssSha256:hash(Buffer.from(css)),
 toolsDockSha256:hash(Buffer.from(behavior)),
 sourceRef:'review/e30-unified-ux-design-2026-11-12',
 codeChangeScope:'additional UI CSS and a progressive floating-tools dock; no CV business logic or document styling change',
 productionDesignSignoff:false,
 remainingHumanChecks:[
  'Screen reader and keyboard testing across real browsers',
  'Manual visual review on actual phones/tablets and different display scaling',
  'Complex resume Word/PDF fidelity on installed Microsoft Office',
  'Real scanned and multilingual resume accuracy',
  'Physical low-memory PC and multi-tab recovery acceptance'
 ]
});
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log('E30 unified UX build ready',JSON.stringify({
 sha256:newHash,bytes:changed.length,legacySha:E29,uiCssSha:manifest.designCssSha256,
 dockSha:manifest.toolsDockSha256
}));
