import assert from 'node:assert/strict';
import {verifyTeamProduction,packageTeamMaster,restorePackagedTeamMaster} from '../supabase/functions/_shared/mqd-team-production.js';
import {GARMENT_MAPPING} from '../supabase/functions/_shared/shirt-games/mapping.js';
const png=(w,h)=>{const b=Buffer.alloc(24);b.set([137,80,78,71,13,10,26,10]);b.write('IHDR',12);b.writeUInt32BE(w,16);b.writeUInt32BE(h,20);return b;};
const files=new Map(),zip={file(path,content){if(content!==undefined){files.set(path,content);return this;}return files.has(path)?{async:async type=>type==='string'?String(files.get(path)):files.get(path)}:null;}};
for(const [i,zone] of GARMENT_MAPPING.tshirt.zones.entries()){const t=GARMENT_MAPPING.tshirt.templates[zone];files.set('production-zones/'+String(i+1).padStart(2,'0')+'-'+zone.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.png',png(t.width,t.height));}
const source=png(250,500);files.set('originals/Front-0-logo.png',source);
const design={engine:'3d',design:{product:{id:'tshirt'},design:{zones:{Front:{layers:[{id:'logo',type:'image',filename:'logo.png',src:'data:image/png;base64,'+source.toString('base64'),x:0,y:0,scale:1,rotation:0}]}}}}};
const verified=await verifyTeamProduction(zip,design);assert.equal(verified.originals[0].width,250);assert.equal(verified.originals[0].height,500);assert.equal(verified.zones.length,5);
files.set('originals/Front-0-logo.png',png(251,500));await assert.rejects(()=>verifyTeamProduction(zip,design),/Original source/);files.set('originals/Front-0-logo.png',source);
files.set('production-zones/01-front.png',png(100,100));await assert.rejects(()=>verifyTeamProduction(zip,design),/Incorrect output dimensions/);
console.log('PASS production validation: original header dimensions and SHA-256, exact garment output dimensions, altered source and undersized output rejection.');

const master={id:'historical-master',team_id:'synthetic-team',payload:structuredClone(design.design),rules:[]};const exact=JSON.stringify(master);await packageTeamMaster(zip,master,verified);assert.equal(JSON.stringify(master),exact);assert.equal(JSON.stringify(await restorePackagedTeamMaster(zip)),exact);assert(!String(files.get('purchased-team-master.json')).includes(source.toString('base64')));files.set('originals/Front-0-logo.png',png(251,500));await assert.rejects(()=>restorePackagedTeamMaster(zip),/source changed/);files.set('originals/Front-0-logo.png',source);const packaged=JSON.parse(files.get('purchased-team-master.json'));packaged.payload.design.zones.Front.layers[0].x=99;files.set('purchased-team-master.json',JSON.stringify(packaged));await assert.rejects(()=>restorePackagedTeamMaster(zip),/snapshot changed/);console.log('PASS lossless purchased-master original reuse, exact historical JSON restoration, source and placement tamper rejection.');

// Optional member backgrounds retain their own exact original and measured size.
files.set('production-zones/01-front.png',png(GARMENT_MAPPING.tshirt.templates.Front.width,GARMENT_MAPPING.tshirt.templates.Front.height));
const background=png(3600,2400),withBackground=structuredClone(design);withBackground.design.design.teamBackground={src:'data:image/png;base64,'+background.toString('base64'),filename:'synthetic.png'};files.set('originals/member-background.png',background);
withBackground.design.design.zones.Front.layers[0].teamLogo={mode:'dark-on-white-v1',color:'#FFFFFF'};
const backgroundProof=await verifyTeamProduction(zip,withBackground);assert.equal(backgroundProof.background.width,3600);assert.equal(backgroundProof.background.height,2400);assert.equal(backgroundProof.originals[0].logoTreatment.color,'#FFFFFF');
files.set('originals/member-background.png',png(3601,2400));await assert.rejects(()=>verifyTeamProduction(zip,withBackground),/background does not match/);
console.log('PASS member background source bytes/dimensions and fixed-logo reproduction treatment; changed background originals denied.');
