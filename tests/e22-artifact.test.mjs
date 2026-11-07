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
  app:['Ledger_CV_Studio_E22_Monogram_Print_Pagination.html','ca686104b80df028b8f52b0b91adbafbd569709600dee493f9b8102e1a98e512'],
  qa:['Ledger_CV_Studio_E22_Offline_QA.html','cf68e13b4312d0d109b869334d37e618a715f82a2cc8143304f1467ebee403de']
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
test('print adjustment groups Skills only in CSS print rules, leaving editor styles untouched',()=>{
  const app=fs.readFileSync(path.join(dir,files.app[0]),'utf8');
  assert.match(app,/E22: preserve each small Skills section/);
  assert.match(app,/\.cv-page \.cv-section:has\(\.cv-skills-grid\)/);
  assert.match(app,/@media print\{/);
});
