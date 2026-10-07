import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../v20/editor.js',import.meta.url),'utf8');
const gestures=source.slice(source.indexOf('const editorTouches=new Map();'),source.indexOf('\nfunction designJSON(){'));
function harness({locked=false,mobile=true,crop=false}={}){
 const listeners=new Map(),layer={id:'logo',type:'image',x:0,y:0,scale:1,rotation:17,locked},captures=new Set();let snapshots=0;
 const context={window:{matchMedia:()=>({matches:mobile})},editorCanvas:{addEventListener:(name,fn)=>listeners.set(name,fn),setPointerCapture:id=>captures.add(id),releasePointerCapture:id=>captures.delete(id),classList:{add(){},remove(){}}},activeLayer:()=>layer,activeLayerId:'logo',dragState:null,cropMode:crop,pointerToCanvas:e=>({x:e.x,y:e.y}),activeLayerScreenRect:()=>({cx:100,cy:100,w:100,h:100,b:{w:400,h:500}}),editorRect:()=>({w:400,h:500}),isLockedLibraryLayer:l=>l.locked,layerAtCanvasPoint:()=>layer,selectionGeometry:()=>({rotateHandle:{x:-1000,y:-1000},resizeHandles:[],cropHandles:[]}),maxLayerScale:()=>4,snapshot:()=>snapshots++,drawEditor(){},renderLayerPanel(){},renderPrintQuality(){},scheduleGarmentPreview(){}};
 vm.runInNewContext(gestures,context);
 return {layer,captures,snapshots:()=>snapshots,event:(name,id,x,y,type='touch')=>listeners.get(name)({pointerId:id,pointerType:type,x,y,preventDefault(){}})};
}
const h=harness();h.event('pointerdown',1,100,100);h.event('pointerdown',2,200,100);h.event('pointermove',2,300,100);
assert.equal(h.layer.scale,2);assert.equal(h.layer.rotation,17);assert.equal(h.layer.x,25);assert.equal(h.snapshots(),1);
h.event('pointerup',2,300,100);const before={...h.layer};h.event('pointermove',1,200,200);assert.deepEqual(h.layer,before,'lifting one finger must not jump artwork');h.event('pointerup',1,200,200);
h.event('pointerdown',3,100,100);h.event('pointerdown',4,200,100);h.event('pointermove',4,101,100);assert.equal(h.layer.scale,.05);h.event('pointermove',4,10000,100);assert.equal(h.layer.scale,4);assert.equal(h.layer.x,100);h.event('pointercancel',3,100,100);h.event('pointercancel',4,10000,100);assert.equal(h.captures.size,0);
h.event('pointerdown',5,100,100);h.event('pointermove',5,120,100);assert.equal(h.layer.x,100,'ordinary drag still clamps bounds');h.event('pointerup',5,120,100);
for(const options of [{locked:true},{crop:true}]){const f=harness(options);f.event('pointerdown',1,100,100);f.event('pointerdown',2,200,100);f.event('pointermove',2,300,100);assert.equal(f.layer.scale,1,'locked artwork and crop mode do not pinch');}
const mouse=harness({mobile:false});mouse.event('pointerdown',1,100,100,'mouse');mouse.event('pointermove',1,140,150,'mouse');assert.equal(mouse.layer.x,20);assert.equal(mouse.layer.y,20);assert.equal(mouse.layer.scale,1);
console.log('Mobile pinch: proportional resize, bounds, undo, cancellation, locked layers, crop and desktop drag passed.');
