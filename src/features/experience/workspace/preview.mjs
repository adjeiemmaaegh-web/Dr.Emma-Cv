/**
 * Page-faithful preview and thumbnails. They draw the SAME positioned lines Group B's layout engine feeds to the PDF writer,
 * so what the user sees is what exports (not an approximation in HTML flow).
 */
import {renderPreview} from '../../export/export-service.mjs';
import {resolveStyle} from '../../templates/registry.mjs';
import {textWidth} from '../../documents/layout.mjs';
import {el} from './ui.mjs';
const FONT={sans:'Helvetica,Arial,"Liberation Sans",sans-serif',serif:'"Times New Roman",Times,"Liberation Serif",serif'};
export function layoutFor(document,appearance){
 const r=renderPreview(document,appearance),style=resolveStyle(appearance);
 return {...r,style};
}
/** Fills `container` with one scaled page per layout page. */
export function drawPages(container,layout,scale){
 container.replaceChildren();
 const {pages,paper,style}=layout;
 pages.forEach((page,i)=>{
  const slot=el('div',{class:'lw-pageslot',style:`width:${paper.width*scale}px;height:${paper.height*scale}px`});
  const pg=el('div',{class:'lw-page',role:'group','aria-label':'Page '+(i+1)+' of '+pages.length,style:`width:${paper.width}px;height:${paper.height}px;transform:scale(${scale});font-family:${FONT[style.font]||FONT.sans}`});
  for(const l of page){
   const top=l.y-l.size*0.82;
   const label=(l.bullet?'• ':'')+l.text;
   let left=l.x;
   if(l.centered)left=l.x+Math.max(0,(l.textWidth-textWidth(label,l.size,style.font,l.bold))/2);
   const color=l.kind==='section-title'||l.kind==='name'?style.color:l.muted?'#595959':'#111';
   pg.append(el('span',{style:`left:${left}px;top:${top}px;font-size:${l.size}px;font-weight:${l.bold?700:400};color:${color}`},label));
   if(l.right)pg.append(el('span',{style:`left:${l.x+l.textWidth-textWidth(l.right,l.size,style.font,false)}px;top:${top}px;font-size:${l.size}px;color:#111`},l.right));
   if(l.kind==='section-title'&&style.rules!=='none')pg.append(el('i',{style:`left:${l.x}px;top:${l.y+3}px;width:${l.textWidth}px;border-color:${style.color}`}));
  }
  slot.append(pg);container.append(el('div',{},slot,el('p',{class:'lw-pagelabel'},'Page '+(i+1)+' of '+pages.length)));
 });
}
/** Miniature of the first page: bars at true positions (cheap, no text). */
export function thumbnail(layout){
 const {pages,paper,style}=layout,t=el('div',{class:'lw-thumb','aria-hidden':'true'});
 for(const l of pages[0]||[]){
  const w=Math.min(l.textWidth,textWidth((l.bullet?'• ':'')+l.text,l.size,style.font,l.bold));
  let x=l.x;if(l.centered)x=l.x+(l.textWidth-w)/2;
  const strong=l.kind==='section-title'||l.kind==='name';
  t.append(el('b',{style:`left:${x/paper.width*100}%;top:${(l.y-l.size*0.78)/paper.height*100}%;width:${w/paper.width*100}%;height:${Math.max(l.size*0.55,2.2)/paper.height*100}%;background:${strong?style.color:'#c3ccd8'}`}));
 }
 return t;
}
