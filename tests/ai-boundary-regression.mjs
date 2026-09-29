import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AI_PRODUCTS,sanitizePlan} from '../v20/ai-design-contract.js';

const product=AI_PRODUCTS.find(p=>p.id==='tshirt');
assert(product,'T-shirt AI contract missing');

const hostile=sanitizePlan({
  productId:'tshirt',
  model:'evil.glb',
  renderer:{replace:true},
  templates:{Front:'evil'},
  engine:{calibration:'evil'},
  zones:[
    {zone:'Front',background:'#112233',elements:[{kind:'logo',x:999,y:-999,scale:99,rotation:999,color:'#000000',strokeColor:'#FFFFFF',strokeWidth:99,font:'NotAFont',bold:true,italic:false,align:'center'}]},
    {zone:'Not A Real Zone',background:'#000000',elements:[]}
  ]
});
assert.equal(hostile.productId,'tshirt');
assert.equal(hostile.zones.length,product.zones.length);
assert(!Object.hasOwn(hostile,'model'));
assert(!Object.hasOwn(hostile,'renderer'));
assert(!Object.hasOwn(hostile,'templates'));
assert(!Object.hasOwn(hostile,'engine'));
assert(!hostile.zones.some(z=>z.zone==='Not A Real Zone'));
const logo=hostile.zones.find(z=>z.zone==='Front').elements[0];
assert.equal(logo.x,100);
assert.equal(logo.y,-100);
assert.equal(logo.scale,2.2);
assert.equal(logo.rotation,180);
assert.equal(logo.strokeWidth,20);
assert.equal(logo.font,'Inter');

const client=readFileSync(new URL('../v20/ai-designer.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../api/ai-design.js',import.meta.url),'utf8');
const mcp=readFileSync(new URL('../api/mcp.js',import.meta.url),'utf8');
const executable=client+'\n'+server+'\n'+mcp;

const forbiddenCodePatterns=[
  /from\s+['"][^'"]*editor\.js['"]/,
  /\/assets\/templates\//,
  /production-mapping/i,
  /\.glb(?:['"\\`?]|\b)/i,
  /THREE\s*\./,
  /renderer\s*\./,
  /\buv(?:s)?\s*=/i,
  /\btemplates\s*=/i,
  /\bmodel\s*=/
];
for(const pattern of forbiddenCodePatterns){
  assert(!pattern.test(executable),'AI boundary violation: '+pattern);
}

const allowedDesignerCalls=[...client.matchAll(/MQDDesigner\?*\.([A-Za-z0-9_]+)/g)].map(m=>m[1]);
for(const method of allowedDesignerCalls){
  assert(['exportDesign','loadDesign','getContext'].includes(method),'AI called unsupported designer method: '+method);
}

assert(client.includes("product:{id:product.id}"),'AI load payload must identify only the existing product id.');
assert(client.includes('design\n  };')||client.includes('design\n  }'),'AI load payload must carry customer design state.');
assert(!client.includes("fetch(API_URL"),'Customer ChatGPT flow must not call the merchant-funded AI endpoint.');
assert(client.includes("const CHATGPT_URL='https://chatgpt.com/'"),'Customer AI flow must hand off to ChatGPT.');
assert(client.includes('navigator.clipboard.writeText(request)'),'Customer AI flow must copy a bounded MCP request.');

console.log('AI boundary regression passed: customer-design state only; frozen garment engine remains outside the AI interface.');
