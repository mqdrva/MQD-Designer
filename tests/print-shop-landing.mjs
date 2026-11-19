import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile('v20/print-shop-landing.js','utf8');
const store=new Map(),nodes=new Map(),requests=[];let submit,fail=true,focused=false;
const form={elements:Object.fromEntries(Object.entries({name:'Brenda',email:'brenda@example.com',shopName:'Brenda Designs',phone:''}).map(([k,v])=>[k,{value:v}])),reportValidity:()=>true,addEventListener:(name,fn)=>{assert.equal(name,'submit');submit=fn;}};
for(const id of ['shopDemo','openShopDemo','submitShopLead','shopLeadStatus','shopLeadSuccess','shopLeadReceipt','leadWebsite'])nodes.set(id,{dataset:{},value:'',setAttribute(){},focus(){focused=true;}});
nodes.set('shopLeadForm',form);nodes.set('printShopLanding',{querySelectorAll:()=>[]});
vm.runInNewContext(source,{document:{getElementById:id=>nodes.get(id),documentElement:{classList:{contains:()=>false}}},crypto,Date,JSON,AbortSignal,TypeError,sessionStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},fetch:async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return {ok:!fail,json:async()=>fail?{error:'Temporary failure'}:{status:'received',reference:'PILOT-123456789ABC',notificationAccepted:true}};}});
await submit({preventDefault(){}});assert.equal(form.hidden,undefined);assert.equal(nodes.get('shopLeadStatus').textContent,'Temporary failure');assert.equal(nodes.get('submitShopLead').disabled,false);
fail=false;await submit({preventDefault(){}});assert.equal(requests[0].body.requestId,requests[1].body.requestId,'retry keeps the same id');assert.equal(form.hidden,true);assert.equal(nodes.get('shopLeadSuccess').hidden,false);assert(focused);assert.equal(JSON.parse(store.get('mqd-shop-interest-contact-v1')).shopName,'Brenda Designs');assert.equal(requests[1].body.contact.phone,'');
const setup=await fs.readFile('print-shop-setup.html','utf8'),listing=await fs.readFile('print-shops.html','utf8');
const main=html=>html.match(/<main id="printShopLanding"[\s\S]*?<\/main>/)[0];assert.equal(main(setup).replace('data-demo-src=','src='),main(listing),'both entry points show the same offer');
const modeScript=setup.match(/<script>const shopQuery=[\s\S]*?<\/script>/)[0].replace(/^<script>|<\/script>$/g,'');
for(const [search,hash,expected] of [['','',false],['?configure=1','',true],['?accountShop=test','',true],['?setupId=test','#manage=token',true],['?ownerWorkspace=1','',true],['','#manage=token',true]]){let configured=false;vm.runInNewContext(modeScript,{URLSearchParams,location:{search,hash},document:{documentElement:{classList:{add:()=>{configured=true;}}}}});assert.equal(configured,expected,search+hash);}
console.log('PASS landing: truthful save/error states, same-id retry, optional phone, contact handoff, matching entry pages, preserved account/private/setup routes.');
