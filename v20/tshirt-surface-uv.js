// Calibrated for the premium short-sleeve mesh only. The offline solve uses
// the surface metric, avoiding the old planar/angular transition at the sides.
// The file carries a position fingerprint for each split body panel. Never
// apply vertex-indexed coordinates to a different mesh or triangle ordering.
const zones=['Front','Back','Collar'];
let pending,calibration;
export function positionFingerprint(array){
 const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);let hash=2166136261;
 for(const byte of bytes)hash=Math.imul(hash^byte,16777619)>>>0;
 return hash;
}
export function decodeTshirtSurfaceUv(buffer){
 const data=new DataView(buffer);if(data.byteLength<28||data.getUint32(0,true)!==0x31565554)throw new Error('Invalid short-sleeve UV calibration');
 const result=new Map();let offset=4;
 for(const zone of zones){
  const count=data.getUint32(offset,true),fingerprint=data.getUint32(offset+4,true);offset+=8;
  if(!count||offset+count*2>data.byteLength)throw new Error('Truncated short-sleeve UV calibration');
  const values=new Uint16Array(count);for(let i=0;i<count;i++)values[i]=data.getUint16(offset+i*2,true);offset+=count*2;
  result.set(zone,{count,fingerprint,values});
 }
 if(offset!==data.byteLength)throw new Error('Unexpected short-sleeve UV calibration data');
 return result;
}
export async function loadTshirtSurfaceUv(){
 if(!pending)pending=fetch(new URL('../assets/calibration/tshirt-surface-uv.bin?v=27-armhole',import.meta.url)).then(async response=>{
  if(!response.ok)throw new Error('Short-sleeve UV calibration could not be loaded');
  calibration=decodeTshirtSurfaceUv(await response.arrayBuffer());
 }).catch(error=>{pending=null;throw error;});
 return pending;
}
export function applyTshirtSurfaceUv(zone,geometry,data=calibration){
 if(!zones.includes(zone))return false;
 const record=data?.get(zone),positions=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
 if(!record||positions.count!==record.count||uv.count!==record.count||positionFingerprint(positions.array)!==record.fingerprint)throw new Error('Short-sleeve UV calibration does not match this mesh');
 for(let i=0;i<record.count;i++)uv.array[i*2+(zone==='Collar'?1:0)]=record.values[i]/65535;
 uv.needsUpdate=true;return true;
}
