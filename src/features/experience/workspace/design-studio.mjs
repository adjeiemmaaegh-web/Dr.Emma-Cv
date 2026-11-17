/** Fine-grained visual controls and on-document editing for the workspace. */
import {el,icon,download} from './ui.mjs';
import {SECTION_KEYS,NUMERIC_OPTIONS,OPTIONS,resolveStyle} from '../../templates/registry.mjs';
import {readDesigns,saveDesign,removeDesign,exportDesigns,previewDesignImport,importDesigns} from '../../templates/design-library.mjs';
import {htmlToLines} from '../../documents/layout.mjs';
const NAMES={summary:'Summary',experience:'Experience',education:'Education',skills:'Skills',certifications:'Certifications',languages:'Languages',projects:'Projects',accomplishments:'Accomplishments',hobbies:'Interests',references:'References'};
const PRECISION=[['Body size','bodySize',0.5,' pt'],['Line height','leading',0.05,'×'],['Section spacing','sectionGap',1,' pt'],['Page margin','marginSize',2,' pt'],
 ['Name scale','headerScale',0.1,'×'],['Section heading scale','headingScale',0.05,'×'],['Entry spacing','entryGap',1,' pt'],
 ['Paragraph spacing','paragraphGap',0.5,' pt'],['Divider weight','ruleWeight',0.2,' pt']];
const safe=(ctx,fn)=>{try{fn()}catch(e){ctx.toast(e.message||'Could not update the design')}};
const label=(name,input)=>el('label',{class:'lw-designer-control'},el('span',{},name),input);
export function designControls(ed,ctx){
 const a=ed.snapshot().appearance,style=resolveStyle(a),grid=el('div',{class:'lw-designer-grid'});
 const select=(name,key,options)=>{
  const input=el('select',{'data-appearance':key,'aria-label':name,on:{change:e=>safe(ctx,()=>ed.setAppearance({[key]:e.target.value}))}},
   ...options.map(([v,t])=>el('option',{value:v},t)));
  input.value=a[key]??'template';grid.append(label(name,input));
 };
 select('Font family','font',OPTIONS.font.map(x=>[x,x==='template'?'Template default':x==='sans'?'Clean sans-serif':'Editorial serif']));
 select('Header treatment','headerStyle',OPTIONS.headerStyle.map(x=>[x,x==='template'?'Template default':x]));
 select('Section dividers','ruleStyle',OPTIONS.ruleStyle.map(x=>[x,x==='template'?'Template default':x.replace(/-/g,' ')]));
 select('Column treatment','columns',OPTIONS.columns.map(x=>[x,x==='sidebar'?'Sidebar-inspired (single-column output)':x]));
 const defaults={bodySize:style.size,leading:style.lineHeight,sectionGap:style.sectionGap,marginSize:style.margin,headerScale:style.headerScale,
 headingScale:style.headingScale,entryGap:style.entryGap,paragraphGap:style.paragraphGap,ruleWeight:style.ruleWeight};
 for(const [name,key,step,unit] of PRECISION){
  const [min,max]=NUMERIC_OPTIONS[key],digits=['leading','headerScale','headingScale'].includes(key)?2:1;
  const output=el('output',{'data-output':key},Number(a[key]??defaults[key]).toFixed(digits)+unit);
  const input=el('input',{type:'range',min,max,step,'data-appearance':key,'aria-label':name,
   on:{input:e=>{output.textContent=Number(e.target.value).toFixed(digits)+unit;
    safe(ctx,()=>ed.setAppearance({[key]:Number(e.target.value)},{coalesceKey:key}));},
    change:()=>ed.endCoalescing()}});
  input.value=a[key]??defaults[key];
  grid.append(el('label',{class:'lw-designer-control'},el('span',{},name,' ',output),input));
 }
 const accent=el('input',{type:'color','data-appearance':'color','aria-label':'Custom accent',on:{input:e=>safe(ctx,()=>ed.setAppearance({color:e.target.value}))}});accent.value=a.color;
 grid.append(label('Custom accent',accent),
  el('button',{type:'button',class:'lw-btn sm',on:{click:()=>safe(ctx,()=>ed.setAppearance(Object.fromEntries(PRECISION.map(([,k])=>[k,null]))))}},'Reset precise typography'),
  el('p',{class:'lw-help lw-designer-wide'},'Preview uses the PDF layout engine. Word may paginate differently. Sidebar-inspired designs retain readable single-column exports.'));
 return grid;
}
export function sectionsControls(ed,ctx){
 const snap=ed.snapshot(),a=snap.appearance;
 const custom=new Map(snap.document.customSections.map(c=>['custom:'+c.id,c.title||c.name||'New section']));
 const keys=[...SECTION_KEYS,...custom.keys()];
 const order=[...(a.sectionOrder||[]).filter(k=>keys.includes(k))];
 for(const k of keys)if(!order.includes(k))order.push(k);
 const rows=el('div',{class:'lw-section-rows'});
 for(const [i,key] of order.entries()){
  const title=custom.get(key)||(NAMES[key]||key);
  const check=el('input',{type:'checkbox','aria-label':'Show '+title,on:{change:e=>safe(ctx,()=>ed.setAppearance({enabledSections:{...ed.snapshot().appearance.enabledSections,[key]:e.target.checked}}))}});
  check.checked=a.enabledSections?.[key]!==false;
  rows.append(el('div',{class:'lw-section-row','data-section-key':key},el('label',{},check,el('span',{},title)),
   el('button',{type:'button',class:'lw-btn sm icon','aria-label':'Move '+title+' up',disabled:i===0||undefined,on:{click:()=>safe(ctx,()=>ed.moveSection(key,-1))}},icon('up',{size:16})),
   el('button',{type:'button',class:'lw-btn sm icon','aria-label':'Move '+title+' down',disabled:i===order.length-1||undefined,on:{click:()=>safe(ctx,()=>ed.moveSection(key,1))}},icon('down',{size:16}))));
 }
 return el('div',{class:'lw-section-manager'},el('p',{class:'lw-help'},'Show, hide and reorder standard and custom sections. Hidden content is preserved and remains undoable.'),rows,
  el('button',{type:'button',class:'lw-btn sm',on:{click:()=>safe(ctx,()=>ed.addItem('customSections',{title:'New section',content:''}))}},icon('plus',{size:16}),'Add custom section'));
}
export function saveDesignControls(ed,ctx,storage=globalThis.localStorage){
 const input=el('input',{type:'text',maxlength:'80',placeholder:'My executive blue','aria-label':'Design name'});
 return el('div',{class:'lw-save-design'},el('p',{class:'lw-help'},'Save the appearance only (never CV text). Stored in this browser.'),
  el('div',{class:'lw-row'},input,el('button',{type:'button',class:'lw-btn sm',on:{click:()=>safe(ctx,()=>{const d=saveDesign(storage,input.value,ed.snapshot().appearance);ctx.toast('Saved design “'+d.name+'” on this device.');input.value='';})}},'Save reusable design')));
}
export function savedDesignGallery(ctx,storage=globalThis.localStorage){
 const root=el('section',{class:'lw-card lw-saved-designs','aria-label':'Saved designs'}),list=el('div',{class:'lw-saved-design-list'});
 function draw(){
  list.replaceChildren();let designs;
  try{designs=readDesigns(storage)}catch(e){list.append(el('p',{role:'alert'},e.message));return}
  if(!designs.length){list.append(el('p',{class:'lw-help'},'No saved designs yet. Use Edit → Look and layout → Save reusable design.'));return}
  for(const d of designs)list.append(el('div',{class:'lw-design-item'},
   el('span',{class:'lw-design-swatch',style:'background:'+d.appearance.color}),el('strong',{},d.name),
   el('button',{type:'button',class:'lw-btn sm',on:{click:()=>safe(ctx,()=>{ctx.store.editor.replaceAppearance(d.appearance);ctx.toast('Applied “'+d.name+'”. Undo restores the previous look.');ctx.go('#/editor');})}},'Apply'),
   el('button',{type:'button',class:'lw-btn sm ghost danger','aria-label':'Delete '+d.name,on:{click:()=>{if(!confirm('Delete design “'+d.name+'”? CV content stays unchanged.'))return;safe(ctx,()=>{removeDesign(storage,d.id);draw()});}}},'Delete')));
 }
 const file=el('input',{type:'file',accept:'.json,application/json','aria-label':'Import saved designs JSON',on:{change:async e=>{
  const selected=e.target.files?.[0];if(!selected)return;
  try{
   if(selected.size>128000)throw Error('Design export is too large (128 KB maximum)');
   const json=await selected.text(),preview=previewDesignImport(json);
   if(!confirm('Import '+preview.count+' reviewed appearance preset'+(preview.count===1?'':'s')+'? Existing designs will not be overwritten.'))return;
   importDesigns(storage,json,{confirmed:true});
   draw();ctx.toast('Imported '+preview.count+' appearance preset'+(preview.count===1?'':'s')+'.');
  }catch(error){ctx.toast('Import blocked: '+(error?.message||'invalid file'))}
  finally{e.target.value=''}
 }}});
 const actions=el('div',{class:'lw-design-library-actions'},
  el('button',{type:'button',class:'lw-btn sm',on:{click:()=>safe(ctx,()=>{
   if(!readDesigns(storage).length)throw Error('Save a design before exporting');
   download(exportDesigns(storage),'ledger-cv-appearance-designs.json','application/json');
   ctx.toast('Exported appearance presets only — no CV content.');
  })}},'Export designs'),
  label('Import designs (JSON)',file));
 root.append(el('h2',{},'My saved designs'),el('p',{class:'lw-help'},'Reusable local appearance presets. Export them for a different device or import a reviewed design-only JSON file. Your CV content is never included.'),actions,list);
 draw();return root;
}
const lines=html=>htmlToLines(html||'').map(l=>l.text).join('\n');
const escapeHtml=x=>String(x).replace(/[&<>]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]));
const toList=t=>'<ul>'+t.split(/\n/).map(x=>x.trim()).filter(Boolean).map(x=>'<li>'+escapeHtml(x.replace(/^[•*-]\s*/,''))+'</li>').join('')+'</ul>';
/** Read a field without copying the full document for every control refresh. */
export function fieldAtPath(ed,path,doc=ed.snapshot().document){
 if(path==='personalInfo.name')return {label:'Full name',fields:['firstName','lastName'].map(k=>fieldAtPath(ed,'personalInfo.'+k,doc))};
 if(path==='personalInfo.contact')return {label:'Contact information',fields:['email','phone','city','linkedin','website'].map(k=>fieldAtPath(ed,'personalInfo.'+k,doc))};
 if(path.startsWith('personalInfo.')){
  const k=path.slice('personalInfo.'.length);
  if(!['firstName','lastName','title','email','phone','city','linkedin','website','postcode'].includes(k))return null;
  return {label:k.replace(/([A-Z])/g,' $1'),value:doc.personalInfo[k]||'',update:v=>ed.setPersonal(k,v)};
 }
 if(['summary','hobbies','references'].includes(path))return {label:NAMES[path],value:doc[path]||'',area:true,update:v=>ed.setText(path,v)};
 if(path==='skills'){
  return {label:'Skills',fields:(doc.skills||[]).map((it,i)=>({label:'Skill '+(i+1),value:it.name||'',update:v=>ed.updateItem('skills',it.id,{name:v})}))};
 }
 const m=/^(experience|education|skills|customSections)\[([^\]]+)\]\.(\w+)$/.exec(path);
 if(!m)return null;
 const [,section,id,k]=m,item=doc[section]?.find(it=>it.id===id);
 if(!item)return null;
 if(k==='meta'){
  const fields=section==='experience'?['title','employer','start','end','location']:
   section==='education'?['degree','school','start','end']:[];
  return fields.length?{label:section==='experience'?'Role and dates':'Qualification and dates',
   fields:fields.map(key=>fieldAtPath(ed,section+'['+id+'].'+key,doc))}:null;
 }
 const valid={
  experience:['title','employer','start','end','location','description'],
  education:['degree','school','start','end','description'],
  skills:['name'],
  customSections:['title','content','name','description']
 };
 if(!valid[section].includes(k))return null;
 const rich=k==='description'||k==='content';
 return {label:(NAMES[section]||'Custom section')+' — '+k,value:rich?lines(item[k]):item[k]||'',
  area:rich,update:v=>ed.updateItem(section,id,{[k]:rich?toList(v):v})};
}
/** On-document contextual editor. A field group corresponds to the text visible on the page.
 * Its inputs are NOT rerendered on keystrokes, preserving focus and selection while preview updates.
 */
export function quickEditOnPage(host,ed,ctx){
 let panel=null;const close=()=>{panel?.remove();panel=null};
 function open(path,anchor){
  const field=fieldAtPath(ed,path);if(!field){close();return}
  close();
  const fields=field.fields||[field];
  panel=el('div',{class:'lw-inline-editor',role:'group','aria-label':'Edit text directly on CV'},
   el('strong',{},'Edit '+field.label));
  let first=null;
  for(const item of fields){
   if(!item)continue;
   const control=item.area?el('textarea',{rows:'4'}):el('input',{type:'text'});
   control.value=item.value??'';
   control.setAttribute('aria-label','Edit '+item.label);
   control.addEventListener('input',()=>safe(ctx,()=>item.update(control.value)));
   panel.append(label(item.label,control));
   first??=control;
  }
  panel.append(el('button',{type:'button',class:'lw-btn sm primary',on:{click:()=>{close();host.focus()}}},'Done'));
  const a=anchor.getBoundingClientRect(),b=host.getBoundingClientRect();
  const width=Math.min(360,Math.max(220,host.clientWidth-24));
  const left=Math.max(8,Math.min(host.clientWidth-width-8,a.left-b.left+host.scrollLeft));
  panel.style.width=width+'px';panel.style.left=left+'px';
  panel.style.top=Math.max(8,a.top-b.top+host.scrollTop+20)+'px';
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();host.focus()}});
  host.append(panel);first?.focus();first?.select?.();
 }
 return {open,close,destroy:close};
}
