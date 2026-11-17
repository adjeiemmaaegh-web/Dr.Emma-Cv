/** Workspace UI primitives: DOM builder, icons, toasts, downloads. No data access. */
export const el=(tag,attrs={},...kids)=>{
 const n=document.createElement(tag);
 for(const [k,v] of Object.entries(attrs||{})){
  if(k==='on')for(const [e,f] of Object.entries(v))n.addEventListener(e,f);
  else if(k==='class')n.className=v;
  else if(v!==false&&v!==undefined&&v!==null)n.setAttribute(k,v===true?'':v);
 }
 for(const k of kids.flat())if(k!==null&&k!==undefined&&k!==false)n.append(k.nodeType?k:document.createTextNode(String(k)));
 return n;
};
const P={home:'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',edit:'M4 20h4l10-10-4-4L4 16zM14 6l4 4',grid:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',check:'M5 12l5 5L20 7',board:'M4 4h5v16H4zM10 4h5v10h-5zM16 4h4v13h-4z',moon:'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',search:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3',undo:'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',redo:'M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',download:'M12 3v12M7 10l5 5 5-5M5 21h14',plus:'M12 5v14M5 12h14',trash:'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',up:'M6 15l6-6 6 6',down:'M6 9l6 6 6-6',x:'M6 6l12 12M18 6L6 18',alert:'M12 3l10 18H2zM12 10v5M12 18v.5',info:'M12 11v6M12 7.5v.5M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z'};
export function icon(name,{size=20}={}){
 const s=document.createElementNS('http://www.w3.org/2000/svg','svg');
 s.setAttribute('viewBox','0 0 24 24');s.setAttribute('width',size);s.setAttribute('height',size);s.setAttribute('fill','none');s.setAttribute('stroke','currentColor');
 s.setAttribute('stroke-width','2');s.setAttribute('stroke-linecap','round');s.setAttribute('stroke-linejoin','round');s.setAttribute('aria-hidden','true');s.setAttribute('focusable','false');
 const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',P[name]||P.info);s.append(p);return s;
}
export function createToaster(root){
 const box=el('div',{class:'lw-toasts',role:'status','aria-live':'polite','aria-atomic':'false'});root.append(box);
 return {
  show(message,{ms=4500}={}){const t=el('div',{class:'lw-toast'},message);box.append(t);setTimeout(()=>t.remove(),ms);},
  destroy(){box.remove();}
 };
}
export function download(bytes,filename,mime){
 const url=URL.createObjectURL(new Blob([bytes],{type:mime}));
 const a=el('a',{href:url,download:filename,style:'display:none'});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export const debounceFrame=fn=>{let f=0;return(...a)=>{cancelAnimationFrame(f);f=requestAnimationFrame(()=>fn(...a));};};
