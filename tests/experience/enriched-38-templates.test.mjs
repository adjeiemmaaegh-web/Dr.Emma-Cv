import test from 'node:test';
import assert from 'node:assert/strict';
import {TEMPLATES,applyTemplate,resolveStyle} from '../../src/features/templates/registry.mjs';
import {createEditor} from '../../src/features/editor/editor-state.mjs';
import {SAMPLE_DOC} from '../../src/features/experience/workspace/store.mjs';
import {layoutDocument,pageDecorations,pagesToText} from '../../src/features/documents/layout.mjs';
import {renderDocumentArtifact,renderPreview} from '../../src/features/export/export-service.mjs';

const NEW=['portrait-rail','golden-banner','ink-frame','slate-masthead',
 'portrait-split','stone-column','charcoal-rail','silver-outline'];

test('the eight new design IDs coexist with all thirty existing IDs',()=>{
 assert.equal(TEMPLATES.length,38);
 assert.equal(new Set(TEMPLATES.map(t=>t.id)).size,38);
 for(const id of NEW)assert(TEMPLATES.some(t=>t.id===id),id+' missing');
});

test('new designs have distinctive, export-backed visual geometry',()=>{
 const signatures=new Set(),doc=SAMPLE_DOC();
 for(const id of NEW){
  const appearance=applyTemplate({template:'modern',color:'#345678'},id,{keepColor:false});
  const layout=layoutDocument(doc,appearance);
  const ornaments=pageDecorations(layout.style,layout.paper);
  assert(ornaments.length>=2,id+' missing decorations');
  assert(ornaments.every(x=>x.x>=0&&x.y>=0&&x.width>0&&x.height>=0&&x.x+x.width<=layout.paper.width+0.1&&x.y+x.height<=layout.paper.height+0.1),id+' decorations exceed paper');
  signatures.add(JSON.stringify(ornaments.map(x=>[x.kind,Math.round(x.x),Math.round(x.y),Math.round(x.width),Math.round(x.height)])));
  const pdf=renderDocumentArtifact({id:'test',revision:0,name:'CV',document:doc,appearance},'pdf');
  const preview=renderPreview(doc,appearance);
  assert.equal(pdf.pageCount,preview.pageCount);
  assert.equal(pdf.text,preview.text);
  assert.equal(String.fromCharCode(...pdf.bytes.slice(0,8)),'%PDF-1.4');
  assert(pagesToText(layout.pages).includes(doc.personalInfo.firstName));
 }
 assert.equal(signatures.size,8,'new templates should be visually distinct beyond color');
});

test('switching between all 38 layouts preserves source document and remains undoable',()=>{
 const editor=createEditor({document:SAMPLE_DOC(),appearance:{template:'modern'}});
 const before=JSON.stringify(editor.snapshot().document);
 for(const t of TEMPLATES){
  editor.setAppearance(applyTemplate(editor.snapshot().appearance,t.id,{keepColor:false}));
  assert.equal(JSON.stringify(editor.snapshot().document),before,t.id+' modified CV content');
  assert.equal(editor.snapshot().appearance.template,t.id);
 }
 editor.undo();
 assert.equal(editor.snapshot().appearance.template,TEMPLATES[TEMPLATES.length-2].id);
 assert.equal(JSON.stringify(editor.snapshot().document),before);
});

test('explicit none decoration override works on new designs',()=>{
 for(const id of NEW){
  const style=resolveStyle({template:id,pageAccent:'none'});
  assert.equal(pageDecorations(style,{width:595.28,height:841.89}).length,0);
 }
});
