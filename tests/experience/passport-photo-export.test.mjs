import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPdf} from '../../src/features/documents/pdf-writer.mjs';
import {renderDocx} from '../../src/features/documents/docx-writer.mjs';
import {unzipEntries,bytesToText} from '../../src/features/documents/zip.mjs';
import {cvPhotoBytes} from '../../src/features/documents/cv-photo.mjs';
const photo=Uint8Array.from([255,216,255,217]); // structural fixture only; not a decodable photo
const style={font:'sans',color:'#0b6b72',margin:42,size:10,lineHeight:1.3,pageAccent:'none',rules:'none',header:'left',paragraphGap:4};
const paper={width:595,height:842};
test('photo JPEG data URI is bounded and rejects other image types',()=>{
 assert.deepEqual(cvPhotoBytes('data:image/jpeg;base64,/9j/2Q=='),photo);
 assert.throws(()=>cvPhotoBytes('data:image/png;base64,/9j/2Q=='));
 assert.throws(()=>cvPhotoBytes('data:image/jpeg;base64,AA=='));
 assert.equal(cvPhotoBytes(''),null);
});
test('PDF includes optional embedded image without altering photo-free exports',()=>{
 const plain=renderPdf({pages:[[]],paper,style});
 const withPhoto=renderPdf({pages:[[]],paper,style,photo});
 const decode=bytes=>Array.from(bytes,b=>String.fromCharCode(b)).join('');
 assert.ok(!decode(plain.bytes).includes('/Subtype /Image'));
 assert.match(decode(withPhoto.bytes),/\/Subtype \/Image \/Width 360 \/Height 480/);
 assert.match(decode(withPhoto.bytes),/\/Portrait Do/);
});
test('Word export includes an embedded photo, drawing and relationship only when requested',async()=>{
 const withPhoto=await unzipEntries(renderDocx({blocks:[],paper,style,photo}).bytes);
 const plain=await unzipEntries(renderDocx({blocks:[],paper,style}).bytes);
 assert.deepEqual(withPhoto.get('word/media/portrait.jpg'),photo);
 assert.equal(plain.has('word/media/portrait.jpg'),false);
 assert.match(bytesToText(withPhoto.get('word/document.xml')),/r:embed="rIdPhoto"/);
 assert.match(bytesToText(withPhoto.get('word/_rels/document.xml.rels')),/Target="media\/portrait.jpg"/);
 assert.match(bytesToText(withPhoto.get('[Content_Types].xml')),/Extension="jpg"/);
});
