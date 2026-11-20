/** Safe, keyboard-accessible occupation suggestions shared by the editor and beginner journey.
 * Examples do not change a CV until the user presses an explicit selection button.
 */
import {el} from '../experience/workspace/ui.mjs';
import {OCCUPATION_CATEGORIES,categoryRoles,resolveOccupation} from './occupation-content.mjs';

const option=(value,label)=>el('option',{value},label);
export function occupationPicker({title='',category='',role='',onChange}={}){
 const detected=resolveOccupation(title),selected=OCCUPATION_CATEGORIES.some(g=>g.id===category)?category:detected?.group||'';
 const chosenRole=role||title;
 const groupInput=el('select',{'aria-label':'Occupation category'},option('','Choose an occupation'));
 for(const item of OCCUPATION_CATEGORIES)groupInput.append(option(item.id,item.label));
 groupInput.value=selected;
 const roleInput=el('select',{'aria-label':'Occupation or job title'});
 function updateRoles(group,requested=''){
  roleInput.replaceChildren(option('','Choose a job title'));
  for(const name of categoryRoles(group))roleInput.append(option(name,name));
  const matches=categoryRoles(group).find(name=>name.toLowerCase()===String(requested).toLowerCase());
  roleInput.value=matches||'';
  roleInput.disabled=!group;
 }
 updateRoles(selected,chosenRole);
 const changed=source=>{
  const group=groupInput.value,choice=roleInput.value;
  onChange?.({category:group,role:choice,source});
 };
 groupInput.addEventListener('change',()=>{
  updateRoles(groupInput.value);
  changed('category');
 });
 roleInput.addEventListener('change',()=>changed('role'));
 return el('div',{class:'lw-occupation-picker'},
  el('div',{class:'lw-field'},el('label',{},'Occupation category'),groupInput),
  el('div',{class:'lw-field'},el('label',{},'Specific job title (optional)'),roleInput));
}

export function suggestionList({kind='summary',heading,items=[],onChoose,actionText='Use',expanded=false}={}){
 const root=el('details',{class:'lw-suggestions','data-suggestion-kind':kind});
 root.open=expanded;
 const summary=el('summary',{},heading||'Suggestions', ' (',String(items.length),')');
 const guidance=el('p',{class:'lw-help'},
  'Examples only. Choose only what is true for you, and edit any wording before sending your CV.');
 const search=el('input',{type:'search','aria-label':'Search '+kind+' examples',placeholder:'Filter examples…'});
 const list=el('div',{class:'lw-suggestion-list','aria-label':kind+' examples'});
 const status=el('p',{class:'lw-help',role:'status','aria-live':'polite'});
 function draw(){
  const q=search.value.trim().toLowerCase(),shown=items.filter(t=>t.toLowerCase().includes(q));
  list.replaceChildren();
  for(const [i,body] of shown.entries()){
   const btn=el('button',{type:'button',class:'lw-suggestion-choice',
    'aria-label':actionText+' '+kind+' example '+(i+1),
    on:{click:()=>onChoose?.(body)}},
    el('span',{class:'lw-suggestion-body'},body),
    el('span',{class:'lw-suggestion-action'},actionText));
   list.append(btn);
  }
  status.textContent=shown.length?shown.length+' examples available':'No matching examples';
 }
 search.addEventListener('input',draw);
 root.append(summary,el('div',{class:'lw-suggestion-inner'},guidance,search,list,status));
 draw();
 return root;
}
