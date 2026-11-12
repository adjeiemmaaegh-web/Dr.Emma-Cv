/* E30 accessibility-oriented consolidation of previously floating utility launchers.
 * Preserve the original nodes, listeners, storage and business logic. */
(function(){
 'use strict';
 const toolSelectors=['.ledger-s5-launcher','.ledger-s7-launcher','.ledger-s8-launcher','.e3-launcher','.e4-launcher','.e5-controls'];
 function init(){
  if(document.querySelector('.e30-tools-dock'))return;
  const dock=document.createElement('div');dock.className='e30-tools-dock';
  const button=document.createElement('button');button.type='button';button.className='e30-tools-toggle';
  button.setAttribute('aria-controls','e30-tools-content');button.setAttribute('aria-expanded','false');
  button.setAttribute('aria-label','Open tools and language menu');
  button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round"/></svg><span>Tools &amp; language</span>';
  const content=document.createElement('section');content.className='e30-tools-content';content.id='e30-tools-content';
  content.setAttribute('aria-label','Additional career tools and language settings');content.hidden=true;
  const heading=document.createElement('h2');heading.className='e30-tools-heading';heading.textContent='Your workspace tools';
  const list=document.createElement('div');list.className='e30-tools-list';
  const hint=document.createElement('p');hint.className='e30-tools-help';hint.textContent='These optional tools do not change your CV unless you choose an action.';
  content.append(heading,list,hint);dock.append(button,content);document.body.append(dock);
  function toggle(open){
   content.hidden=!open;button.setAttribute('aria-expanded',String(open));
   button.setAttribute('aria-label',open?'Close tools and language menu':'Open tools and language menu');
  }
  button.addEventListener('click',()=>{toggle(content.hidden);if(!content.hidden){list.querySelector('button,select')?.focus()}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!content.hidden){toggle(false);button.focus()}});
  document.addEventListener('pointerdown',event=>{if(!content.hidden&&!dock.contains(event.target))toggle(false)});
  list.addEventListener('click',event=>{if(event.target.closest('button')&&!event.target.closest('.e5-controls'))toggle(false)});
  function collect(){
   for(const selector of toolSelectors){
    for(const element of document.querySelectorAll(selector)){
     if(element.closest('.e30-tools-list'))continue;
     if(element.closest('.ledger-s5-backdrop,.ledger-s7-overlay,.ledger-s8-overlay,.modal-overlay'))continue;
     list.append(element);
    }
   }
  }
  collect();
  const observer=new MutationObserver(()=>collect());
  observer.observe(document.body,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();