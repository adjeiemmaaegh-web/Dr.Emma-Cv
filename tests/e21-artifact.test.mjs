import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const e21=path.join(root,'development/e21');
const digest=relative=>crypto.createHash('sha256').update(fs.readFileSync(path.join(e21,relative))).digest('hex');
const APP='Ledger_CV_Studio_E21_Style_Safe_Docx_Import.html',QA='Ledger_CV_Studio_E21_Offline_QA.html';
test('E21 HTML and offline QA exact release bytes',()=>{
 assert.equal(digest(APP),'9d27f843eeee774d081fcc936b87da3196ab28d4f4bb94939a5d5e6a215689d2');
 assert.equal(digest(QA),'d66e66f48b8619f88a2efc4b1c4abef123bb5d9e87493caad095c538b0bb5765');
 const html=fs.readFileSync(path.join(e21,QA),'utf8');
 assert.match(html,/const EXPECTED='9d27f843eeee774d081fcc936b87da3196ab28d4f4bb94939a5d5e6a215689d2'/);
 assert.match(html,/e21_style_hidden/);
 assert.match(html,/e21_style_word/);
});
test('E21 independently rebuilds byte-identical offline HTML from E20 source and patch',()=>{
 execFileSync(process.execPath,['tools/build-e21.mjs'],{cwd:root,stdio:'pipe'});
 const generated=fs.readFileSync(path.join(root,'dist',APP));
 const delivered=fs.readFileSync(path.join(e21,APP));
 assert.deepEqual(generated,delivered);
});
test('all E21 inline scripts parse without external script/style dependencies',()=>{
 for(const name of [APP,QA]){
  const html=fs.readFileSync(path.join(e21,name),'utf8');
  const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  assert.ok(scripts.length);
  for(const [,attrs,code] of scripts){assert.doesNotMatch(attrs,/\bsrc\s*=/i);new vm.Script(code,{filename:name});}
  assert.doesNotMatch(html,/<link\b(?=[^>]*\brel\s*=\s*["']?stylesheet\b)[^>]*>/i);
 }
});
