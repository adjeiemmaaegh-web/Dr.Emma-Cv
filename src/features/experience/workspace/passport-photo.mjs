/** Optional local-only CV portrait processing. No upload or network request. */
export const PHOTO_MAX_INPUT_BYTES=8*1024*1024;
export const PHOTO_MAX_STORED_BYTES=250*1024;
export const PHOTO_WIDTH=360;
export const PHOTO_HEIGHT=480;
export function validatePhotoFile(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPEG, PNG or WebP photograph.');
 if(!Number.isSafeInteger(file.size)||file.size<=0||file.size>PHOTO_MAX_INPUT_BYTES)throw new Error('Photograph must be smaller than 8 MB.');
}
export function validatePhotoDataUri(uri){
 if(typeof uri!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(uri))throw new Error('Invalid JPEG photograph.');
 const b64=uri.slice('data:image/jpeg;base64,'.length);
 if(b64.length>Math.ceil(PHOTO_MAX_STORED_BYTES/3)*4)throw new Error('Photograph exceeds the 250 KB storage limit.');
 return uri;
}
/** Crop to a passport-style 3:4 portrait; encode as a bounded local JPEG. */
export async function preparePassportPhoto(file,{createBitmap=globalThis.createImageBitmap,createCanvas=()=>document.createElement('canvas')}={}){
 validatePhotoFile(file);
 if(typeof createBitmap!=='function')throw new Error('This browser cannot decode photos.');
 const bitmap=await createBitmap(file);
 try{
  const width=bitmap.width,height=bitmap.height;
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<100||height<100||width*height>80_000_000)throw new Error('Photo dimensions are not supported.');
  const canvas=createCanvas();
  canvas.width=PHOTO_WIDTH;canvas.height=PHOTO_HEIGHT;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw new Error('Photo editing is unavailable in this browser.');
  const cropWidth=Math.min(width,height*3/4),cropHeight=cropWidth*4/3;
  const x=(width-cropWidth)/2,y=(height-cropHeight)/2;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,PHOTO_WIDTH,PHOTO_HEIGHT);
  ctx.drawImage(bitmap,x,y,cropWidth,cropHeight,0,0,PHOTO_WIDTH,PHOTO_HEIGHT);
  for(const quality of [0.86,0.72,0.56,0.42]){
   const uri=canvas.toDataURL('image/jpeg',quality);
   try{return validatePhotoDataUri(uri);}catch{}
  }
  throw new Error('Photo is too complex to store safely. Try a smaller photo.');
 }finally{bitmap.close?.();}
}
