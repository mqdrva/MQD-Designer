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
export function packTeamResponse(packet){
 const master=packTeamMaster(packet.master),shop={...packet.shop};
 if(master){const i=master.sources.indexOf(shop.garmentLogo);if(i>=0)shop.garmentLogo='master-source:'+i;}
 return{...packet,shop,master};
}
export function unpackTeamResponse(packet){
 if(/^master-source:/.test(packet.shop?.garmentLogo||'')){const index=/^master-source:(\d+)$/.exec(packet.shop.garmentLogo),source=index&&packet.master?.sources?.[Number(index[1])];if(typeof source!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(source))throw Error('Team garment logo is missing.');packet.shop.garmentLogo=source;}
 packet.master=unpackTeamMaster(packet.master);return packet;
}
