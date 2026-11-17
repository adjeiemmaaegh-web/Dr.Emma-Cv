/**
 * Preview text, decorations, and inline edit hit-targets use the same positioned
 * layout as PDF. DOM controls never appear in exports.
 */
import {renderPreview} from '../../export/export-service.mjs';
import {resolveStyle} from '../../templates/registry.mjs';
import {textWidth,decorationGeometry} from '../../documents/layout.mjs';
import {el} from './ui.mjs';
const FONT={sans:'Helvetica,Arial,"Liberation Sans",sans-serif',serif:'"Times New Roman",Times,"Liberation Serif",serif'};
export function layoutFor(document,appearance){
 const r=renderPreview(document,appearance),style=resolveStyle(appearance);
 return {...r,style};
}
/** Render positioned pages; an optional callback enables keyboard-accessible on-document editing. */
export function drawPages(container,layout,scale,{onEdit}={}){
 container.replaceChildren();
 const {pages,paper,style}=layout;
 pages.forEach((page,i)=>{
  const slot=el('div',{class:'lw-pageslot',style:`width:${paper.width*scale}px;height:${paper.height*scale}px`});
  const pg=el('div',{class:'lw-page',role:'group','aria-label':'Page '+(i+1)+' of '+pages.length,style:`width:${paper.width}px;height:${paper.height}px;transform:scale(${scale});font-family:${FONT[style.font]||FONT.sans};--lw-edit-target:${Math.ceil(26/Math.max(scale,0.05))}px`});
  for(const l of page){
   for(const d of decorationGeometry(l,style)){
    const base=`left:${d.x}px;top:${d.y}px;width:${d.width}px;`;
    pg.append(el('i',{'aria-hidden':'true',style:base+(d.kind==='rect'?
     `height:${d.height}px;border:0;background:${d.color}`:
     `height:0;border-top:${d.height}px solid ${d.color}`)}));
   }
   const top=l.y-l.size*0.82;
   const label=(l.bullet?'• ':'')+l.text;
   let left=l.x;
   if(l.centered)left=l.x+Math.max(0,(l.textWidth-textWidth(label,l.size,style.font,l.bold))/2);
   const color=l.kind==='section-title'||l.kind==='name'?style.color:l.muted?'#595959':'#111';
   const editable=Boolean(onEdit&&l.sourcePath);
   const attrs={style:`left:${left}px;top:${top}px;font-size:${l.size}px;font-weight:${l.bold?700:400};color:${color}`};
   if(editable){
    Object.assign(attrs,{class:'lw-page-edit',role:'button',tabindex:'0','data-path':l.sourcePath,
     'aria-label':'Edit '+label.slice(0,90),title:'Edit this text on the page',
     on:{click:e=>onEdit(l.sourcePath,e.currentTarget),
      keydown:e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onEdit(l.sourcePath,e.currentTarget);}}}});
   }
   pg.append(el('span',attrs,label));
   if(l.right)pg.append(el('span',{style:`left:${l.x+l.textWidth-textWidth(l.right,l.size,style.font,false)}px;top:${top}px;font-size:${l.size}px;color:#111`},l.right));
  }
  slot.append(pg);container.append(el('div',{},slot,el('p',{class:'lw-pagelabel'},'Page '+(i+1)+' of '+pages.length)));
 });
}
/** First-page thumbnail with the same family accent geometry as PDF. */
export function thumbnail(layout){
 const {pages,paper,style}=layout,t=el('div',{class:'lw-thumb','aria-hidden':'true'});
 for(const l of pages[0]||[]){
  for(const d of decorationGeometry(l,style)){
   t.append(el('b',{style:`left:${d.x/paper.width*100}%;top:${d.y/paper.height*100}%;width:${d.width/paper.width*100}%;height:${Math.max(d.height,0.9)/paper.height*100}%;background:${d.color}`}));
  }
  const w=Math.min(l.textWidth,textWidth((l.bullet?'• ':'')+l.text,l.size,style.font,l.bold));
  let x=l.x;if(l.centered)x=l.x+(l.textWidth-w)/2;
  const strong=l.kind==='section-title'||l.kind==='name';
  t.append(el('b',{style:`left:${x/paper.width*100}%;top:${(l.y-l.size*0.78)/paper.height*100}%;width:${w/paper.width*100}%;height:${Math.max(l.size*0.55,2.2)/paper.height*100}%;background:${strong?style.color:'#c3ccd8'}`}));
 }
 return t;
}
