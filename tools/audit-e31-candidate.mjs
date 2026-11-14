#!/usr/bin/env node
// E31 candidate static integrity checks; no network or production mutation.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const html=fs.readFileSync('site/index.html');
const sw=fs.readFileSync('site/sw.js','utf8');
const manifest=JSON.parse(fs.readFileSync('site/site-integrity.json','utf8'));
const digest=crypto.createHash('sha256').update(html).digest('hex');
assert.match(manifest.version,/E31/);
assert.equal(manifest.sourceE30Sha256,'1dd5b058bc10e058825e37ec0de706f42efe2ac89c602a87909672f948dc546c');
assert.equal(manifest.hostedHtmlSha256,digest);
assert.equal(manifest.hostedHtmlBytes,html.length);
assert(html.includes('id="ledger-e31-accessibility"'));
assert(html.includes('id="ledger-e31-keyboard"'));
assert(sw.includes('ledger-e31-'+digest.slice(0,14)));
assert(!/<script\b[^>]+\bsrc\s*=/i.test(html.toString('utf8')));
console.log(JSON.stringify({status:'PASS',htmlSha256:digest,htmlBytes:html.length,sourceE30Sha256:manifest.sourceE30Sha256},null,2));
