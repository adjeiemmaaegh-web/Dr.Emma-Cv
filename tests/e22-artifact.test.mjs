import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'development/e22');
const files={
  app:['Ledger_CV_Studio_E22_Monogram_Print_Pagination.html','3b0669421bf2977be18034ea57cd50aa8315a7007fcf32c9aa68015750bb33ef'],
  qa:['Ledger_CV_Studio_E22_Offline_QA.html','5c42c185083e988a20149b8e917445e714c8ae73182b272281f5d2296199b83e']
};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const [key,[name,digest]] of Object.entries(files)){
  test('E22 '+key+' exact frozen SHA-256',()=>assert.equal(sha(fs.readFileSync(path.join(dir,name))),digest));
}
test('E22 source script reproducibly generates both standalone assets',()=>{
  execFileSync(process.execPath,['tools/build-e22.mjs'],{cwd:root,stdio:'pipe'});
  for(const [name] of Object.values(files)){
    assert.deepEqual(fs.readFileSync(path.join(root,'dist',name)),fs.readFileSync(path.join(dir,name)));
  }
});
test('E22 local QA pins app identity and manual orphan check',()=>{
  const qa=fs.readFileSync(path.join(dir,files.qa[0]),'utf8');
  assert.ok(qa.includes("const EXPECTED='"+files.app[1]+"'"));
  assert.ok(qa.includes('e22_monogram_orphan'));
});
test('all standalone scripts parse, no remote JS/CSS dependency',()=>{
  for(const [name] of Object.values(files)){
    const html=fs.readFileSync(path.join(dir,name),'utf8');
    const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
    assert.ok(scripts.length>=1);
    for(const [,attrs,code] of scripts){assert.doesNotMatch(attrs,/\bsrc\s*=/i);new vm.Script(code,{filename:name});}
    assert.doesNotMatch(html,/<link\b(?=[^>]*\brel\s*=\s*["']?stylesheet\b)[^>]*>/i);
  }
});
test('print adjustment is scoped to monogram skills and does not modify editor styles',()=>{
  const app=fs.readFileSync(path.join(dir,files.app[0]),'utf8');
  assert.match(app,/E22: prevent a lone trailing skill/);
  assert.match(app,/\.cv-page\.tmpl-monogram-navy \.cv-section:has\(\.cv-skills-grid\)/);
  assert.match(app,/@media print\{/);
});
