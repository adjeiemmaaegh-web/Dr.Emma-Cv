import test from 'node:test';
import assert from 'node:assert/strict';
import {zipStore,utf8,unzipEntries} from '../../src/features/documents/zip.mjs';
import {docxToImportText} from '../../src/features/import/html-import.mjs';
import {parseResumeText,createImportReview,approveImportReview} from '../../src/features/import/text-import.mjs';
import {pdfToImportText,createPdfImportReview} from '../../src/features/import/pdf-import.mjs';
const ID=()=> 'testId123456789';
const xml=t=>'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+t+'</w:body></w:document>';
const para=t=>'<w:p><w:r><w:t>'+t+'</w:t></w:r></w:p>';
test('DOCX style-hidden and tracked-deleted text stay out of reviewed text; table cells retain boundaries',async()=>{
 const styles='<w:styles><w:style w:styleId="Hidden" w:type="character"><w:rPr><w:vanish/></w:rPr></w:style></w:styles>';
 const body=xml(para('Ada Example')+
  '<w:tbl><w:tr><w:tc>'+para('Role')+'</w:tc><w:tc>'+para('Employer')+'</w:tc></w:tr></w:tbl>'+
  '<w:p><w:r><w:t>Visible </w:t></w:r><w:r><w:rPr><w:rStyle w:val="Hidden"/></w:rPr><w:t>PRIVATE</w:t></w:r><w:r><w:t>work</w:t></w:r></w:p>'+
  '<w:del>'+para('OLD DELETED ROLE')+'</w:del>');
 const archive=zipStore([{name:'word/document.xml',data:utf8(body)},{name:'word/styles.xml',data:utf8(styles)}]);
 const r=await docxToImportText(archive);
 assert(r.text.includes('Role\tEmployer'),r.text);
 assert(r.text.includes('Visible work'),r.text);
 assert(!/PRIVATE|DELETED/.test(r.text));
 assert(r.warnings.some(x=>/hidden|deleted/i.test(x)));
 assert(r.warnings.some(x=>/Table/i.test(x)));
});
test('ZIP import refuses silent corruption and duplicate selected entries',async()=>{
 const a=zipStore([{name:'word/document.xml',data:utf8(xml(para('hello')))}]);
 const broken=new Uint8Array(a);broken[30+'word/document.xml'.length]^=1;
 await assert.rejects(()=>unzipEntries(broken),/CRC32 mismatch/);
 const dup=zipStore([{name:'one.txt',data:utf8('A')},{name:'one.txt',data:utf8('B')}]);
 await assert.rejects(()=>unzipEntries(dup),/Duplicate ZIP entry/);
});
test('split experience lines, numeric dates and leading bullets survive review unchanged',()=>{
 const raw='Ada Example\nada@example.test\n\nExperience\n• Onboarded staff\nSales Manager\nAcme Ltd\n01/2020 - 05/2023\n• Trained 8 staff\n\nSkills\nExcel';
 const parsed=parseResumeText(raw);
 assert(parsed.document.experience.length>=1);
 assert(parsed.document.experience.some(x=>x.employer==='Acme Ltd'&&x.start==='01/2020'));
 assert(parsed.document.experience.some(x=>/Trained 8 staff/.test(x.description)));
 assert(parsed.sourceText.includes('Onboarded staff'));
 const review=createImportReview(parsed,{sourceName:'candidate.txt',idFactory:ID});
 assert.equal(review.requiresUserConfirmation,true);
 assert.throws(()=>approveImportReview(review),/confirmation/);
 assert.deepEqual(parsed.unmappedSourceLines,[]);
});
const pdfBytes=utf8('%PDF-1.7\nsynthetic-local-text-test');
const fakePdf=()=>({promise:Promise.resolve({
 numPages:2,
 async getPage(n){return {getTextContent:async()=>({items:n===1?[
  {str:'Ada Example',transform:[1,0,0,1,40,700],hasEOL:true},
  {str:'ada@example.test',transform:[1,0,0,1,40,680],hasEOL:true},
  {str:'Experience',transform:[1,0,0,1,40,640],hasEOL:true},
  {str:'Manager at Acme',transform:[1,0,0,1,40,620],hasEOL:true},
  {str:'2020 - Present',transform:[1,0,0,1,40,600],hasEOL:true}
 ]:[]}),cleanup(){}};},
 async destroy(){}
})});
test('PDF adapter retains pages and requires explicit opt-in for image OCR',async()=>{
 const noOcr=await pdfToImportText(pdfBytes,{getDocument:fakePdf});
 assert.equal(noOcr.pages.length,2);
 assert.equal(noOcr.pages[1].method,'no-text');
 assert(noOcr.warnings.some(x=>/Page 2.*OCR/.test(x)));
 const withOcr=await pdfToImportText(pdfBytes,{getDocument:fakePdf,allowOcr:true,ocrPage:async()=>({text:'Skills\nScheduling',confidence:81})});
 assert(withOcr.text.includes('Scheduling'));
 assert.equal(withOcr.pages[1].method,'opt-in-offline-ocr');
 const review=await createPdfImportReview(pdfBytes,{getDocument:fakePdf,idFactory:ID,now:'2026-11-17T10:00:00Z'});
 assert.equal(review.format,'pdf');assert.equal(review.userReviewed,false);
 assert.equal(review.requiresUserConfirmation,true);
});
test('PDF adapter rejects invalid files, missing local engine and excessive pages',async()=>{
 await assert.rejects(()=>pdfToImportText(utf8('not pdf'),{getDocument:fakePdf}),e=>e.code==='INVALID');
 await assert.rejects(()=>pdfToImportText(pdfBytes),e=>e.code==='UNAVAILABLE');
 await assert.rejects(()=>pdfToImportText(pdfBytes,{getDocument:()=>({promise:Promise.resolve({numPages:41})})}),e=>e.code==='INVALID');
});
