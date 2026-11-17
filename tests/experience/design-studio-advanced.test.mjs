import test from 'node:test';
import assert from 'node:assert/strict';
import {createEditor} from '../../src/features/editor/editor-state.mjs';
import {SAMPLE_DOC} from '../../src/features/experience/workspace/store.mjs';
import {fieldAtPath,confirmDesignEditing} from '../../src/features/experience/workspace/design-studio.mjs';
import {normalizeAppearance,resolveStyle} from '../../src/features/templates/registry.mjs';
import {layoutDocument,decorationGeometry,pageDecorations} from '../../src/features/documents/layout.mjs';
import {renderPreview,renderDocumentArtifact} from '../../src/features/export/export-service.mjs';
import {saveDesign,readDesigns,exportDesigns,previewDesignImport,importDesigns,DESIGN_KEY} from '../../src/features/templates/design-library.mjs';
const newEditor=()=>createEditor({document:SAMPLE_DOC(),appearance:{template:'modern'}});
const storage=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),map:m};};

test('precision slider gesture is one undoable change, with unrelated commands isolated',()=>{
 const ed=newEditor(),old=ed.snapshot().appearance;
 for(let i=0;i<20;i++)ed.setAppearance({bodySize:9+i*0.2},{coalesceKey:'bodySize'});
 ed.endCoalescing();
 assert.equal(ed.snapshot().appearance.bodySize,12.8);
 ed.undo();assert.deepEqual(ed.snapshot().appearance,old);
 ed.redo();assert.equal(ed.snapshot().appearance.bodySize,12.8);
 ed.setAppearance({entryGap:7},{coalesceKey:'entryGap'});ed.setAppearance({entryGap:8},{coalesceKey:'entryGap'});
 ed.endCoalescing();ed.undo();
 assert.equal(ed.snapshot().appearance.bodySize,12.8);
 assert.equal(ed.snapshot().appearance.entryGap,undefined);
});
test('extra spacing controls have bounded values and feed layout, PDF and DOCX',()=>{
 const ed=newEditor();
 ed.setAppearance({headingScale:1.45,entryGap:12,paragraphGap:3,ruleWeight:2.2});
 const a=ed.snapshot(),style=resolveStyle(a.appearance);
 assert.equal(style.headingScale,1.45);assert.equal(style.entryGap,12);
 assert.equal(style.paragraphGap,3);assert.equal(style.ruleWeight,2.2);
 assert.ok(normalizeAppearance({headingScale:20,ruleWeight:-1}).errors.length===2);
 const layout=layoutDocument(a.document,a.appearance),section=layout.pages.flat().find(l=>l.kind==='section-title');
 assert.equal(section.size,style.size*style.headingScale);
 assert.equal(decorationGeometry(section,style)[0].height,2.2);
 const preview=renderPreview(a.document,a.appearance),variant={id:'v',revision:0,name:'Design',...a};
 const pdf=renderDocumentArtifact(variant,'pdf'),word=renderDocumentArtifact(variant,'docx');
 assert.equal(pdf.pageCount,preview.pageCount);assert.equal(pdf.text,preview.text);
 assert.equal(String.fromCharCode(...word.bytes.slice(0,2)),'PK');
});
test('custom sections can be reordered among standard sections, hidden and restored without content loss',()=>{
 const ed=newEditor(),id=ed.addItem('customSections',{title:'Volunteer impact',content:'<ul><li>Coached junior colleagues</li></ul>'});
 const key='custom:'+id;
 for(let i=0;i<10;i++)ed.moveSection(key,-1);
 const order=ed.snapshot().appearance.sectionOrder;
 assert.equal(order[0],key);
 let blocks=layoutDocument(ed.snapshot().document,ed.snapshot().appearance).blocks;
 assert.equal(blocks.find(b=>b.kind==='section-title').text,'Volunteer impact');
 ed.setAppearance({enabledSections:{[key]:false}});
 blocks=layoutDocument(ed.snapshot().document,ed.snapshot().appearance).blocks;
 assert.ok(!blocks.some(b=>b.text==='Volunteer impact'));
 assert.equal(ed.snapshot().document.customSections[0].content,'<ul><li>Coached junior colleagues</li></ul>');
 ed.undo();
 assert.ok(layoutDocument(ed.snapshot().document,ed.snapshot().appearance).blocks.some(b=>b.text==='Volunteer impact'));
});
test('preview editing resolves complete header, role, contact and skills; forms remain syncable',()=>{
 const ed=newEditor(),doc=ed.snapshot().document;
 const layout=layoutDocument(doc,ed.snapshot().appearance);
 const head=layout.pages.flat().find(l=>l.kind==='name');
 const contact=layout.pages.flat().find(l=>l.kind==='contact');
 const role=layout.pages.flat().find(l=>l.kind==='entry-head');
 const skills=layout.pages.flat().find(l=>l.sourcePath==='skills');
 assert.equal(head.sourcePath,'personalInfo.name');
 assert.equal(contact.sourcePath,'personalInfo.contact');
 assert.equal(role.sourcePath,'experience[e1].meta');
 assert.equal(skills.sourcePath,'skills');
 assert.equal(fieldAtPath(ed,head.sourcePath,doc).fields.length,2);
 assert.equal(fieldAtPath(ed,contact.sourcePath,doc).fields.length,5);
 const roles=fieldAtPath(ed,role.sourcePath,doc);
 assert.equal(roles.fields.length,5);
 roles.fields.find(f=>f.label.endsWith('employer')).update('Updated employer');
 assert.equal(fieldAtPath(ed,'experience[e1].employer').value,'Updated employer');
 assert.equal(fieldAtPath(ed,'education[d1].school').value,'Example University');
 assert.equal(fieldAtPath(ed,'skills').fields.length,3);
});
test('export/import portable designs requires confirmation and preserves existing records',()=>{
 const original=storage(),remote=storage();
 saveDesign(original,'My navy',newEditor().snapshot().appearance);
 const text=exportDesigns(original),preview=previewDesignImport(text);
 assert.equal(preview.count,1);assert.equal(preview.designs[0].name,'My navy');
 assert.ok(!text.includes('Ada Example'));
 assert.throws(()=>importDesigns(remote,text),/confirmation/);
 assert.equal(remote.getItem(DESIGN_KEY),null);
 assert.equal(importDesigns(remote,text,{confirmed:true}),1);
 assert.equal(readDesigns(remote).length,1);
 const old=remote.getItem(DESIGN_KEY);
 assert.throws(()=>importDesigns(remote,text,{confirmed:true}),/same name/);
 assert.equal(remote.getItem(DESIGN_KEY),old);
});
test('untrusted import with CV data, duplicate names or oversized files fails closed',()=>{
 const mem=storage(),valid={format:'ledger-cv-appearance-library',version:1,designs:[{name:'One',appearance:{template:'modern'}}]};
 assert.throws(()=>previewDesignImport(JSON.stringify({...valid,document:{summary:'private'}})),/Unsupported/);
 assert.throws(()=>previewDesignImport(JSON.stringify({...valid,designs:[...valid.designs,...valid.designs]})),/Duplicate/);
 assert.throws(()=>previewDesignImport('x'.repeat(128001)),/128 KB/);
 assert.throws(()=>importDesigns(mem,JSON.stringify(valid),{confirmed:false}),/confirmation/);
 assert.equal(mem.getItem(DESIGN_KEY),null);
});

test('seven template families use differentiated printable page accents without affecting text flow',()=>{
 const doc=SAMPLE_DOC(),styles=['modern','executive','creative','ats-classic','academic','minimal','professional'];
 const signatures=new Set();
 for(const template of styles){
  const a={template},layout=layoutDocument(doc,a),decor=pageDecorations(layout.style,layout.paper);
  signatures.add(layout.style.family+':'+layout.style.pageAccent);
  for(const d of decor){
   assert.ok(d.x>=0&&d.y>=0&&d.x+d.width<=layout.paper.width);
   assert.ok(d.y+d.height<=layout.paper.height);
  }
  const baseline=layoutDocument(doc,{template,pageAccent:'none'});
  assert.deepEqual(layout.pages.map(pg=>pg.map(l=>[l.text,l.x,l.y])),
   baseline.pages.map(pg=>pg.map(l=>[l.text,l.x,l.y])));
 }
 assert.equal(signatures.size,7);
 const creative=layoutDocument(doc,{template:'creative'});
 assert.equal(creative.style.pageAccent,'side-rail');
 assert.ok(pageDecorations(creative.style,creative.paper).length>0);
 const technical=layoutDocument(doc,{template:'ats-classic'});
 assert.equal(technical.style.pageAccent,'corner-marks');
 assert.equal(pageDecorations(technical.style,technical.paper).length,8);
 const word=renderDocumentArtifact({id:'x',revision:1,name:'test',document:doc,appearance:{template:'modern'}},'docx');
 assert.equal(word.warnings.length,0);
 assert.ok(new TextDecoder().decode(word.bytes).includes('w:pgBorders'));
 const corners=renderDocumentArtifact({id:'y',revision:1,name:'test',document:doc,appearance:{template:'ats-classic'}},'docx');
 assert.ok(corners.warnings.some(w=>w.includes('PDF-only')));
});

test('applying an appearance to the master CV requires explicit owner consent',()=>{
 const store={mode:'persistent',selectedCV:{id:'master'},profile:{master:{id:'master'}},masterEditConfirmed:false,
  confirmMasterEditing(value){this.masterEditConfirmed=value===true;return this.masterEditConfirmed}};
 const previous=globalThis.confirm;
 try{
  globalThis.confirm=()=>false;
  assert.equal(confirmDesignEditing({store}),false);
  assert.equal(store.masterEditConfirmed,false);
  globalThis.confirm=()=>true;
  assert.equal(confirmDesignEditing({store}),true);
  assert.equal(store.masterEditConfirmed,true);
  globalThis.confirm=()=>{throw Error('Already approved; confirmation should not recur')};
  assert.equal(confirmDesignEditing({store}),true);
  assert.equal(confirmDesignEditing({store:{...store,mode:'preview'}}),true);
 }finally{globalThis.confirm=previous}
});
