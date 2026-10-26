// Only transport changes: identical source strings are sent once, never resized.
export function packTeamMaster(master){
 if(!master)return null;const sources=[],ids=new Map();
 const zones=Object.fromEntries(Object.entries(master.payload.design.zones).map(([name,zone])=>[name,{...zone,layers:zone.layers.map(layer=>{if(layer.type!=='image')return layer;let id=ids.get(layer.src);if(id===undefined){id=sources.length;ids.set(layer.src,id);sources.push(layer.src);}return{...layer,src:'source:'+id};})}]));
 return{...master,payload:{...master.payload,design:{...master.payload.design,zones}},sourceFormat:'mqd-master-sources-v1',sources};
}
export function unpackTeamMaster(master){
 if(!master?.sourceFormat)return master;if(master.sourceFormat!=='mqd-master-sources-v1'||!Array.isArray(master.sources))throw Error('Team artwork format is unavailable.');
 for(const zone of Object.values(master.payload.design.zones))for(const layer of zone.layers){if(layer.type!=='image')continue;const match=/^source:(\d+)$/.exec(layer.src),source=match&&master.sources[Number(match[1])];if(typeof source!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(source))throw Error('Team original artwork is missing.');layer.src=source;}
 delete master.sourceFormat;delete master.sources;return master;
}
