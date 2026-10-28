// Render-only transforms: the source image bytes and full pixel dimensions stay
// unchanged in design.json and the production archive.
export function tintLogoPixels(data,color,{whiteBackground=false}={}){
 const rgb=[1,3,5].map(at=>parseInt(color.slice(at,at+2),16));
 for(let at=0;at<data.length;at+=4){
  if(whiteBackground)data[at+3]=Math.round(data[at+3]*Math.min(1,Math.max(0,(255-Math.max(data[at],data[at+1],data[at+2]))/217)));
  data[at]=rgb[0];data[at+1]=rgb[1];data[at+2]=rgb[2];
 }
 return data;
}
let cached=null;
export function teamLogoImage(layer){
 const treatment=layer.teamLogo,image=layer.image;
 if(!treatment||!image?.width||!image?.height)return image;
 const key=layer.src+'|'+treatment.mode+'|'+treatment.color;
 if(cached?.key===key)return cached.canvas;
 const canvas=document.createElement('canvas');canvas.width=image.naturalWidth||image.width;canvas.height=image.naturalHeight||image.height;
 const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);
 const pixels=context.getImageData(0,0,canvas.width,canvas.height);
 tintLogoPixels(pixels.data,treatment.color,{whiteBackground:treatment.mode==='dark-on-white-v1'});context.putImageData(pixels,0,0);
 cached={key,canvas};return canvas;
}
// Virtual render layers use the ordinary image mapping, without becoming an
// editable master layer or changing the saved layer list/capacity.
const backgrounds=new WeakMap();
export function teamRenderZone(state,background,zone){
 if(!background?.image?.complete||!background.image.naturalWidth)return state;
 let layers=backgrounds.get(background);if(!layers){layers=new Map();backgrounds.set(background,layers);}
 let layer=layers.get(zone);if(!layer){layer={id:'team-background-'+zone,type:'image',src:background.src,image:background.image,visible:true,x:0,y:0,scale:1,rotation:0,chatBackground:true,teamMemberBackground:true};layers.set(zone,layer);}
 return {...state,layers:[layer,...(state.layers||[])]};
}
