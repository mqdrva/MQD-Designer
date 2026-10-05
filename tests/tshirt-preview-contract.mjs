import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createCanvas} from '@napi-rs/canvas';
import * as THREE from 'three';
import {TSHIRT_BODY_ARTWORK_OFFSET_Y,tshirtBodyImageOffsetY} from '../v20/tshirt-artwork-calibration.js';

// Exercise the actual texture dispatcher, not a second implementation of its
// product/zone routing. The neckline regression separately checks pattern UVs.
const source=fs.readFileSync(new URL('../v20/editor.js',import.meta.url),'utf8');
const start=source.indexOf('function updateTshirtZoneTextures(');
const end=source.indexOf('\nfunction findLargestMesh(',start);
const zones=['Front','Back','Left Sleeve','Right Sleeve','Collar'];
for(const id of ['tshirt','long-sleeve-tshirt','short-sleeve-polo','long-sleeve-polo']){
  const states=new Map(zones.map(zone=>[zone,{background:'#336699',layers:[{type:'text',text:zone,visible:true}]}]));
  const meshes=new Map(zones.map(zone=>[zone,new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshStandardMaterial())]));
  const interiors=new Map(id==='tshirt'?zones.slice(2).map(zone=>[zone,new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial())]):[]);
  const calls=[];
  const artwork=(zone,size,options={})=>{
    calls.push({zone,options});
    const canvas=createCanvas(16,16),ctx=canvas.getContext('2d');
    ctx.fillStyle='#CC3300';ctx.fillRect(0,0,16,16);return canvas;
  };
  const c=vm.createContext({THREE,product:{id,zones},tshirtZoneMeshes:meshes,tshirtInteriorMeshes:interiors,
    zoneState:zone=>states.get(zone),previewTextureMax:()=>16,ensureTemplateImage:()=>null,
    disposeZoneTexture:mesh=>{mesh.material.map?.dispose();mesh.material.map=null;},
    TSHIRT_BODY_ARTWORK_OFFSET_Y,tshirtBodyImageOffsetY,hasOpaqueImageEdges:()=>false,
    makeShirtPreviewArtwork:artwork,makeLongSleeveTshirtArtworkCanvas:(zone,size)=>artwork(zone,size,{longSleeve:true}),
    document:{createElement:()=>createCanvas(1,1)},renderer:{capabilities:{getMaxAnisotropy:()=>1}},
    isShirtSplash:()=>false,isCutlineBottomArtwork:()=>false});
  vm.runInContext(source.slice(start,end),c);
  assert.equal(c.updateTshirtZoneTextures(),true);
  assert.equal(calls.length,5);
  for(const {zone,options} of calls){
    if(id==='tshirt'&&zone==='Back'){
      assert.equal(options.offsetY,-.09,'Back retains its approved text correction');
      assert.equal(options.imageOffsetY({type:'image'}),-.09);
      assert.equal(options.imageOffsetY({type:'image',libraryAssetId:'locked',libraryLocked:true}),0);
      assert.equal(options.imageOffsetY({type:'image',chatBackground:true}),0);
    }else if(id==='long-sleeve-tshirt')assert.equal(options.longSleeve,true);
    else assert.deepEqual(Object.keys(options),[],`${id}/${zone} must not receive the legacy T-shirt body offset`);
    const material=meshes.get(zone).material;
    assert(material.map);assert.equal(material.transparent,false);assert.equal(material.opacity,1);
  }
  for(const mesh of interiors.values())assert.equal(mesh.material.color.getHexString(),'cc3300','interior follows artwork-edge color');
  for(const state of states.values())state.layers=[];
  assert.equal(c.updateTshirtZoneTextures(),true);
  for(const mesh of meshes.values()){assert.equal(mesh.material.map,null);assert.equal(mesh.material.color.getHexString(),'336699');}
  for(const mesh of interiors.values())assert.equal(mesh.material.color.getHexString(),'336699','removing artwork restores the zone background');
}
console.log('PASS: four shirt texture routes, calibrated Front, shifted Back, locked backgrounds and interior color/reset.');
