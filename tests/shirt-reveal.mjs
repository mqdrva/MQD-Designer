import assert from 'node:assert/strict';
import {chooseVideoType} from '../v20/shirt-reveal.js';
assert.equal(chooseVideoType(null),null);
assert.equal(chooseVideoType({isTypeSupported:t=>t==='video/webm;codecs=vp8'}),'video/webm;codecs=vp8');
assert.equal(chooseVideoType({isTypeSupported:t=>t==='video/mp4'}),'video/mp4');
assert.equal(chooseVideoType({isTypeSupported:()=>false}),null);
console.log('PASS: MP4 preference, WebM fallback, unsupported browser handling');
