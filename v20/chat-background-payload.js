export function backgroundPrompt(description){
  return `Create a new flat, rectangular background image: ${description.trim()}\nFill the entire image edge to edge. Background artwork only: no shirt or garment mockup, logos, words, phone numbers, or clothing outlines.`;
}

export function addChatBackground(current,asset,zones){
  if(!asset?.src||!zones.length)throw new Error('Choose a background image and garment area.');
  const payload=JSON.parse(JSON.stringify(current));
  payload.design??={};payload.design.zones??={};
  for(const zone of zones){
    if(!Object.hasOwn(current.templates||{},zone))throw new Error('Choose an area on the current garment.');
    const row=payload.design.zones[zone]??={background:'#FFFFFF',layers:[]};
    const layers=(row.layers||[]).filter(layer=>!layer.chatBackground&&layer.aiAssetKind!=='artwork');
    if(layers.length>=6)throw new Error(`${zone} already has six layers. Remove one before adding a background.`);
    row.layers=[{id:`chat-background-${zone.replaceAll(' ','-')}`,type:'image',label:'ChatGPT Background',filename:asset.filename,src:asset.src,x:0,y:0,scale:1,rotation:0,visible:true,flipX:false,flipY:false,crop:{left:0,top:0,right:0,bottom:0},chatBackground:true},...layers];
  }
  return payload;
}
