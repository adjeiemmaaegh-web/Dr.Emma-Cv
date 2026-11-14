/* E31: progressive keyboard behavior for the existing E30 tools dock.
 * Does not replace launcher nodes or modify business logic. */
(function(){
 'use strict';
 function init(){
  const dock=document.querySelector('.e30-tools-dock');
  if(!dock||dock.dataset.e31Keyboard==='ready')return;
  dock.dataset.e31Keyboard='ready';
  const toggle=dock.querySelector('.e30-tools-toggle');
  const panel=dock.querySelector('.e30-tools-content');
  if(!toggle||!panel)return;
  // Close when keyboard focus moves outside, without trapping tab navigation.
  dock.addEventListener('focusout',()=>{
   queueMicrotask(()=>{
    if(panel.hidden||dock.contains(document.activeElement))return;
    panel.hidden=true;
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-label','Open tools and language menu');
   });
  });
  // Announce the menu's purpose to assistive technology without a live-region
  // that would repeatedly announce DOM mutations from the legacy launchers.
  for(const strip of document.querySelectorAll('#app .template-strip')){
   if(!strip.hasAttribute('tabindex'))strip.tabIndex=0;
   if(!strip.hasAttribute('role'))strip.setAttribute('role','region');
   if(!strip.hasAttribute('aria-label'))strip.setAttribute('aria-label','CV template gallery — scroll to explore');
  }
  panel.setAttribute('role','region');
  const heading=panel.querySelector('.e30-tools-heading');
  if(heading){
   heading.id=heading.id||'e31-tools-heading';
   panel.setAttribute('aria-labelledby',heading.id);
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
