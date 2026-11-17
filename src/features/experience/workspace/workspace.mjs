/**
 * Ledger workspace: composed, responsive shell for the new modules (preview build).
 * Hash router, theme, command palette, toasts. Uses only public APIs of the other workstreams.
 * Does not touch the legacy app or its storage keys.
 */
import {el,icon,createToaster} from './ui.mjs';
import {createStore} from './store.mjs';
import {createPersistentWorkspaceStore} from '../../../core/workspace-persistence.mjs';
import {download} from './ui.mjs';
import {homeView,editorView,templatesView,checkView,jobsView,exportAs} from './views.mjs';
const ROUTES=[['home','Home','home'],['editor','Edit','edit'],['templates','Templates','grid'],['check','Check','check'],['jobs','Jobs','board']];
const DRAFT_KEY='ledger_workspace_preview_draft_v1';
export async function mountWorkspace(root,{storage=globalThis.localStorage,sample=false,profileRepository,applicationRepository}={}){
 let store;
 try{
  store=sample?createStore({storage,sample}):await createPersistentWorkspaceStore({storage,profileRepository,applicationRepository});
 }catch(e){
  const msg=el('section',{class:'lw ledger-a11y',role:'alert'},
   el('h1',{},'Saved workspace is unavailable'),
   el('p',{},'Your existing CVs have not been changed. Storage did not open safely: '+(e.message||'unknown error')+'. Retry after checking browser permissions.'),
   el('button',{type:'button',on:{click:()=>location.reload()}},'Retry opening workspace'));
  root.replaceChildren(msg);
  return {store:null,error:e,destroy(){root.replaceChildren()}};
 }
 root.classList.add('lw','ledger-a11y');
 const mq=typeof matchMedia==='function'?matchMedia('(prefers-color-scheme: dark)'):null;
 const applyTheme=()=>{const t=store.theme;root.dataset.theme=t||(mq?.matches?'dark':'light');themeBtn.setAttribute('aria-pressed',String(root.dataset.theme==='dark'));};
 const draftStore={load:()=>{try{return storage?.getItem(DRAFT_KEY);}catch{return null;}},save:s=>{try{storage?.setItem(DRAFT_KEY,s);}catch{}},clear:()=>{try{storage?.removeItem(DRAFT_KEY);}catch{}}};
 const toaster=createToaster(root);
 const main=el('main',{class:'lw-main',id:'main'});
 const nav=el('nav',{class:'lw-nav','aria-label':'Main'});
 const themeBtn=el('button',{type:'button',class:'lw-btn icon ghost','aria-label':'Dark mode','aria-pressed':'false',on:{click:()=>{store.setTheme(root.dataset.theme==='dark'?'light':'dark');applyTheme();}}},icon('moon'));
 const palBtn=el('button',{type:'button',class:'lw-btn ghost','aria-haspopup':'dialog',on:{click:()=>openPalette()}},icon('search'),el('span',{class:'lw-visually-hidden'},'Search and commands'),el('kbd',{'aria-hidden':'true'},'Ctrl K'));
 const bar=el('header',{class:'lw-bar'},el('a',{class:'lw-brand',href:'#/home'},el('span',{class:'lw-logo','aria-hidden':'true'},'L'),'Ledger CV Studio'),palBtn,themeBtn);
 const danger=el('section',{class:'lw-storage-warning',role:'alert'});
 const showStorage=()=>{
  if(store.mode!=='persistent')return;
  const a=store.status,b=store.applicationStatus;
  if(a.state!=='error'&&b.state!=='error'){danger.replaceChildren();danger.hidden=true;return}
  danger.hidden=false;
  const message=a.state==='error'?(a.detail||'Your CV could not be saved; another tab or storage restriction may have changed the record.'):
   'Your applications could not be saved. Export your unsaved draft before reloading.';
  danger.replaceChildren(el('strong',{},'Unsaved changes — '+(a.error||b.error)),
   el('p',{},message+' Your data remains in this tab, not safely stored.'),
   el('button',{type:'button',class:'lw-btn',on:{click:()=>{
    download(store.exportDraft(),'ledger-unsaved-draft.json','application/json');
   }}},'Download unsaved draft'),
   el('a',{class:'lw-btn',href:'#/home'},'Open recovery controls'));
 };
 root.append(el('a',{class:'lw-skip',href:'#main',on:{click:e=>{e.preventDefault();main.focus();}}},'Skip to content'),el('div',{class:'lw-shell'},bar,danger,nav,main));
 const offStorage=store.subscribe(showStorage);showStorage();
 const unload=e=>{if(store.mode==='persistent'&&store.hasUnsavedWork()){e.preventDefault();e.returnValue=''}};
 window.addEventListener('beforeunload',unload);
 main.tabIndex=-1;
 const ul=el('ul',{});nav.append(ul);
 const links={};
 for(const [id,label,ic] of ROUTES){const a=el('a',{href:'#/'+id},icon(ic),label);links[id]=a;ul.append(el('li',{},a));}
 const ctx={store,draftStore,toast:m=>toaster.show(m),go:h=>{location.hash=h;},goField:path=>{current.id!=='editor'?(pending=path,location.hash='#/editor'):current.view.focusPath?.(path);}};
 let current={id:null,view:null},pending=null;
 const views={home:homeView,editor:editorView,templates:templatesView,check:checkView,jobs:jobsView};
 function render(){
  const id=(location.hash.match(/^#\/(\w+)/)||[])[1],route=views[id]?id:'home';
  current.view?.destroy?.();main.replaceChildren();
  const v=views[route](ctx);current={id:route,view:v};main.append(v.node);
  for(const [k,a] of Object.entries(links)){k===route?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current');}
  document.title=ROUTES.find(r=>r[0]===route)[1]+' · Ledger CV Studio';
  const h=main.querySelector('#page-title');
  if(pending&&route==='editor'){const p=pending;pending=null;requestAnimationFrame(()=>v.focusPath?.(p));}
  else if(h&&root.dataset.navFocus!=='off')h.focus({preventScroll:false});
 }
 /* ---- command palette ---- */
 const dlg=el('dialog',{class:'lw-palette','aria-label':'Search and commands'}),input=el('input',{type:'text',role:'combobox','aria-expanded':'true','aria-controls':'pal-list','aria-autocomplete':'list','aria-label':'Type a command',placeholder:'Type a command or page…',autocomplete:'off'}),list=el('ul',{id:'pal-list',role:'listbox','aria-label':'Commands'});
 dlg.append(input,list);root.append(dlg);
 const cmds=()=>[
  ...ROUTES.map(([id,label])=>({label:'Go to '+label,run:()=>ctx.go('#/'+id)})),
  {label:'Download PDF',hint:'PDF',run:()=>exportAs(ctx,'pdf')},{label:'Download Word document',hint:'DOCX',run:()=>exportAs(ctx,'docx')},
  {label:'Undo last change',run:()=>store.editor.undo()},{label:'Redo',run:()=>store.editor.redo()},
  {label:root.dataset.theme==='dark'?'Switch to light mode':'Switch to dark mode',run:()=>{store.setTheme(root.dataset.theme==='dark'?'light':'dark');applyTheme();}},
  {label:'Add an application',run:()=>{ctx.go('#/jobs');setTimeout(()=>main.querySelector('.lw-page-head .primary')?.click(),60);}}];
 let shown=[],sel=0;
 const drawList=()=>{const q=input.value.trim().toLowerCase();shown=cmds().filter(c=>!q||c.label.toLowerCase().includes(q));sel=Math.min(sel,Math.max(shown.length-1,0));list.replaceChildren();
  shown.forEach((c,i)=>list.append(el('li',{role:'option',id:'pal-'+i,'aria-selected':String(i===sel),on:{click:()=>choose(i),mousemove:()=>{sel=i;mark();}}},c.label,c.hint?el('kbd',{},c.hint):null)));
  if(!shown.length)list.append(el('li',{role:'option','aria-disabled':'true','aria-selected':'false'},'No matching commands'));mark();};
 const mark=()=>{[...list.children].forEach((li,i)=>li.setAttribute('aria-selected',String(i===sel&&shown.length>0)));input.setAttribute('aria-activedescendant',shown.length?'pal-'+sel:'');};
 const choose=i=>{const c=shown[i];if(!c)return;dlg.close();c.run();};
 input.addEventListener('input',()=>{sel=0;drawList();});
 input.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();sel=Math.min(sel+1,shown.length-1);mark();}else if(e.key==='ArrowUp'){e.preventDefault();sel=Math.max(sel-1,0);mark();}else if(e.key==='Enter'){e.preventDefault();choose(sel);}});
 function openPalette(){input.value='';sel=0;drawList();if(!dlg.open)dlg.showModal();input.focus();}
 const onKey=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();dlg.open?dlg.close():openPalette();}};
 document.addEventListener('keydown',onKey);
 window.addEventListener('hashchange',render);
 mq?.addEventListener?.('change',applyTheme);
 applyTheme();render();
 return {store,openPalette,destroy(){current.view?.destroy?.();document.removeEventListener('keydown',onKey);window.removeEventListener('hashchange',render);window.removeEventListener('beforeunload',unload);mq?.removeEventListener?.('change',applyTheme);offStorage();store.close?.();toaster.destroy();root.replaceChildren();}};
}
