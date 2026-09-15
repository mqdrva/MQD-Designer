import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const editor=fs.readFileSync(new URL('../v20/editor.js',import.meta.url),'utf8');

function extractFunction(name){
  let start=editor.indexOf(`function ${name}(`);
  assert.ok(start>=0,`${name} must exist`);
  if(editor.slice(Math.max(0,start-6),start)==='async ')start-=6;
  const brace=editor.indexOf('{',start);
  let depth=0,quote=null,lineComment=false,blockComment=false;
  for(let i=brace;i<editor.length;i++){
    const c=editor[i],next=editor[i+1];
    if(lineComment){if(c==='\n')lineComment=false;continue;}
    if(blockComment){if(c==='*'&&next==='/'){blockComment=false;i++;}continue;}
    if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote=null;continue;}
    if(c==='/'&&next==='/'){lineComment=true;i++;continue;}
    if(c==='/'&&next==='*'){blockComment=true;i++;continue;}
    if(c==='\''||c==='"'||c==='`'){quote=c;continue;}
    if(c==='{')depth++;
    if(c==='}'&&--depth===0)return editor.slice(start,i+1);
  }
  assert.fail(`${name} is not closed`);
}

const zoneStates={Front:{layers:[]},Back:{layers:[]}};
const notices=[];
let snapshots=0,renders=0;
const context={
  layerSeq:1,
  product:{id:'tshirt',zones:['Front','Back']},
  MAX_ZONE_LAYERS:6,
  zoneState:zone=>zoneStates[zone],
  snapshot:()=>{snapshots++;},
  renderAll:()=>{renders++;},
  alert:message=>notices.push(message),
  window:{},
  console
};
vm.createContext(context);
vm.runInContext(`
${extractFunction('localLockedAssetForZone')}
${extractFunction('resolveLockedAssetForZone')}
${extractFunction('makeLockedLibraryCopy')}
${extractFunction('insertLockedLibraryLayer')}
${extractFunction('duplicateLockedLibraryToZones')}
this.localLockedAssetForZone=localLockedAssetForZone;
this.makeLockedLibraryCopy=makeLockedLibraryCopy;
this.duplicateLockedLibraryToZones=duplicateLockedLibraryToZones;
`,context);

const placements={
  Front:{x:0,y:19.106,scale:1,rotation:0,flipX:false,flipY:false,crop:{top:0,left:0,right:0,bottom:0}},
  Back:{x:2,y:-7,scale:.82,rotation:4,flipX:true,flipY:false,crop:{top:.01,left:.02,right:.03,bottom:.04}}
};
const source={
  id:'layer-source',type:'image',label:'Water Splash Background',filename:'water-splash-background.png',src:'signed-url',image:{width:2048,height:2048},
  x:0,y:19.106,scale:1,rotation:0,flipX:false,flipY:false,crop:placements.Front.crop,visible:true,
  libraryAssetId:'asset-water',libraryLocked:true,libraryCategory:'background',libraryPreset:'bottom',libraryStackOrder:10,libraryPlacements:placements
};
zoneStates.Front.layers.push(source);

const asset=context.localLockedAssetForZone(source,'Back');
assert.equal(asset.placement,placements.Back,'destination placement must come from the approved zone map');
const copy=context.makeLockedLibraryCopy(source,asset);
assert.equal(copy.libraryAssetId,source.libraryAssetId);
assert.equal(copy.libraryLocked,true);
assert.equal(copy.x,placements.Back.x);
assert.equal(copy.y,placements.Back.y);
assert.equal(copy.scale,placements.Back.scale);
assert.equal(copy.rotation,placements.Back.rotation);
assert.equal(copy.flipX,true,'Back reversal must be preserved');
assert.deepEqual(JSON.parse(JSON.stringify(copy.crop)),placements.Back.crop);

const added=await context.duplicateLockedLibraryToZones(source,['Back']);
assert.deepEqual([...added],['Back']);
assert.equal(snapshots,1,'one undo snapshot must cover the duplication');
assert.equal(renders,1,'the designer must refresh after duplication');
assert.equal(zoneStates.Back.layers.length,1);
assert.equal(zoneStates.Back.layers[0].libraryLocked,true);
assert.equal(zoneStates.Back.layers[0].y,placements.Back.y);
assert.equal(zoneStates.Back.layers[0].flipX,true,'the destination Back placement must stay reversed');
assert.match(notices.at(-1),/duplicated to: Back/i,'the UI must confirm which destination changed');

assert(editor.includes("$('duplicateTool').disabled=!!(l.libraryAssetId&&!locked)"),'Duplicate must be enabled for locked library artwork');
assert(editor.includes("if(!locked)add('Same Zone',()=>duplicateActive())"),'Locked artwork must avoid same-zone stacking');
assert(editor.includes("add('To All Zones',()=>cloneActiveToAllZones(),true)"),'Clone All must remain available');
assert(!extractFunction('openDuplicateMenu').includes("if(l.libraryAssetId){alert("),'Locked artwork must not be blocked from the destination-zone menu');

console.log('PASS: locked MQD artwork clones to selected zones using approved placement and remains locked.');
