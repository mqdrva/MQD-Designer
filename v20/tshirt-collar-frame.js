// The collar source PNG is an instruction screenshot, not a production mask.
// Use the configured rectangular print strip for both 2D and 3D artwork.
export function createTshirtCollarFrame(document,template){
 const width=1024,height=Math.round(width*template.height/template.width);
 const maskCanvas=document.createElement('canvas');maskCanvas.width=width;maskCanvas.height=height;
 const context=maskCanvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,width,height);
 const cutlineCanvas=document.createElement('canvas');cutlineCanvas.width=width;cutlineCanvas.height=height;
 const cut=cutlineCanvas.getContext('2d');cut.strokeStyle='#eb232d';cut.lineWidth=2;cut.setLineDash([8,5]);cut.strokeRect(1,1,width-2,height-2);
 return {img:cutlineCanvas,maskCanvas,cutlineCanvas,bounds:{x:0,y:0,w:width,h:height},artworkAspect:template.width/template.height,status:'ready'};
}
