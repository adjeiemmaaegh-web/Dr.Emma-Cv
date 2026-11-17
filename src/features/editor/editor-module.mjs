/**
 * Group B FeatureModule: accessible direct-edit CV editor with live preview.
 * Registered through Group A's feature registry; disabled until A composes it. Uses DOM APIs only (no innerHTML with data).
 * services.documentSource = {load():{document,appearance}|Promise, save({document,appearance}):Promise}
 */
import {createEditor} from './editor-state.mjs';
import {renderPreview} from '../export/export-service.mjs';
import {listTemplates,applyTemplate,OPTIONS} from '../templates/registry.mjs';
const el=(tag,attrs={},...kids)=>{const n=document.createElement(tag);
 for(const [k,v] of Object.entries(attrs)){if(k==='on')for(const [e,f] of Object.entries(v))n.addEventListener(e,f);else if(v!==false&&v!==undefined)n.setAttribute(k,v===true?'':v);}
 for(const k of kids)n.append(k);return n;};
const PERSONAL=[['firstName','First name'],['lastName','Last name'],['title','Professional title'],['email','Email'],['phone','Phone'],['city','City'],['linkedin','LinkedIn'],['website','Website']];
const SECTION_FIELDS={experience:[['title','Job title'],['employer','Employer'],['start','Start'],['end','End'],['description','Responsibilities and achievements']],
 education:[['degree','Qualification'],['school','School'],['start','Start'],['end','End']],skills:[['name','Skill']]};
export const editorFeature=Object.freeze({
 id:'cv-editor',dependencies:[],
 async mount({host,services}){
  const root=host;if(!root||typeof root.append!=='function')throw new TypeError('DOM host is required');
  const source=services.documentSource;if(!source)throw new TypeError('services.documentSource is required');
  const initial=await source.load();
  const editor=createEditor(initial);
  const status=el('p',{role:'status','aria-live':'polite'}),preview=el('div',{class:'cv-preview',role:'document','aria-label':'Live CV preview',tabindex:'0'});
  const form=el('div',{class:'cv-editor-form'});
  const undo=el('button',{type:'button',on:{click:()=>editor.undo()}},'Undo'),redo=el('button',{type:'button',on:{click:()=>editor.redo()}},'Redo');
  let saving=false;
  const save=el('button',{type:'button',on:{click:async()=>{
   if(saving)return;
   const snap=editor.snapshot(),acknowledged={document:snap.document,appearance:snap.appearance};
   saving=true;save.disabled=true;
   try{
    await source.save(acknowledged);
    // Only acknowledge the exact payload written. A newer on-screen edit
    // stays dirty if the asynchronous storage write finishes afterwards.
    editor.markSaved(acknowledged);
    status.textContent=editor.snapshot().dirty?
     'Saved an earlier version; your newer edits are still unsaved.':'Saved.';
   }catch(e){
    status.textContent='Not saved: '+(e&&e.message||'storage error')+'. Your edits are still here; export a backup.';
   }finally{saving=false;save.disabled=false}
  }}},'Save');
  const tpl=el('select',{'aria-label':'Template',on:{change:e=>editor.setAppearance(applyTemplate(editor.snapshot().appearance,e.target.value))}},
   ...listTemplates().map(t=>el('option',{value:t.id},t.name+' ('+t.family+')')));
  const paper=el('select',{'aria-label':'Paper size',on:{change:e=>editor.setAppearance({paper:e.target.value})}},...OPTIONS.paper.map(p=>el('option',{value:p},p)));
  const field=(label,value,onInput,multi)=>{const c=multi?el('textarea',{rows:'3'}):el('input',{type:'text'});c.value=value||'';
   c.addEventListener('input',()=>onInput(c.value));return el('label',{},label+' ',c);};
  function build(snap){
   // Rebuild only when structure changes; typing never rebuilds focused inputs.
   const active=root.contains(document.activeElement)&&document.activeElement.dataset.key;
   form.replaceChildren();
   const p=el('fieldset',{},el('legend',{},'Personal details'));
   for(const [k,l] of PERSONAL){const f=field(l,snap.document.personalInfo[k],v=>editor.setPersonal(k,v));f.querySelector('input').dataset.key='p-'+k;p.append(f);}
   form.append(p,el('fieldset',{},el('legend',{},'Summary'),field('Summary',snap.document.summary,v=>editor.setText('summary',v),true)));
   for(const [section,fields] of Object.entries(SECTION_FIELDS)){
    const fs=el('fieldset',{},el('legend',{},section[0].toUpperCase()+section.slice(1)));
    snap.document[section].forEach((item,i)=>{
     const row=el('div',{class:'cv-item',role:'group','aria-label':section+' '+(i+1)});
     for(const [k,l] of fields){const f=field(l,item[k],v=>editor.updateItem(section,item.id,{[k]:v}),k==='description');
      (f.querySelector('input,textarea')).dataset.key=item.id+k;row.append(f);}
     row.append(el('button',{type:'button','aria-label':'Move '+section+' '+(i+1)+' up',on:{click:()=>editor.moveItem(section,item.id,-1)}},'Move up'),
      el('button',{type:'button','aria-label':'Move '+section+' '+(i+1)+' down',on:{click:()=>editor.moveItem(section,item.id,1)}},'Move down'),
      el('button',{type:'button','aria-label':'Remove '+section+' '+(i+1)+' (can be undone)',on:{click:()=>editor.removeItem(section,item.id)}},'Remove'));
     fs.append(row);
    });
    fs.append(el('button',{type:'button',on:{click:()=>editor.addItem(section,{})}},'Add '+section));form.append(fs);
   }
   if(active){const n=form.querySelector('[data-key="'+active+'"]');if(n)n.focus();}
  }
  let lastShape='';
  const shape=s=>JSON.stringify(['experience','education','skills'].map(k=>s.document[k].map(i=>i.id)));
  function draw(snap){
   undo.disabled=!snap.canUndo;redo.disabled=!snap.canRedo;
   if(shape(snap)!==lastShape){lastShape=shape(snap);build(snap);}
   tpl.value=snap.appearance.template;paper.value=snap.appearance.paper;
   const r=renderPreview(snap.document,snap.appearance);
   preview.replaceChildren(...r.pages.map((pg,i)=>el('section',{'aria-label':'Page '+(i+1)+' of '+r.pageCount},...pg.map(l=>el('p',{},(l.bullet?'• ':'')+l.text+(l.right?' — '+l.right:''))))));
   if(snap.dirty)status.textContent='Unsaved changes';
  }
  const off=editor.subscribe(draw);
  const wrap=el('div',{class:'cv-editor'},el('div',{role:'toolbar','aria-label':'Editor actions'},undo,redo,tpl,paper,save),status,form,preview);
  root.append(wrap);draw(editor.snapshot());
  return ()=>{off();wrap.remove();};
 }
});
