import {artworkBounds,imageClipped} from './everyday-layers.js';
export function placeTeamPrint(context,image,art,zone){
 const bounds=art.texts?.length||imageClipped(art,zone)?artworkBounds(art,zone):art.placement;
 context.drawImage(image,bounds.x*300,bounds.y*300,bounds.width*300,bounds.height*300);
}
