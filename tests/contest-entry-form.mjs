import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';
const elements=new Map(),calls=[];
function element(id=''){return {id,hidden:false,value:'',files:[],textContent:'',children:[],append(...items){this.children.push(...items)},replaceChildren(...items){this.children=items;this.value=''},scrollIntoView(){},querySelector(){return element()},setAttribute(){}};}
const $=id=>{if(!elements.has(id))elements.set(id,element(id));return elements.get(id)};
const user={id:'customer',email_confirmed_at:'yes'};
const round={id:'round',opens_at:'2026-01-01',closes_at:'2030-01-01',announces_at:'2030-01-02'};
let designs=[{id:'shirt',name:'Saved shirt'}],entries=[];
const request=async body=>{calls.push(body);if(body.action==='monthly')return {current:round,history:[],approved:0,server_now:new Date().toISOString()};if(body.action==='monthly_designs')return {designs};if(body.action==='monthly_mine')return {entries};if(body.action==='monthly_submit'){entries=[{contest_id:'round',label:'Shirt',status:'pending'}];return {submissionId:'entry'}};throw Error('Unexpected '+body.action)};
const context=vm.createContext({console,URL,Date,Intl,Promise,Option:function(text,value){return {text,value}},document:{getElementById:$,createElement:element,hidden:false},location:{href:'https://example.invalid/contests.html#monthlySubmitPanel',origin:'https://example.invalid',hash:'#monthlySubmitPanel'},matchMedia:()=>({matches:true}),addEventListener(){},setInterval(){return 1},clearInterval(){},setTimeout,createClient:()=>({auth:{getSession:async()=>({data:{session:{user,access_token:'token'}}}),onAuthStateChange(){}}}),contestRequest:request,CONTEST_KEY:'test'});
let src=fs.readFileSync('v20/monthly-contests.js','utf8').replace(/^import .*;\n/gm,'');src+='\nglobalThis.testAccount=account;';vm.runInContext(src,context);
await new Promise(resolve=>setTimeout(resolve,20));
assert.equal($('monthlySavedFields').hidden,false);assert.equal($('monthlySavedDesign').required,true);assert.equal($('monthlyUploadPhoto').required,false);assert.equal($('monthlySubmit').disabled,false);
$('monthlySavedDesign').value='shirt';$('monthlyEntryTitle').value='Shirt';$('monthlyPublishConsent').checked=true;
await $('monthlyEntryForm').onsubmit({preventDefault(){}});
const sent=calls.find(c=>c.action==='monthly_submit');assert.equal(sent.designId,'shirt');assert.equal(sent.preview,null);assert.equal(sent.videoPath,null);assert.equal(sent.consent,true);assert.equal($('monthlySubmit').disabled,true);
entries=[];designs=[];await context.testAccount();assert.equal($('monthlySubmit').disabled,true);
assert(!src.includes('monthlyEntryMethod'));
console.log('PASS: contest-page entry shows required saved shirt, optional media; submits exact design ID; blocks duplicate and empty-account submissions.');
