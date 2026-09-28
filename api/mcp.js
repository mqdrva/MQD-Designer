import {AI_PRODUCTS,AI_FONTS,sanitizePlan,encodePlan} from '../v20/ai-design-contract.js';

const PRODUCT_IDS=AI_PRODUCTS.map(p=>p.id);
const HEX_PATTERN='^#[0-9A-Fa-f]{6}$';

const tools=[
  {
    name:'list_products',
    title:'List MyMerchNow garments',
    description:'Lists the garments and printable zones available in the MyMerchNow 2D/3D designer. Use this when a customer is choosing a garment or when valid print-zone names are needed.',
    inputSchema:{type:'object',additionalProperties:false,properties:{}},
    outputSchema:{type:'object',additionalProperties:false,required:['products'],properties:{products:{type:'array',items:{type:'object',additionalProperties:false,required:['id','name','zones'],properties:{id:{type:'string'},name:{type:'string'},zones:{type:'array',items:{type:'string'}}}}}}},
    annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}
  },
  {
    name:'create_design_draft',
    title:'Create MyMerchNow design draft',
    description:'Creates a MyMerchNow draft link from customer-facing design choices. Use only product ids and zones returned by list_products. The draft can set customer artwork placeholders, text, colors and placement only. It cannot alter garment models, UVs, mappings, templates, renderer logic, pricing, checkout, or authentication. If logo elements are used, tell the customer they will upload the logo after opening the link.',
    inputSchema:{
      type:'object',additionalProperties:false,required:['productId','summary','zones'],
      properties:{
        productId:{type:'string',enum:PRODUCT_IDS},
        summary:{type:'string',minLength:1,maxLength:280},
        zones:{type:'array',minItems:1,maxItems:6,items:{
          type:'object',additionalProperties:false,required:['zone','background','elements'],
          properties:{
            zone:{type:'string',maxLength:40},
            background:{type:'string',pattern:HEX_PATTERN},
            elements:{type:'array',maxItems:6,items:{
              type:'object',additionalProperties:false,
              required:['kind','text','x','y','scale','rotation','color','strokeColor','strokeWidth','font','bold','italic','align'],
              properties:{
                kind:{type:'string',enum:['logo','text']},
                text:{type:['string','null'],maxLength:80},
                x:{type:'number',minimum:-100,maximum:100},
                y:{type:'number',minimum:-100,maximum:100},
                scale:{type:'number',minimum:.05,maximum:2.2},
                rotation:{type:'number',minimum:-180,maximum:180},
                color:{type:'string',pattern:HEX_PATTERN},
                strokeColor:{type:'string',pattern:HEX_PATTERN},
                strokeWidth:{type:'number',minimum:0,maximum:20},
                font:{type:'string',enum:AI_FONTS},
                bold:{type:'boolean'},italic:{type:'boolean'},
                align:{type:'string',enum:['left','center','right']}
              }
            }}
          }
        }}
      }
    },
    outputSchema:{type:'object',additionalProperties:false,required:['url','productId','summary','needsLogoUpload'],properties:{url:{type:'string'},productId:{type:'string'},summary:{type:'string'},needsLogoUpload:{type:'boolean'}}},
    annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false,idempotentHint:true}
  }
];

function json(res,status,payload){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.end(JSON.stringify(payload));
}
function result(id,value){return{jsonrpc:'2.0',id,result:value};}
function error(id,code,message){return{jsonrpc:'2.0',id,error:{code,message}};}
async function readBody(req){
  if(req.body&&typeof req.body==='object')return req.body;
  if(typeof req.body==='string'){try{return JSON.parse(req.body)}catch{return null}}
  let raw='';
  for await(const chunk of req){raw+=chunk;if(raw.length>100000)throw new Error('Request too large.');}
  try{return JSON.parse(raw||'{}')}catch{return null}
}
function callTool(name,args){
  if(name==='list_products'){
    return{
      structuredContent:{products:AI_PRODUCTS},
      content:[{type:'text',text:`MyMerchNow has ${AI_PRODUCTS.length} garments. Use only the returned product ids and their listed print zones when creating a draft.`}]
    };
  }
  if(name==='create_design_draft'){
    const productId=PRODUCT_IDS.includes(args?.productId)?args.productId:'tshirt';
    const safe=sanitizePlan({version:'mqd-ai-plan-v1',productId,summary:args?.summary,zones:args?.zones},{fallbackProductId:productId});
    const needsLogoUpload=safe.zones.some(zone=>zone.elements.some(el=>el.kind==='logo'));
    const url=`https://mymerchnow.app/#ai-plan=${encodePlan(safe)}`;
    const structuredContent={url,productId:safe.productId,summary:safe.summary,needsLogoUpload};
    return{
      structuredContent,
      content:[{type:'text',text:needsLogoUpload
        ?`Draft created: ${url}\nThe customer should open it, upload their logo in the AI Designer panel, click Apply Draft, and review the 2D/3D garment before saving or purchasing.`
        :`Draft created: ${url}\nThe customer should open it, click Apply Draft, and review the 2D/3D garment before saving or purchasing.`}]
    };
  }
  return null;
}

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','content-type, mcp-session-id');
  res.setHeader('Access-Control-Expose-Headers','Mcp-Session-Id');

  if(req.method==='OPTIONS'){res.statusCode=204;return res.end();}
  if(req.method!=='POST'){res.setHeader('Allow','POST, OPTIONS');return json(res,405,{error:'Method not allowed'});}

  let body;
  try{body=await readBody(req)}catch{return json(res,413,{error:'Request too large'});}
  if(!body||body.jsonrpc!=='2.0')return json(res,400,error(body?.id??null,-32600,'Invalid Request'));

  const id=body.id??null;
  if(body.method==='initialize'){
    const protocolVersion=body.params?.protocolVersion||'2025-06-18';
    return json(res,200,result(id,{
      protocolVersion,
      capabilities:{tools:{}},
      serverInfo:{name:'mymerchnow-designer',version:'0.1.0'},
      instructions:'Create customer-design drafts only. Never claim access to or attempt to change garment models, UVs, mesh data, templates, garment mappings, calibration, renderer behavior, pricing, checkout, or authentication. Use list_products when the garment or zone names are unclear.'
    }));
  }
  if(body.method==='notifications/initialized'){
    res.statusCode=202;return res.end();
  }
  if(body.method==='ping')return json(res,200,result(id,{}));
  if(body.method==='tools/list')return json(res,200,result(id,{tools}));
  if(body.method==='tools/call'){
    const out=callTool(body.params?.name,body.params?.arguments||{});
    if(!out)return json(res,200,error(id,-32602,'Unknown tool or invalid arguments'));
    return json(res,200,result(id,out));
  }
  return json(res,200,error(id,-32601,'Method not found'));
}
