import assert from 'node:assert/strict';
import {teamProductionFonts} from '../v20/team-production-fonts.js';
const css=Array.from({length:8},(_,i)=>`@font-face {font-family:'Inter';src:url(https://fonts.gstatic.com/${i%7}.woff2);}`).join('\n');
let active=0,peak=0,requests=[];
globalThis.document={querySelectorAll:()=>[{href:'https://fonts.googleapis.com/css2?family=Inter'}],fonts:{load:async()=>{},check:()=>true}};
globalThis.fetch=async url=>{
 if(url.includes('googleapis'))return {ok:true,text:async()=>css};
 requests.push(url);active++;peak=Math.max(peak,active);
 await new Promise(r=>setTimeout(r,15));active--;
 return {ok:true,blob:async()=>new Blob([url])};
};
const entries=await teamProductionFonts([{type:'text',font:'Inter'}]);
assert.equal(peak,4);assert.equal(requests.length,7);
for(let i=0;i<7;i++){assert.equal(entries[i].name,`fonts/font-${i}.woff2`);assert.equal(await entries[i].data.text(),`https://fonts.gstatic.com/${i}.woff2`);}
const archived=entries.find(e=>e.name==='fonts/fonts.css').data;
assert.equal((archived.match(/url\(font-0.woff2\)/g)||[]).length,2);
assert(!archived.includes('https:'));
assert.deepEqual(await teamProductionFonts([]),[]);
await assert.rejects(teamProductionFonts([{type:'text',font:'Unavailable'}]),/cannot be included/);
globalThis.fetch=async url=>url.includes('googleapis')?{ok:true,text:async()=>css}:{ok:false};
await assert.rejects(teamProductionFonts([{type:'text',font:'Inter'}]),/Font download failed/);
console.log('Font reproduction: bounded parallel downloads, exact bytes, stable references, deduplication and failure checks passed.');
