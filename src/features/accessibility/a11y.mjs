/**
 * Group E shared accessibility helpers for feature modules (DOM only, no data access).
 * Automated checks and these helpers support, but never establish, WCAG conformance.
 */
export function createAnnouncer(root,{politeness='polite'}={}){
 const el=document.createElement('div');
 el.setAttribute('role',politeness==='assertive'?'alert':'status');el.setAttribute('aria-live',politeness);el.setAttribute('aria-atomic','true');
 el.className='ledger-visually-hidden';root.append(el);
 let t;
 return {announce(message){el.textContent='';clearTimeout(t);t=setTimeout(()=>{el.textContent=String(message);},30);},destroy(){clearTimeout(t);el.remove();}};
}
/** Moves focus to an element that may not be focusable by default, then restores on request. */
export function focusHeading(el){if(!el)return;if(!el.hasAttribute('tabindex'))el.setAttribute('tabindex','-1');el.focus({preventScroll:false});}
export function rememberFocus(){const prev=document.activeElement;return ()=>{if(prev&&prev.isConnected&&typeof prev.focus==='function')prev.focus();};}
export const prefersReducedMotion=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
export function el(tag,attrs={},...kids){
 const n=document.createElement(tag);
 for(const [k,v] of Object.entries(attrs)){if(k==='on')for(const [e,f] of Object.entries(v))n.addEventListener(e,f);else if(v!==false&&v!==undefined&&v!==null)n.setAttribute(k,v===true?'':v);}
 for(const k of kids)n.append(k);return n;
}
let uid=0;export const uniqueId=p=>p+'-'+(++uid);
