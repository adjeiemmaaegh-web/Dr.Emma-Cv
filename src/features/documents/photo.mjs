/** Validated, bounded JPEG photo data shared by the offline editor, preview and exporters. */
export const MAX_PHOTO_CHARS=260000;
export const PHOTO_WIDTH=70,PHOTO_HEIGHT=90;
export function decodePassportPhoto(source){
 if(typeof source!=='string'||source.length>MAX_PHOTO_CHARS)return null;
 const match=/^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(source);
 if(!match||match[1].length%4!==0)return null;
 let raw;
 try{raw=atob(match[1]);}catch{return null;}
 if(raw.length<40||raw.length>195000)return null;
 const bytes=new Uint8Array(raw.length);
 for(let j=0;j<raw.length;j++)bytes[j]=raw.charCodeAt(j);
 if(bytes[0]!==255||bytes[1]!==216||bytes[bytes.length-2]!==255||bytes[bytes.length-1]!==217)return null;
 let i=2,w=0,h=0,components=0,baseline=false;
 while(i+3<bytes.length){
  if(bytes[i++]!==255)return null;
  while(bytes[i]===255)i++;
  const marker=bytes[i++];
  if(marker===218)break; // start of compressed image scan
  if(marker===217)break;
  if(marker===1||(marker>=208&&marker<=215))continue;
  if(i+2>bytes.length)return null;
  const len=(bytes[i]<<8)|bytes[i+1];
  if(len<2||i+len>bytes.length)return null;
  if(marker>=192&&marker<=207&&![196,200,204].includes(marker)){
   if(len<8||w)return null;
   baseline=marker===192;
   h=(bytes[i+3]<<8)|bytes[i+4];w=(bytes[i+5]<<8)|bytes[i+6];components=bytes[i+7];
  }
  i+=len;
 }
 if(!baseline||components!==3||w<1||h<1||w>2000||h>2000)return null;
 return {src:source,bytes,width:w,height:h};
}
export function passportPhotoBox(paper,style){
 return {x:paper.width-style.margin-PHOTO_WIDTH,y:style.margin,width:PHOTO_WIDTH,height:PHOTO_HEIGHT};
}
