/**
 * Native OFFICE-COMPATIBILITY smoke: LibreOffice opens the ACTUAL generated
 * DOCX and produces a PDF whose text can be checked with pinned local PDF.js.
 * It is NOT a substitute for Microsoft Word desktop visual sign-off.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {renderDocumentArtifact} from '../../src/features/export/export-service.mjs';
import {SYNTH_DOC} from '../documents/fixtures.mjs';
import {docxToImportText} from '../../src/features/import/html-import.mjs';
import zlib from 'node:zlib';

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ledger-office-qa-'));
try{
 const doc=SYNTH_DOC();
 doc.customSections.push({id:'customOffice123',title:'Publications',
  content:'<p>Invented synthetic safety manual for compatibility testing.</p>'});
 const artifact=renderDocumentArtifact({id:'officeDocx123',revision:0,name:'Office QA',
  document:doc,appearance:{template:'modern',paper:'A4'}},'docx');
 const docx=path.join(tmp,'candidate.docx'),pdf=path.join(tmp,'candidate.pdf');
 fs.writeFileSync(docx,artifact.bytes);
 const direct=await docxToImportText(artifact.bytes,{
  inflate:async bytes=>new Uint8Array(zlib.inflateRawSync(bytes))});
 for(const term of ['Ada Example','Acme Retail','Bolt Stores','Publications'])
  assert(direct.text.includes(term),'Import lost DOCX text '+term);
 const tool=process.env.LIBREOFFICE_BINARY||'libreoffice';
 const run=spawnSync(tool,[
  '-env:UserInstallation=file://'+path.join(tmp,'lo-profile'),
  '--headless','--convert-to','pdf:writer_pdf_Export','--outdir',tmp,docx
 ],{encoding:'utf8',timeout:120000});
 if(run.error||run.status!==0||!fs.existsSync(pdf))
  throw Error('Real LibreOffice DOCX conversion failed: '+(run.error?.message||run.stderr||run.stdout));
 const data=new Uint8Array(fs.readFileSync(pdf));
 assert(data.byteLength>1000,'Native converted PDF is unexpectedly empty');
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const task=getDocument({data,disableAutoFetch:true,disableStream:true});
 const pages=await task.promise,parts=[];
 try{
  for(let n=1;n<=pages.numPages;n++){
   const page=await pages.getPage(n);
   const content=await page.getTextContent();
   parts.push(content.items.map(i=>i.str||'').join(' '));
  }
 }finally{await pages?.cleanup?.();await task?.destroy?.();}
 const flattened=parts.join(' ').replace(/\s+/g,' ');
 for(const term of ['Ada Example','Acme Retail','Bolt Stores','Publications'])
  assert(flattened.includes(term),'LibreOffice PDF lost text '+term);
 console.log('PASS native LibreOffice DOCX opening and PDF text fidelity',{
  convertedBytes:data.byteLength,pages:parts.length,sourceDocxBytes:artifact.bytes.length,
  note:'Synthetic nonpersonal fixture; Microsoft Word visual acceptance still open'
 });
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
