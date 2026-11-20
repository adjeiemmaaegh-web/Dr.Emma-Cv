/** WordprocessingML floating portrait, anchored at the top-right of the first CV page. */
export function docxPhotoDrawing(box,margin){
 if(!box)return '';
 const cx=Math.round(box.width*12700),cy=Math.round(box.height*12700);
 return '<w:r><w:drawing><wp:anchor xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="0">'+
  '<wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:align>right</wp:align></wp:positionH>'+
  '<wp:positionV relativeFrom="page"><wp:posOffset>'+Math.round(margin*12700)+'</wp:posOffset></wp:positionV>'+
  '<wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapSquare wrapText="left"/>'+
  '<wp:docPr id="1" name="CV portrait" descr="Passport-style CV portrait"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>'+
  '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>'+
  '<pic:nvPicPr><pic:cNvPr id="0" name="passport-photo.jpg"/><pic:cNvPicPr/></pic:nvPicPr>'+
  '<pic:blipFill><a:blip r:embed="rIdPhoto"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'+
  '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm>'+
  '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>'+
  '</wp:anchor></w:drawing></w:r>';
}
