import assert from 'node:assert/strict';
import {chooseVideoType,createRevealFile,shareRevealFile} from '../v20/shirt-reveal.js';
assert.equal(chooseVideoType(null),null);
assert.equal(chooseVideoType({isTypeSupported:t=>t==='video/webm;codecs=vp8'}),'video/webm;codecs=vp8');
assert.equal(chooseVideoType({isTypeSupported:t=>t==='video/mp4'}),'video/mp4');
assert.equal(chooseVideoType({isTypeSupported:()=>false}),null);
console.log('PASS: MP4 preference, WebM fallback, unsupported browser handling');
const blob=new Blob(['recorded video bytes']);
const mp4=createRevealFile(blob,'video/mp4;codecs=avc1.42E01E');
assert.equal(mp4.name,'MyMerchNow-shirt-reveal.mp4');
assert.equal(mp4.type,'video/mp4');
assert.equal(await mp4.text(),await blob.text());
assert.equal(createRevealFile(blob,'video/webm;codecs=vp8').type,'video/webm');
assert.equal(createRevealFile(blob,'video/webm').name,'MyMerchNow-shirt-reveal.webm');
let shared=false;
const pending=shareRevealFile(mp4,{
 canShare:({files})=>files[0]===mp4,
 share:({files})=>{assert.equal(files[0],mp4);shared=true;return Promise.resolve();}
});
assert.equal(shared,true,'share must run synchronously from the user tap');
assert.equal(await pending,'shared');
assert.equal(await shareRevealFile(mp4,{}),'unsupported');
assert.equal(await shareRevealFile(mp4,{canShare:()=>false,share:()=>assert.fail('unsupported file must not be shared')}),'unsupported');
assert.equal(await shareRevealFile(mp4,{canShare:()=>true,share:()=>Promise.reject(Object.assign(new Error(),{name:'AbortError'}))}),'cancelled');
assert.equal(await shareRevealFile(mp4,{canShare:()=>true,share:()=>Promise.reject(new Error('blocked'))}),'failed');
assert.equal(await shareRevealFile(mp4,{canShare:()=>{throw new Error('blocked');},share:()=>{}}),'failed');
console.log('PASS: phone-compatible files, immediate share, cancellation, blocked/unsupported fallbacks');
