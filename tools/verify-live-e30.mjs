#!/usr/bin/env node
// E31: independent, read-only public-origin verification of the frozen E30 build.
// Usage: node tools/verify-live-e30.mjs https://ledger-cv-studio.vercel.app
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const expectedHash='1dd5b058bc10e058825e37ec0de706f42efe2ac89c602a87909672f948dc546c';
const expectedBytes=16010305;
const origin=new URL(process.argv[2]||'https://ledger-cv-studio.vercel.app');
assert.equal(origin.protocol,'https:','Production verification requires HTTPS');
assert.equal(origin.pathname,'/','Supply a production origin, not a path');
async function get(path){
  const url=new URL(path,origin);
  const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(30000),headers:{'Cache-Control':'no-cache'}});
  assert.equal(response.status,200,`${path} HTTP status ${response.status}`);
  assert.equal(new URL(response.url).origin,origin.origin,`${path} redirected to a different origin`);
  const bytes=Buffer.from(await response.arrayBuffer());
  assert(bytes.length>0,`${path} empty response`);
  return {bytes,type:response.headers.get('content-type')||''};
}
try{
  const [home,sw,integrity]=await Promise.all([get('/'),get('/sw.js'),get('/site-integrity.json')]);
  const manifest=JSON.parse(integrity.bytes.toString('utf8'));
  assert.match(String(manifest.version),/E30/,'Manifest does not declare E30');
  assert.equal(manifest.hostedHtmlSha256,expectedHash,'Manifest hash mismatch');
  assert.equal(manifest.hostedHtmlBytes,expectedBytes,'Manifest byte count mismatch');
  assert.equal(home.bytes.length,expectedBytes,'Public HTML byte count mismatch');
  const actualHash=crypto.createHash('sha256').update(home.bytes).digest('hex');
  assert.equal(actualHash,expectedHash,'Public HTML digest mismatch');
  assert.match(home.type,/text\/html/i,'Homepage content type is not HTML');
  assert.match(sw.bytes.toString('utf8'),/ledger-e29-1dd5b058bc10e0/,'Service worker does not reference E30 cache');
  assert.match(sw.type,/javascript|text\/plain/i,'Service worker content type is unexpected');
  console.log(JSON.stringify({status:'PASS',origin:origin.origin,version:manifest.version,htmlBytes:home.bytes.length,htmlSha256:actualHash,serviceWorkerBytes:sw.bytes.length},null,2));
}catch(error){
  console.error('E30 PUBLIC VERIFICATION FAILED:',error.message);
  process.exitCode=1;
}
