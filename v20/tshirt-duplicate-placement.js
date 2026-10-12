import {bodyPatternUv} from './long-sleeve-pattern-uv.js';
// Front and Back have different neckline/hem frames. Copy physical height,
// rather than copying a percentage of two different artwork rectangles.
export function tshirtBodyPlacementFrame(positions,zone,mask,bounds,aspect){
 const uv=bodyPatternUv(positions,zone,mask,bounds);
 let lo=0,hi=0;
 for(let i=1;i<positions.length/3;i++){if(positions[i*3+1]<positions[lo*3+1])lo=i;if(positions[i*3+1]>positions[hi*3+1])hi=i;}
 const slope=(uv[hi*2+1]-uv[lo*2+1])/(positions[hi*3+1]-positions[lo*3+1]);
 if(!Number.isFinite(slope)||slope<=0)throw new Error('Invalid short-sleeve body placement frame');
 return {slope,intercept:uv[lo*2+1]-slope*positions[lo*3+1],aspect};
}
export function matchTshirtDuplicatePlacement(layer,from,to){
 const physicalY=(.5-(Number(layer.y)||0)/200-from.intercept)/from.slope;
 const y=(.5-(to.slope*physicalY+to.intercept))*200;
 const image=layer.type==='image'&&layer.image;
 const imageAspect=image?(image.naturalWidth||image.width)/(image.naturalHeight||image.height):1;
 const extent=frame=>image?Math.max(frame.aspect/imageAspect,1):frame.aspect;
 const scale=(Number(layer.scale)||1)*extent(from)/extent(to)*to.slope/from.slope;
 return {y,scale};
}
