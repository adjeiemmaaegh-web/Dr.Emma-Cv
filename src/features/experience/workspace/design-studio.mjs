/** Fine-grained visual controls and on-document editing for the workspace. */
import {el,icon} from './ui.mjs';
import {SECTION_KEYS,NUMERIC_OPTIONS,OPTIONS,resolveStyle} from '../../templates/registry.mjs';
import {readDesigns,saveDesign,removeDesign} from '../../templates/design-library.mjs';
import {htmlToLines} from '../../documents/layout.mjs';
const NAMES={summary:'Summary',experience:'Experience',education:'Education',skills:'Skills',certifications:'Certifications',languages:'Languages',projects:'Projects',accomplishments:'Accomplishments',hobbies:'Interests',references:'References'};
const PRECISION=[['Body size','bodySize',0.5,' pt'],['Line height','leading',0.05,'×'],['Section spacing','sectionGap',1,' pt'],['Page margin','marginSize',2,' pt'],['Name scale','headerScale',0.1,'×']];
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
 const defaults={bodySize:style.size,leading:style.lineHeight,sectionGap:style.sectionGap,marginSize:style.margin,headerScale:style.headerScale};
 for(const [name,key,step,unit] of PRECISION){
  const [min,max]=NUMERIC_OPTIONS[key],digits=key==='leading'||key==='headerScale'?2:1;
  const output=el('output',{'data-output':key},Number(a[key]??defaults[key]).toFixed(digits)+unit);
  const input=el('input',{type:'range',min,max,step,'data-appearance':key,'aria-label':name,
   on:{input:e=>{output.textContent=Number(e.target.value).toFixed(digits)+unit;safe(ctx,()=>ed.setAppearance({[key]:Number(e.target.value)}));}}});
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
 const a=ed.snapshot().appearance,visibility=a.enabledSections||{},order=[...(a.sectionOrder||SECTION_KEYS)];
 for(const name of SECTION_KEYS)if(!order.includes(name))order.push(name);
 const rows=el('div',{class:'lw-section-rows'});
 for(const [i,key] of order.entries()){
  const check=el('input',{type:'checkbox','aria-label':'Show '+NAMES[key],on:{change:e=>safe(ctx,()=>ed.setAppearance({enabledSections:{...ed.snapshot().appearance.enabledSections,[key]:e.target.checked}}))}});check.checked=visibility[key]!==false;
  rows.append(el('div',{class:'lw-section-row'},el('label',{},check,el('span',{},NAMES[key])),
   el('button',{type:'button',class:'lw-btn sm icon','aria-label':'Move '+NAMES[key]+' up',disabled:i===0||undefined,on:{click:()=>safe(ctx,()=>ed.moveSection(key,-1))}},icon('up',{size:16})),
   el('button',{type:'button',class:'lw-btn sm icon','aria-label':'Move '+NAMES[key]+' down',disabled:i===order.length-1||undefined,on:{click:()=>safe(ctx,()=>ed.moveSection(key,1))}},icon('down',{size:16}))));
 }
 return el('div',{class:'lw-section-manager'},el('p',{class:'lw-help'},'Hide sections without deleting content, and change their printed reading order.'),rows,
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
 root.append(el('h2',{},'My saved designs'),el('p',{class:'lw-help'},'Reuse appearance presets on this device without copying personal CV content.'),list);draw();return root;
}
const lines=html=>htmlToLines(html||'').map(l=>l.text).join('\n');
const escapeHtml=x=>String(x).replace(/[&<>]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]));
const toList=t=>'<ul>'+t.split(/\n/).map(x=>x.trim()).filter(Boolean).map(x=>'<li>'+escapeHtml(x.replace(/^[•*-]\s*/,''))+'</li>').join('')+'</ul>';
export function fieldAtPath(ed,path){
 const doc=ed.snapshot().document;
 if(path.startsWith('personalInfo.')){
  const k=path.slice(13);if(!['firstName','lastName','title','email','phone','city','linkedin','website'].includes(k))return null;
  return {label:k,value:doc.personalInfo[k]||'',update:v=>ed.setPersonal(k,v)};
 }
 if(['summary','hobbies','references'].includes(path))return {label:NAMES[path],value:doc[path]||'',area:true,update:v=>ed.setText(path,v)};
 const m=/^(experience|education|customSections)\[([^\]]+)\]\.(\w+)$/.exec(path);
 if(!m)return null;
 const [,section,id,k]=m,item=doc[section]?.find(it=>it.id===id);
 if(!item||!['title','degree','location','description','content'].includes(k))return null;
 const rich=k==='description'||k==='content';
 return {label:(NAMES[section]||'Custom section')+' — '+k,value:rich?lines(item[k]):item[k]||'',area:rich,update:v=>ed.updateItem(section,id,{[k]:rich?toList(v):v})};
}
/** A transient context field stays anchored to the actual document page, not a separate form. */
export function quickEditOnPage(host,ed,ctx){
 let panel=null;const close=()=>{panel?.remove();panel=null};
 function open(path,anchor){
  const field=fieldAtPath(ed,path);if(!field){close();return}
  close();
  const control=field.area?el('textarea',{rows:'4'}):el('input',{type:'text'});
  control.value=field.value;control.setAttribute('aria-label','Edit '+field.label);
  control.addEventListener('input',()=>safe(ctx,()=>field.update(control.value)));
  panel=el('div',{class:'lw-inline-editor',role:'group','aria-label':'Edit text directly on CV'},
   el('strong',{},'Edit '+field.label),control,
   el('button',{type:'button',class:'lw-btn sm primary',on:{click:()=>{close();host.focus()}}},'Done'));
  const a=anchor.getBoundingClientRect(),b=host.getBoundingClientRect(),width=Math.min(340,Math.max(230,host.clientWidth-24));
  const left=Math.max(8,Math.min(host.clientWidth-width-8,a.left-b.left+host.scrollLeft));
  panel.style.width=width+'px';panel.style.left=left+'px';
  panel.style.top=Math.max(8,a.top-b.top+host.scrollTop+20)+'px';
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();host.focus()}});
  host.append(panel);control.focus();control.select?.();
 }
 return {open,close,destroy:close};
}
