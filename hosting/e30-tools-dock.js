/* Ledger E30: consolidated workspace tool dock.
 * Enhancement only: relocates existing button nodes with attached listeners.
 * Never clones a button, invokes a private feature, edits CV data or storage.
 */
(function(){
 'use strict';
 const ids=['ledgerE3Launcher','ledgerS5Launcher','ledgerE4Launcher',
  'ledgerS6Launcher','ledgerS7Launcher','ledgerS8Launcher'];
 let dock,menu,toggle,observer,pending=false;
 function setOpen(next,focusToggle){
  if(!menu||!toggle)return;
  menu.hidden=!next;
  toggle.setAttribute('aria-expanded',String(next));
  if(focusToggle)toggle.focus();
 }
 function install(){
  if(document.getElementById('ledgerE30Dock'))return;
  dock=document.createElement('div');dock.id='ledgerE30Dock';
  toggle=document.createElement('button');toggle.type='button';
  toggle.className='e30-tools-toggle';toggle.id='ledgerE30Toggle';
  toggle.textContent='Workspace tools';
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-haspopup','true');
  toggle.setAttribute('aria-controls','ledgerE30ToolsPanel');
  menu=document.createElement('section');menu.id='ledgerE30ToolsPanel';
  menu.className='e30-tools-panel';menu.hidden=true;
  menu.setAttribute('role','group');menu.setAttribute('aria-label','Workspace tools');
  const title=document.createElement('h2');title.className='e30-tools-heading';
  title.textContent='Workspace tools';menu.append(title);
  dock.append(menu,toggle);document.body.append(dock);
  toggle.addEventListener('click',()=>setOpen(menu.hidden));
  menu.addEventListener('click',event=>{
   if(event.target.closest('button')&&!event.target.closest('button').disabled)setOpen(false);
  });
  document.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&!menu.hidden&&
     !document.querySelector('.modal-overlay.active,.e3-overlay,.e4-overlay,.ledger-s5-backdrop,.ledger-s7-overlay,.e5-overlay')){
    event.preventDefault();setOpen(false,true);
   }
  });
  document.addEventListener('pointerdown',event=>{
   if(!menu.hidden&&!dock.contains(event.target))setOpen(false);
  },true);
  function refresh(){
   pending=false;if(!dock.isConnected)return;
   for(const id of ids){
    const element=document.getElementById(id);
    if(element&&element.parentElement!==menu){
     // Preserves the exact existing node and its original click behavior.
     element.dataset.e30OriginalAction='preserved';
     menu.append(element);
    }
   }
   // The launcher may have been removed/replaced by legacy code.
   toggle.hidden=menu.querySelectorAll('button:not([hidden])').length===0;
  }
  function schedule(){
   if(pending)return;pending=true;
   requestAnimationFrame(refresh);
  }
  observer=new MutationObserver(records=>{
   // Avoid a full DOM scan for text edits and deep CV preview rerenders.
   if(records.some(r=>r.type==='childList'&&
      Array.from(r.addedNodes).some(n=>n.nodeType===1&&(
       ids.includes(n.id)||n.querySelector?.(ids.map(id=>'#'+id).join(',')))))){
    schedule();
   }
  });
  observer.observe(document.body,{childList:true,subtree:true});
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
 else install();
})();
