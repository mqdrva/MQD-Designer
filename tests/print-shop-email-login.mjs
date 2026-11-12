import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {requestShopSignIn} from '../v20/print-shop-email-login.js';
const source=(await fs.readFile(new URL('../v20/print-shop-designs.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
for(const scenario of ['new-email','existing-email','rate-limit','callback','expired']){
 const elements=Object.fromEntries(['designStatus','designEmail','designEmailLink','designLogin','designWorkspace','designShop','designEngine','savedDesigns','designPasswordSignIn','designPassword','designGoogle','designLogout','newShopDesign'].map(id=>[id,{value:'',hidden:id==='designWorkspace',disabled:false,textContent:'',reportValidity:()=>true,replaceChildren(...children){this.children=children;this.value=children[0]?.value||'';}}]));
 elements.designEmail.value=' owner@example.com ';
 const calls=[];let cooldown;
 const shopDesignAuth={auth:{getSession:async()=>({data:{session:scenario==='callback'?{access_token:'synthetic'}:null}}),signInWithOtp:async body=>{calls.push(body);return {error:scenario==='rate-limit'?{status:429}:null};}}};
 const context=vm.createContext({document:{getElementById:id=>elements[id]},location:{origin:'https://mymerchnow.app',search:scenario==='expired'?'?error=access_denied':'',href:'https://mymerchnow.app/print-shop-designs.html'},URL,URLSearchParams,Option:class{constructor(name,value){this.text=name;this.value=value;}},requestShopSignIn,shopDesignAuth,setTimeout:fn=>{cooldown=fn;},designCall:async body=>body.action==='shops'?{shops:[{id:'owned-shop',slug:'owned-shop',name:'Owned Shop',engines:['2d']}]}:{designs:[]}});
 await vm.runInContext('(async()=>{'+source+'})()',context);
 if(scenario==='callback'){assert.equal(elements.designWorkspace.hidden,false);assert.equal(elements.designLogin.hidden,true);assert.equal(calls.length,0);continue;}
 if(scenario==='expired'){assert.match(elements.designStatus.textContent,/new link/);continue;}
 await elements.designLogin.onsubmit({preventDefault(){}});
 assert.equal(calls.length,1);assert.equal(calls[0].email,'owner@example.com');assert.equal(calls[0].options.shouldCreateUser,true);assert.equal(calls[0].options.emailRedirectTo,'https://mymerchnow.app/print-shop-designs.html');
 if(scenario==='rate-limit'){assert.equal(elements.designEmailLink.disabled,false);assert.match(elements.designStatus.textContent,/wait a minute/);}
 else{assert.equal(elements.designEmailLink.disabled,true);assert.match(elements.designStatus.textContent,/same browser/);await elements.designLogin.onsubmit({preventDefault(){}});assert.equal(calls.length,1);cooldown();assert.equal(elements.designEmailLink.disabled,false);}
}
let calls=0;await assert.rejects(()=>requestShopSignIn({auth:{signInWithOtp:()=>{calls++;}}},'invalid','https://mymerchnow.app'));assert.equal(calls,0);
console.log('PASS passwordless Print Shop login: first-time and existing accounts, fixed return URL, cooldown, rate errors, callback workspace, expired link and invalid email. No emails sent.');
