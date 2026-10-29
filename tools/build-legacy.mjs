import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
const parts = ['00-document-head.part','01-base-styles.part','02-app-shell.part','03-core-script.part','04-remaining-features.part'];
const chunks = await Promise.all(parts.map(p => readFile(resolve(root,'source/legacy',p))));
const result = Buffer.concat(chunks);
const expected = await readFile(resolve(root,'Ledger_CV_Studio_Stage8_Free_Finalization.html'));
const digest = data => createHash('sha256').update(data).digest('hex');
if (!result.equals(expected)) {
  console.error('FAIL: extracted source does not reproduce committed Stage 8 baseline', {actual:digest(result), expected:digest(expected)});
  process.exitCode = 1;
} else {
  await mkdir(resolve(root,'dist'),{recursive:true});
  await writeFile(resolve(root,'dist/Ledger_CV_Studio.html'),result);
  console.log('PASS: exact bytes match; sha256='+digest(result)+'; bytes='+result.length);
}
