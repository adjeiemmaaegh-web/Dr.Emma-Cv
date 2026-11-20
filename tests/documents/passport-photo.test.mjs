import test from 'node:test';
import assert from 'node:assert/strict';
import {createEditor} from '../../src/features/editor/editor-state.mjs';
import {SAMPLE_DOC} from '../../src/features/experience/workspace/store.mjs';
import {decodePassportPhoto,passportPhotoBox,MAX_PHOTO_CHARS} from '../../src/features/documents/photo.mjs';
import {renderPreview,renderDocumentArtifact} from '../../src/features/export/export-service.mjs';
import {layoutDocument,pagesToText} from '../../src/features/documents/layout.mjs';
import {extractPdfText} from '../../src/features/documents/pdf-writer.mjs';
import {unzipEntries,bytesToText} from '../../src/features/documents/zip.mjs';
// Small real RGB baseline JPEG made from synthetic pixels; no personal photo in fixtures.
const JPEG='/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5Ojf/2wBDAQoKCg0MDRoPDxo3JR8lNzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzf/wAARCAAtACMDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCACongAAAAAAAAAAAAAAAP/9k=';
const src='data:image/jpeg;base64,'+JPEG;
const v=ed=>({id:'photo-test',revision:2,name:'CV',...ed.snapshot()});

test('passport photo accepts bounded baseline JPEG only and rejects executable/oversized inputs',()=>{
 const p=decodePassportPhoto(src);assert.equal(p.width,35);assert.equal(p.height,45);
 assert.equal(p.bytes.length,299);
 for(const bad of ['javascript:alert(1)','data:image/svg+xml;base64,'+JPEG,
  'data:image/png;base64,'+JPEG,'data:image/jpeg;base64,not-base64!!!',
  'data:image/jpeg;base64,'+'A'.repeat(MAX_PHOTO_CHARS)]){
  assert.equal(decodePassportPhoto(bad),null);
 }
 assert.equal(decodePassportPhoto(src.slice(0,-4)+'ABCD'),null);
});
test('upload and remove form a single undoable operation, leave CV text untouched and allow visibility toggle',()=>{
 const ed=createEditor({document:SAMPLE_DOC()});
 const old=JSON.stringify(ed.snapshot().document);
 assert.throws(()=>ed.setPhoto('data:text/html,hello'),/Unsupported/);
 ed.setPhoto(src);
 assert.equal(ed.snapshot().document.personalInfo.photo,src);
 assert.equal(ed.snapshot().appearance.photo,true);
 assert.equal(ed.snapshot().document.summary,JSON.parse(old).summary);
 ed.undo();assert(!ed.snapshot().document.personalInfo.photo);
 ed.redo();assert.equal(ed.snapshot().document.personalInfo.photo,src);
 ed.setAppearance({photo:false});
 assert.equal(renderPreview(ed.snapshot().document,ed.snapshot().appearance).photo,null);
 assert.equal(ed.snapshot().document.personalInfo.photo,src);
 ed.setPhoto('');assert.equal(ed.snapshot().appearance.photo,false);
 ed.undo();assert.equal(ed.snapshot().document.personalInfo.photo,src);
});
test('photo keeps header clear and exports to selectable-text PDF and embedded-image DOCX',async()=>{
 const ed=createEditor({document:SAMPLE_DOC()});ed.setPhoto(src);
 const snap=ed.snapshot(),layout=layoutDocument(snap.document,snap.appearance);
 assert(layout.photo&&layout.photoBox);
 const firstContent=layout.pages[0].find(line=>line.kind==='section-title');
 assert(firstContent.y>=layout.photoBox.y+layout.photoBox.height);
 const headers=layout.pages[0].filter(line=>['name','title','contact'].includes(line.kind));
 for(const h of headers)assert(h.x+h.textWidth<layout.photoBox.x,'header would overlap photo');
 const preview=renderPreview(snap.document,snap.appearance);
 assert.equal(preview.photo.src,src);
 assert.deepEqual(preview.photo.box,layout.photoBox);
 const pdf=renderDocumentArtifact(v(ed),'pdf'),pdfString=Buffer.from(pdf.bytes).toString('latin1');
 assert(pdfString.includes('/Subtype /Image'));
 assert(pdfString.includes('/Filter /DCTDecode'));
 assert(pdfString.includes('/ImPhoto Do'));
 assert(pdfString.includes('/XObject'));
 assert.equal(pdf.text,pagesToText(layout.pages));
 assert.equal(extractPdfText(pdf.bytes).length,pdf.pageCount);
 assert(extractPdfText(pdf.bytes).flat().includes('Ada Example'));
 const word=renderDocumentArtifact(v(ed),'docx');
 const entries=await unzipEntries(word.bytes);
 assert.deepEqual(entries.get('word/media/passport-photo.jpg'),decodePassportPhoto(src).bytes);
 const docXml=bytesToText(entries.get('word/document.xml'));
 const rels=bytesToText(entries.get('word/_rels/document.xml.rels'));
 assert(docXml.includes('wp:anchor'));
 assert(docXml.includes('r:embed="rIdPhoto"'));
 assert(rels.includes('relationships/image'));
 assert(docXml.includes('Ada Example'));
 assert(bytesToText(entries.get('[Content_Types].xml')).includes('image/jpeg'));
 assert.equal(preview.text,word.text);
});
test('no photo or hidden photo produces original text-only exports',async()=>{
 const ed=createEditor({document:SAMPLE_DOC()});
 const noPhoto=renderDocumentArtifact(v(ed),'pdf');
 assert(!Buffer.from(noPhoto.bytes).toString('latin1').includes('/Subtype /Image'));
 ed.setPhoto(src);ed.setAppearance({photo:false});
 const hidden=renderDocumentArtifact(v(ed),'pdf');
 const w=renderDocumentArtifact(v(ed),'docx');
 assert(!Buffer.from(hidden.bytes).toString('latin1').includes('/Subtype /Image'));
 const entries=await unzipEntries(w.bytes);
 assert(!entries.has('word/media/passport-photo.jpg'));
 assert.equal(noPhoto.text,hidden.text);
});
