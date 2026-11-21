import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePhotoFile,validatePhotoDataUri,preparePassportPhoto,PHOTO_WIDTH,PHOTO_HEIGHT} from '../../src/features/experience/workspace/passport-photo.mjs';
test('accepts common photo types and rejects oversized or unsafe inputs',()=>{
 for(const type of ['image/jpeg','image/png','image/webp'])assert.doesNotThrow(()=>validatePhotoFile({type,size:1000}));
 for(const type of ['image/svg+xml','text/html','application/pdf'])assert.throws(()=>validatePhotoFile({type,size:1000}));
 assert.throws(()=>validatePhotoFile({type:'image/jpeg',size:9*1024*1024}));
 assert.throws(()=>validatePhotoDataUri('data:image/svg+xml;base64,AA=='));
 assert.equal(validatePhotoDataUri('data:image/jpeg;base64,AA=='),'data:image/jpeg;base64,AA==');
});
test('crops centrally to 3:4 and releases image resources',async()=>{
 let crop,closed=false;
 const result=await preparePassportPhoto({type:'image/png',size:1000},{
  createBitmap:async()=>({width:1600,height:1200,close(){closed=true;}}),
  createCanvas:()=>({
   getContext:()=>({fillRect(){},drawImage(...args){crop=args;}}),
   toDataURL:()=> 'data:image/jpeg;base64,AA=='
  })
 });
 assert.equal(result,'data:image/jpeg;base64,AA==');
 assert.deepEqual(crop.slice(1),[350,0,900,1200,0,0,PHOTO_WIDTH,PHOTO_HEIGHT]);
 assert.equal(closed,true);
});
