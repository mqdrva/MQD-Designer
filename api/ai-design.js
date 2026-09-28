import {AI_PRODUCTS,AI_FONTS,sanitizePlan} from '../v20/ai-design-contract.js';

const OPENAI_URL='https://api.openai.com/v1/responses';
const MAX_MESSAGE=1200;
const ALLOWED_MODES=new Set(['create','revise']);

const productText=AI_PRODUCTS.map(p=>`${p.id}: ${p.name} [${p.zones.join(', ')}]`).join('\n');

const planSchema={
  type:'object',
  additionalProperties:false,
  required:['version','productId','summary','zones'],
  properties:{
    version:{type:'string',enum:['mqd-ai-plan-v1']},
    productId:{type:'string',enum:AI_PRODUCTS.map(p=>p.id)},
    summary:{type:'string',maxLength:280},
    zones:{
      type:'array',maxItems:6,
      items:{
        type:'object',additionalProperties:false,
        required:['zone','background','elements'],
        properties:{
          zone:{type:'string',maxLength:40},
          background:{type:'string',pattern:'^#[0-9A-Fa-f]{6}$'},
          elements:{
            type:'array',maxItems:6,
            items:{
              type:'object',additionalProperties:false,
              required:['kind','text','x','y','scale','rotation','color','strokeColor','strokeWidth','font','bold','italic','align'],
              properties:{
                kind:{type:'string',enum:['logo','text']},
                text:{type:['string','null'],maxLength:80},
                x:{type:'number',minimum:-100,maximum:100},
                y:{type:'number',minimum:-100,maximum:100},
                scale:{type:'number',minimum:.05,maximum:2.2},
                rotation:{type:'number',minimum:-180,maximum:180},
                color:{type:'string',pattern:'^#[0-9A-Fa-f]{6}$'},
                strokeColor:{type:'string',pattern:'^#[0-9A-Fa-f]{6}$'},
                strokeWidth:{type:'number',minimum:0,maximum:20},
                font:{type:'string',enum:AI_FONTS},
                bold:{type:'boolean'},
                italic:{type:'boolean'},
                align:{type:'string',enum:['left','center','right']}
              }
            }
          }
        }
      }
    }
  }
};

const SYSTEM=`You are the MyMerchNow apparel layout planner.
You produce ONLY a safe customer-design plan. You cannot and must not alter garment models, UVs, mesh data, templates, mappings, calibration values, renderer behavior, product zones, pricing, checkout, authentication, or production settings.

The only allowed design choices are:
- choose one existing product id
- choose a solid background HEX color for existing print zones
- place the customer's uploaded logo as a logo element
- add short text elements
- set customer layer x/y, scale, rotation, text color, stroke, font, bold/italic/alignment

Products and immutable zones:
${productText}

Coordinate rules:
- x and y range from -100 to 100; 0,0 is centered.
- negative y moves upward, positive y moves downward.
- scale 1.0 is a useful large default; 0.35-0.65 is usually small-to-medium; 1.1-1.5 is prominent.
- keep important logos/text comfortably inside the zone, usually x/y within +/-55.
- use no more than 6 elements per zone.
- if a logo is available, use logo elements where the user requests branding.
- do not invent phone numbers, websites, company names, slogans, or services.
- if the user asks for information they did not provide, omit that text rather than guessing.
- use strong contrast between text/logo surroundings and backgrounds.
- for a first draft, leave unused zones clean rather than filling them with unnecessary text.
- when revising, preserve unspecified choices from currentPlan unless the user explicitly requests a reset or product change.

Always return version "mqd-ai-plan-v1".`;

function textFromResponse(data){
  if(typeof data?.output_text==='string'&&data.output_text.trim())return data.output_text;
  for(const item of data?.output||[]){
    for(const part of item?.content||[]){
      if(part?.type==='output_text'&&typeof part.text==='string')return part.text;
    }
  }
  return'';
}
function cleanMessage(v){return String(v||'').replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,MAX_MESSAGE);}
function send(res,status,payload){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.end(JSON.stringify(payload));
}
async function readBody(req){
  if(req.body&&typeof req.body==='object')return req.body;
  if(typeof req.body==='string'){try{return JSON.parse(req.body)}catch{return{}}}
  let raw='';
  for await(const chunk of req){raw+=chunk;if(raw.length>30000)throw new Error('Request too large.');}
  try{return JSON.parse(raw||'{}')}catch{return{}}
}

export default async function handler(req,res){
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return send(res,405,{error:'Method not allowed.'});
  }
  try{
    const body=await readBody(req);
    const message=cleanMessage(body.message);
    const mode=ALLOWED_MODES.has(body.mode)?body.mode:'create';
    const currentProductId=AI_PRODUCTS.some(p=>p.id===body.currentProductId)?body.currentProductId:'tshirt';
    const hasLogo=body.hasLogo===true;
    const currentPlan=body.currentPlan?sanitizePlan(body.currentPlan,{fallbackProductId:currentProductId}):null;
    if(!message)return send(res,400,{error:'Describe the design you want.'});

    const apiKey=process.env.OPENAI_API_KEY;
    if(!apiKey)return send(res,503,{error:'AI Designer is installed but the server API key has not been connected yet.',code:'AI_KEY_MISSING'});

    const aiModel=process.env.OPENAI_MODEL||'gpt-5.6-luna';
    const userContext={
      mode,
      message,
      hasUploadedLogo:hasLogo,
      currentProductId,
      currentPlan:mode==='revise'?currentPlan:null
    };

    const response=await fetch(OPENAI_URL,{
      method:'POST',
      headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:aiModel,
        input:[
          {role:'system',content:[{type:'input_text',text:SYSTEM}]},
          {role:'user',content:[{type:'input_text',text:JSON.stringify(userContext)}]}
        ],
        text:{format:{type:'json_schema',name:'mqd_design_plan',strict:true,schema:planSchema}},
        max_output_tokens:1800
      })
    });

    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      console.error('AI design API error',response.status,data?.error?.message||'Unknown API error');
      return send(res,502,{error:'The AI designer could not create a draft right now.'});
    }
    const rawText=textFromResponse(data);
    if(!rawText)return send(res,502,{error:'The AI designer returned an empty draft.'});
    let parsed;
    try{parsed=JSON.parse(rawText)}catch{
      console.error('AI design JSON parse failed');
      return send(res,502,{error:'The AI designer returned an invalid draft.'});
    }
    const plan=sanitizePlan(parsed,{fallbackProductId:currentProductId});
    return send(res,200,{plan,model:aiModel});
  }catch(error){
    console.error('AI designer request failed',error);
    return send(res,500,{error:'The AI designer request failed.'});
  }
}
