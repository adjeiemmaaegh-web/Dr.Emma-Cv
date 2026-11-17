import test from 'node:test';
import assert from 'node:assert/strict';
import {createEditor} from '../../src/features/editor/editor-state.mjs';
import {SAMPLE_DOC} from '../../src/features/experience/workspace/store.mjs';
import {readDesigns,saveDesign,removeDesign,DESIGN_KEY} from '../../src/features/templates/design-library.mjs';
import {resolveStyle,normalizeAppearance,FAMILIES,listTemplates} from '../../src/features/templates/registry.mjs';
import {layoutDocument,buildBlocks,decorationGeometry} from '../../src/features/documents/layout.mjs';
import {renderDocumentArtifact,renderPreview} from '../../src/features/export/export-service.mjs';
function storage(){
 const map=new Map();
 return {map,getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>{map.set(k,String(v))}};
}
const editor=()=>createEditor({document:SAMPLE_DOC(),appearance:{template:'modern'}});
test('custom appearance controls are validated and affect shared PDF layout',()=>{
 const ed=editor();
 ed.setAppearance({bodySize:12,leading:1.6,marginSize:40,sectionGap:16,headerScale:2.7,ruleStyle:'double'});
 const s=ed.snapshot(),st=resolveStyle(s.appearance),layout=layoutDocument(s.document,s.appearance);
 assert.equal(st.size,12);assert.equal(st.lineHeight,1.6);assert.equal(st.margin,40);
 assert.equal(st.sectionGap,16);assert.equal(st.headerScale,2.7);assert.equal(st.rules,'double');
 assert.ok(layout.pages[0][0].size>25);
 assert.throws(()=>ed.setAppearance({bodySize:200}),/Unsupported bodySize/);
 assert.equal(ed.snapshot().appearance.bodySize,12);
 ed.undo();assert.equal(ed.snapshot().appearance.bodySize,undefined);
 ed.redo();assert.equal(ed.snapshot().appearance.bodySize,12);
});
test('hidden sections remain in the document and section order is undoable',()=>{
 const ed=editor(),before=ed.snapshot().document.experience.length;
 ed.setAppearance({enabledSections:{experience:false}});
 const blocks=buildBlocks(ed.snapshot().document,ed.snapshot().appearance).blocks;
 assert.ok(!blocks.some(x=>x.kind==='section-title'&&x.text==='Experience'));
 assert.equal(ed.snapshot().document.experience.length,before);
 ed.moveSection('skills',-1);
 assert.ok(ed.snapshot().appearance.sectionOrder.indexOf('skills')<ed.snapshot().appearance.sectionOrder.indexOf('education'));
 ed.undo();ed.undo();
 assert.ok(buildBlocks(ed.snapshot().document,ed.snapshot().appearance).blocks.some(x=>x.text==='Experience'));
});
test('custom sections can be added, renamed and printed with editable metadata',()=>{
 const ed=editor(),id=ed.addItem('customSections',{title:'Volunteer leadership',content:'<ul><li>Mentored trainees</li></ul>'});
 ed.updateItem('customSections',id,{title:'Community leadership'});
 const layout=layoutDocument(ed.snapshot().document,ed.snapshot().appearance);
 assert.ok(layout.pages.flat().some(x=>x.text==='Community leadership'&&x.sourcePath==='customSections['+id+'].title'));
 assert.ok(layout.pages.flat().some(x=>x.text==='Mentored trainees'&&x.sourcePath==='customSections['+id+'].content'));
 assert.ok(layout.pages.flat().some(x=>x.sourcePath==='summary'));
});
test('families are distinct in printable geometry, not only gallery colour',()=>{
 const ed=editor(),doc=ed.snapshot().document;
 assert.equal(FAMILIES.length,7);
 const executive=layoutDocument(doc,{template:'prestige'}),classic=layoutDocument(doc,{template:'professional'}),minimal=layoutDocument(doc,{template:'minimal'});
 const ex=executive.pages.flat().find(x=>x.kind==='section-title');
 const cl=classic.pages.flat().find(x=>x.kind==='name');
 const mi=minimal.pages.flat().find(x=>x.kind==='section-title');
 assert.equal(decorationGeometry(ex,executive.style).length,2);
 assert.equal(decorationGeometry(cl,classic.style)[0].kind,'rect');
 assert.equal(decorationGeometry(mi,minimal.style).length,0);
});
test('PDF and preview share exactly the positioned pages and page counts',()=>{
 const ed=editor(),s=ed.snapshot();
 ed.setAppearance({bodySize:11,leading:1.45,sectionGap:14,ruleStyle:'bar'});
 const v=ed.snapshot(),preview=renderPreview(v.document,v.appearance);
 const pdf=renderDocumentArtifact({id:'test',revision:0,name:'Test',...v},'pdf');
 assert.equal(pdf.pageCount,preview.pageCount);
 assert.equal(pdf.text,preview.text);
 assert.equal(String.fromCharCode(...pdf.bytes.slice(0,8)),'%PDF-1.4');
});
test('reusable design stores appearance only and applies undoably',()=>{
 const st=storage(),ed=editor();
 ed.setAppearance({template:'prestige',bodySize:12.5,enabledSections:{references:false},sectionOrder:['skills','summary','experience']});
 const original=ed.snapshot().appearance,item=saveDesign(st,'My layout',original);
 const raw=st.map.get(DESIGN_KEY);
 assert.ok(raw.includes('My layout'));
 assert.ok(!raw.includes('Ada')&&!raw.includes('Operations manager'));
 assert.equal(readDesigns(st)[0].appearance.bodySize,12.5);
 ed.setAppearance({template:'minimal',bodySize:9.5});
 ed.replaceAppearance(readDesigns(st)[0].appearance);
 assert.deepEqual(ed.snapshot().appearance,original);
 ed.undo();assert.equal(ed.snapshot().appearance.template,'minimal');
 removeDesign(st,item.id);assert.equal(readDesigns(st).length,0);
});
test('unreadable libraries and storage failures never silently overwrite',()=>{
 const st=storage();st.setItem(DESIGN_KEY,'broken json');
 assert.throws(()=>saveDesign(st,'new',{template:'modern'}),/unreadable/);
 assert.equal(st.getItem(DESIGN_KEY),'broken json');
 assert.throws(()=>saveDesign({getItem:()=>null,setItem:()=>{}},'new',{template:'modern'}),/did not confirm/);
 assert.ok(normalizeAppearance({leading:3}).errors.length>0);
});
