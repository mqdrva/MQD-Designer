import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as pricing from '../v20/promotion-pricing.js';
const source=fs.readFileSync('v20/promotion-ui.js','utf8').replace(/^import .*\n/gm,'');
let now=pricing.HALLOWEEN_END-1;
const banner={hidden:true,textContent:'',getBoundingClientRect:()=>({height:30})};
const card={hidden:true};const listeners={};
vm.runInNewContext(source,{
 ...pricing,halloweenActive:()=>pricing.halloweenActive(now),
 Date:class extends Date{static now(){return now;}},Event,
 location:{pathname:'/'},setTimeout:()=>1,clearTimeout(){},
 window:{addEventListener:(event,fn)=>listeners[event]=fn,dispatchEvent(){}},
 document:{hidden:false,getElementById:()=>banner,querySelectorAll:selector=>selector==='[data-halloween-promo]'?[card]:[],querySelector:()=>null,documentElement:{style:{setProperty(){}}},addEventListener(){}}
});
assert.equal(card.hidden,false);assert.equal(banner.hidden,false);
now=pricing.HALLOWEEN_END;listeners.focus();
assert.equal(card.hidden,true);assert.equal(banner.hidden,true,'graphic and announcement expire together');
// Run the actual loader with two videos: no eager source, both play muted near viewport.
for(const reduced of [false,true]){
 let observe;const videos=Array.from({length:2},()=>({dataset:{videoSrc:'qa.mp4'},removeAttribute(name){assert.equal(name,'autoplay');this.autoRemoved=true;},load(){this.loaded=true;},play(){this.played=true;return Promise.resolve();}}));
 class Observer{constructor(fn){observe=fn;}observe(){}unobserve(){}}
 vm.runInNewContext(fs.readFileSync('v20/customer-videos.js','utf8'),{document:{querySelectorAll:()=>videos},window:{matchMedia:()=>({matches:reduced}),IntersectionObserver:Observer},IntersectionObserver:Observer});
 assert(videos.every(v=>!v.src));observe(videos.map(target=>({target,isIntersecting:true})));
 assert(videos.every(v=>v.muted&&v.defaultMuted&&v.loaded&&v.src==='qa.mp4'));
 assert(videos.every(v=>reduced?v.autoRemoved&&!v.played:v.played));
}
console.log('PASS: sale graphic expires with banner; both videos load near viewport, play muted, and respect reduced motion.');
