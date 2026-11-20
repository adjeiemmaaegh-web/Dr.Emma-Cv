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

/** Cards mirror the Add/Remove reference: the action ribbon is part of a
 * single accessible button. The selected state comes from the live CV/draft,
 * not from a separate list that could drift out of sync after Undo.
 */
export function suggestionList({kind='summary',heading,items=[],onChoose,onRemove,
 isSelected=()=>false,getSelectionContext=()=>undefined,expanded=false}={}){
 const root=el('details',{class:'lw-suggestions','data-suggestion-kind':kind});
 root.open=expanded;
 const title=el('summary',{},heading||'Suggestions', ' (',String(items.length),')');
 const guidance=el('p',{class:'lw-help'},
  'Examples only. Add what is accurate for you, remove it if needed, and edit your CV before sending.');
 const search=el('input',{type:'search','aria-label':'Search '+kind+' examples',placeholder:'Search suggestions…'});
 const list=el('div',{class:'lw-suggestion-list','aria-label':kind+' examples'});
 const status=el('p',{class:'lw-help',role:'status','aria-live':'polite'});
 const noun=kind==='duties'?'duty':kind==='skills'?'skill':'summary';
 let shown=[];
 const cardState=(button,body,index,context)=>{
  const selected=Boolean(isSelected(body,context));
  button.dataset.selected=String(selected);
  button.setAttribute('aria-pressed',String(selected));
  button.setAttribute('aria-label',(selected?'Remove ':'Add ')+noun+' example '+(index+1));
  button.querySelector('.lw-suggestion-action').textContent=selected?'Remove':'Add';
 };
 const refresh=()=>{
  const context=getSelectionContext();
  for(const button of list.querySelectorAll('.lw-suggestion-choice')){
   const index=Number(button.dataset.index);
   cardState(button,shown[index],index,context);
  }
  const count=shown.filter(body=>isSelected(body,context)).length;
  status.textContent=shown.length+' example'+(shown.length===1?'':'s')+' available'+
   (count?' · '+count+' added':'');
 };
 function draw(){
  const q=search.value.trim().toLowerCase();
  shown=items.filter(t=>t.toLowerCase().includes(q));
  list.replaceChildren();
  for(const [i,body] of shown.entries()){
   const ribbon=el('span',{class:'lw-suggestion-action','aria-hidden':'true'},'Add');
   const button=el('button',{type:'button',class:'lw-suggestion-choice',
    'data-index':String(i),on:{click:()=>{
     if(isSelected(body,getSelectionContext()))onRemove?.(body);
     else onChoose?.(body);
     if(root.isConnected)refresh();
    }}},ribbon,el('span',{class:'lw-suggestion-body'},body));
   list.append(button);
  }
  refresh();
 }
 search.addEventListener('input',draw);
 root.refreshSelections=refresh;
 root.append(title,el('div',{class:'lw-suggestion-inner'},guidance,search,list,status));
 draw();
 return root;
}
