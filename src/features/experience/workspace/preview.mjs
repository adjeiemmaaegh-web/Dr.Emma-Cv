/**
 * Preview text, decorations, and inline edit hit-targets use the same positioned
 * layout as PDF. DOM controls never appear in exports.
 */
import {renderPreview} from '../../export/export-service.mjs';
import {resolveStyle} from '../../templates/registry.mjs';
import {textWidth,decorationGeometry,pageDecorations} from '../../documents/layout.mjs';
import {el} from './ui.mjs';
const FONT={sans:'Helvetica,Arial,"Liberation Sans",sans-serif',serif:'"Times New Roman",Times,"Liberation Serif",serif'};
export function layoutFor(document,appearance){
 const r=renderPreview(document,appearance),style=resolveStyle(appearance);
 return {...r,style};
}
/** Render positioned pages; an optional callback enables keyboard-accessible on-document editing. */
export function drawPages(container,layout,scale,{onEdit}={}){
 const fragment=document.createDocumentFragment(),keyboardPaths=new Set();
 const {pages,paper,style}=layout;
 pages.forEach((page,i)=>{
  const slot=el('div',{class:'lw-pageslot',style:`width:${paper.width*scale}px;height:${paper.height*scale}px`});
  const pg=el('div',{class:'lw-page',role:'group','aria-label':'Page '+(i+1)+' of '+pages.length,style:`width:${paper.width}px;height:${paper.height}px;transform:scale(${scale});font-family:${FONT[style.font]||FONT.sans};--lw-edit-target:${Math.ceil(26/Math.max(scale,0.05))}px`});
  for(const d of pageDecorations(style,paper)){
   pg.append(el('i',{'aria-hidden':'true',style:`left:${d.x}px;top:${d.y}px;width:${d.width}px;`+
    (d.kind==='rect'?`height:${d.height}px;border:0;background:${d.color}`:
      `height:0;border-top:${d.height}px solid ${d.color}`)}));
  }
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
    const first= !keyboardPaths.has(l.sourcePath);
    keyboardPaths.add(l.sourcePath);
    Object.assign(attrs,{class:'lw-page-edit',role:'button',tabindex:first?'0':'-1','data-path':l.sourcePath,
     'aria-label':'Edit '+label.slice(0,90),title:'Edit this text on the page',
     on:{click:e=>onEdit(l.sourcePath,e.currentTarget),
      keydown:e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onEdit(l.sourcePath,e.currentTarget);}}}});
   }
   pg.append(el('span',attrs,label));
   if(l.right)pg.append(el('span',{style:`left:${l.x+l.textWidth-textWidth(l.right,l.size,style.font,false)}px;top:${top}px;font-size:${l.size}px;color:#111`},l.right));
  }
  slot.append(pg);fragment.append(el('div',{},slot,el('p',{class:'lw-pagelabel'},'Page '+(i+1)+' of '+pages.length)));
 });
 container.replaceChildren(fragment);
}
/** First-page preview using the same placed text and accents as the PDF layout.
 * Fictional sample data is provided by the caller. Text stays real text, not
 * anonymous loading bars; CSS container units scale it with the paper width.
 */
export function thumbnail(layout){
 const {pages,paper,style}=layout,t=el('div',{class:'lw-thumb','aria-hidden':'true'});
 const pct=(n,total)=>Number((n/total*100).toFixed(4))+'%';
 for(const d of pageDecorations(style,paper)){
  t.append(el('b',{style:`left:${pct(d.x,paper.width)};top:${pct(d.y,paper.height)};width:${pct(d.width,paper.width)};height:${pct(Math.max(d.height,0.9),paper.height)};background:${d.color}`}));
 }
 for(const l of pages[0]||[]){
  for(const d of decorationGeometry(l,style)){
   t.append(el('b',{style:`left:${pct(d.x,paper.width)};top:${pct(d.y,paper.height)};width:${pct(d.width,paper.width)};height:${pct(Math.max(d.height,0.9),paper.height)};background:${d.color}`}));
  }
  const label=(l.bullet?'• ':'')+l.text;
  const width=textWidth(label,l.size,style.font,l.bold);
  const x=l.centered?l.x+Math.max(0,(l.textWidth-width)/2):l.x;
  const color=l.kind==='section-title'||l.kind==='name'?style.color:l.muted?'#59646d':'#20272c';
  const fontSize=(l.size/paper.width*100).toFixed(4)+'cqw';
  t.append(el('span',{class:'lw-thumb-text',style:`left:${pct(x,paper.width)};top:${pct(l.y-l.size*0.82,paper.height)};font-size:${fontSize};font-family:${FONT[style.font]||FONT.sans};font-weight:${l.bold?700:400};color:${color}`},label));
  if(l.right){
   const rightX=l.x+l.textWidth-textWidth(l.right,l.size,style.font,false);
   t.append(el('span',{class:'lw-thumb-text',style:`left:${pct(rightX,paper.width)};top:${pct(l.y-l.size*0.82,paper.height)};font-size:${fontSize};font-family:${FONT[style.font]||FONT.sans};color:#20272c`},l.right));
  }
 }
 return t;
}
