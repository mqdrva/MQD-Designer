// Lossless checkout transport: original files remain in the ZIP. Avoid repeating
// their base64 bytes in design.json and once per zone in the multipart request.
export const TEAM_IMAGE_REFS='mqd-team-image-refs-v1';
export const TEAM_RESTORED_PATHS=Symbol('verified original ZIP paths');
export async function restoreTeamImages(saved,zip){
 if(saved.imageSourceFormat===undefined)return saved;
 if(saved.imageSourceFormat!==TEAM_IMAGE_REFS||saved.engine!=='3d')throw new Error('Unsupported original-artwork references.');
 let expanded=0;const cache=new Map(),paths={};
 for(const [zone,state] of Object.entries(saved.design?.design?.zones||{}))for(const [index,layer] of (state.layers||[]).entries()){
  if(layer.type!=='image')continue;
  const match=layer.src?.match(/^zip:(originals\/[a-zA-Z0-9_.-]+\.(png|jpg|jpeg|webp))$/i);
  if(!match||match[1].includes('..'))throw new Error('Original artwork reference is invalid.');
  let source=cache.get(match[1]);
  if(!source){const file=zip.file(match[1]),mime=saved.imageSourceTypes?.[match[1]];if(!file||(file._data?.uncompressedSize||0)>50*1024*1024||!/^image\/(png|jpeg|webp)$/.test(mime||''))throw new Error('Original artwork file is missing or invalid.');source='data:'+mime+';base64,'+await file.async('base64');cache.set(match[1],source);}
  expanded+=source.length;if(expanded>48*1024*1024)throw new Error('Expanded design exceeds the supported artwork limit.');layer.src=source;(paths[zone]||=[])[index]=match[1];
 }
 Object.defineProperty(saved,TEAM_RESTORED_PATHS,{value:paths});
 return saved;
}
