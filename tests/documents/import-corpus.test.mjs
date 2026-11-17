/**
 * Deterministic, NON-PERSONAL CV import corpus.
 * Real export bytes from the current renderer are re-imported without a server.
 * These tests protect factual tokens and review boundaries; they do not stand
 * in for native MS Word, external résumé collections, real scans or people.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {renderDocumentArtifact} from '../../src/features/export/export-service.mjs';
import {SYNTH_DOC} from './fixtures.mjs';
import {docxToImportText} from '../../src/features/import/html-import.mjs';
import {parseResumeText,createImportReview,approveImportReview} from '../../src/features/import/text-import.mjs';

const build=(doc,format,appearance={template:'modern',paper:'A4'})=>renderDocumentArtifact({
 id:'corpusVariant123',revision:0,name:'Synthetic CV',document:doc,appearance
},format);
const fixture=(name)=>{const doc=SYNTH_DOC();
 if(name==='second-role'){
  doc.experience[1].title='Operations Supervisor';
  doc.experience[1].employer='Acme Retail';
  doc.experience[1].start='2017';doc.experience[1].end='2019';
 }else if(name==='unicode'){
  doc.personalInfo.firstName='François';doc.personalInfo.lastName='Núñez';
  doc.summary='Coordinate work in Zürich and São Paulo — multilingual environments.';
  doc.skills.push({name:'Déploiement',level:3});
 }else if(name==='custom'){
  doc.customSections.push({id:'customABC123',title:'Publications',content:'<p>Wrote a synthetic process improvement article.</p>'});
  doc.certifications.push({name:'Warehouse Safety',issuer:'Sample Institute',date:'2019-08',url:'https://example.org/verify'});
 }return doc;};
const targets={
 'baseline':['Ada Example','Acme Retail','Bolt Stores','Scheduling'],
 'second-role':['Operations Supervisor','Acme Retail','Stock control'],
 'unicode':['François Núñez','Zürich','Déploiement'],
 'custom':['Publications','Warehouse Safety','Sample Institute']
};
const fixedId=(()=>{let i=0;return()=> 'corpusIdABC'+(++i);})();
for(const name of Object.keys(targets)){
 test('roundtrip golden synthetic DOCX: '+name,async()=>{
  const document=fixture(name),artifact=build(document,'docx',{template:name==='custom'?'prestige':'modern',paper:'Letter'});
  const extracted=await docxToImportText(artifact.bytes);
  for(const needle of targets[name])assert(extracted.text.includes(needle),
   name+' lost source text '+needle);
  const parsed=parseResumeText(extracted.text),review=createImportReview(parsed,{idFactory:fixedId});
  assert.equal(review.status,'review-required');
  assert.equal(review.sourceText,extracted.text);
  assert(review.items.length>0);
  assert.throws(()=>approveImportReview(review,{accepted:review.items.map(i=>i.path)}),
   e=>e.code==='UNCONFIRMED');
 });
}
test('PDF corpus has actual selectable text with a pinned, locally installed PDF engine',async t=>{
 let module;try{module=await import('pdfjs-dist/legacy/build/pdf.mjs');}catch{
  t.skip('PDF.js build dependency absent; hosted build and browser CI enforce this gate');return;
 }
 const {createPdfImportReview}=await import('../../src/features/import/pdf-import.mjs');
 for(const name of ['baseline','unicode']){
  const artifact=build(fixture(name),'pdf',{template:'modern',paper:'A4'});
  const review=await createPdfImportReview(artifact.bytes,{getDocument:module.getDocument,idFactory:fixedId});
  assert.equal(review.status,'review-required',name+': '+review.warnings.join(' | '));
  for(const needle of targets[name].slice(0,2))assert(review.sourceText.includes(needle),
   name+' PDF text lost '+needle);
  assert(review.pages.length>=1);
 }
});
