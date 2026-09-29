import {AI_PRODUCTS,AI_FONTS} from '../v20/ai-design-contract.js';
import {randomBytes} from 'node:crypto';
import {encodeTransfer,validateTransferPlan,validateArtworkFile} from '../v20/ai-transfer-contract.js';

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

const previewTool={
  name:'prepare_design_preview',title:'Prepare MyMerchNow return link',
  description:'Prepares a protected MyMerchNow design return link from customer-facing layout choices. If the customer started on MyMerchNow, pass the exact contextId and returnUrl supplied by the website so saved artwork can be restored. If the customer starts directly in ChatGPT, omit contextId and returnUrl and a fresh MyMerchNow design context is created automatically. For a new visual background, use backgroundAction upload with artwork layers and omit backgroundFile; the customer uploads the generated flat background once on MyMerchNow. For a layout-only revision use reuse. Never alter garment models, UVs, mappings, templates, renderer behavior, pricing, checkout, or authentication.',
  inputSchema:{type:'object',additionalProperties:false,required:['productId','summary','zones','backgroundAction'],properties:{
    ...tools[1].inputSchema.properties,
    contextId:{type:'string',pattern:'^[a-f0-9]{32}$',description:'Optional existing MyMerchNow design context. When the customer started on MyMerchNow, pass it exactly so saved artwork can be restored. Omit it when starting directly in ChatGPT.'},
    returnUrl:{type:'string',maxLength:2000,description:'Optional MyMerchNow return URL supplied by the website. Omit it when starting directly in ChatGPT; the production designer URL is used automatically.'},
    backgroundAction:{type:'string',enum:['upload','generate','reuse','none'],description:'upload prepares a layout link with no backgroundFile; the customer creates the background separately in ChatGPT Images and uploads it once on MyMerchNow. generate requires an actual transferable backgroundFile. reuse retains a website background. none is a solid-color design.'},
    backgroundFile:{type:'object',additionalProperties:false,required:['download_url','file_id'],properties:{download_url:{type:'string'},file_id:{type:'string'},mime_type:{type:'string'},file_name:{type:'string'}}}
  }},
  outputSchema:{type:'object',additionalProperties:false,required:['url','productId','summary','backgroundAttached','needsBackgroundUpload'],properties:{url:{type:'string'},productId:{type:'string'},summary:{type:'string'},backgroundAttached:{type:'boolean'},needsBackgroundUpload:{type:'boolean'}}},
  annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
  _meta:{'openai/fileParams':['backgroundFile']}
};
// Expand the customer-layer vocabulary without altering the garment engine.
previewTool.inputSchema.properties.zones=JSON.parse(JSON.stringify(tools[1].inputSchema.properties.zones));
const previewElement=previewTool.inputSchema.properties.zones.items.properties.elements.items;
previewElement.properties.kind.enum=['logo','text','artwork'];
previewElement.properties.letterSpacing={type:'number',minimum:-10,maximum:30};
previewElement.required=['kind','x','y','scale'];
tools.push(previewTool);

export function handoffEnabled(){return process.env.MQD_AI_HANDOFF_ENABLED==='1'||process.env.VERCEL_ENV==='preview';}
export function prepareDesignPreview(args){
  const normalized={
    ...args,
    contextId:args?.contextId||randomBytes(16).toString('hex'),
    returnUrl:args?.returnUrl||'https://mymerchnow.app/?ai-test=1'
  };
  const plan=validateTransferPlan(normalized);
  const destination=new URL(normalized.returnUrl);
  const local=['localhost','127.0.0.1','[::1]'].includes(destination.hostname)&&destination.protocol==='http:';
  const remote=destination.protocol==='https:'&&!destination.port&&(destination.hostname==='mymerchnow.app'||destination.hostname===process.env.VERCEL_URL||destination.hostname===process.env.VERCEL_BRANCH_URL);
  if((!local&&!remote)||destination.username||destination.password||destination.pathname!=='/')throw new Error('Use the original MyMerchNow return website.');
  const artwork=normalized.backgroundFile?validateArtworkFile(normalized.backgroundFile):null;
  if(!['upload','generate','reuse','none'].includes(normalized.backgroundAction))throw new Error('Specify whether the background is uploaded, generated, reused, or not requested.');
  if(normalized.backgroundAction==='upload'&&artwork)throw new Error('For the one-upload workflow, omit backgroundFile.');
  if(normalized.backgroundAction==='generate'&&!artwork)throw new Error('Attach the generated backgroundFile before creating the preview. Reuse the image already generated; do not generate it again.');
  if(plan.zones.some(z=>z.elements.some(e=>e.kind==='artwork'))&&normalized.backgroundAction==='none')throw new Error('Artwork layers need a generated or reused background image.');
  destination.hash='ai-transfer='+encodeTransfer(plan,artwork,normalized.backgroundAction==='upload');
  return {url:destination.href,productId:plan.productId,summary:plan.summary,backgroundAttached:!!artwork,needsBackgroundUpload:normalized.backgroundAction==='upload'};
}

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
  if(name==='prepare_design_preview'){
    if(!handoffEnabled())return {isError:true,content:[{type:'text',text:'Automatic artwork transfer is not enabled on this deployment yet. Do not generate another image or claim the design is ready.'}]};
    try{
      const draft=prepareDesignPreview(args);
      const linkLabel=draft.needsBackgroundUpload?'Upload background and view shirt':'View my shirt';
      return {structuredContent:draft,content:[{type:'text',text:`[${linkLabel}](${draft.url})\n${draft.needsBackgroundUpload?'Show this exact link now. Do not generate an image in this conversation. Give the customer a short background-only prompt and ask them to create the image in a separate ChatGPT Images chat at https://chatgpt.com/images/. After saving it, open this MyMerchNow link in the same browser where the logo was uploaded and choose the image once. The saved logo, text, and layout are already waiting there; the shirt preview appears after upload. The design is not complete until that upload.':'Open in the same browser used to upload the logo. The website applies the layout with the available images. If a file link expires, resend the existing image; do not regenerate it.'}`}]};
    }catch(err){return {isError:true,content:[{type:'text',text:err.message}]};}
  }
  if(name==='list_products'){
    return{
      structuredContent:{products:AI_PRODUCTS},
      content:[{type:'text',text:`MyMerchNow has ${AI_PRODUCTS.length} garments. Use only the returned product ids and their listed print zones when creating a draft.`}]
    };
  }
  if(name==='create_design_draft'){
    // Draft creation is paused while the logo and generated-artwork flow is repaired.
    return {isError:true,content:[{type:'text',text:'MyMerchNow AI design is temporarily unavailable while we improve it. No draft was created. You can still upload artwork and design manually at https://mymerchnow.app/. Do not claim that the requested design is complete.'}]};
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
      serverInfo:{name:'mymerchnow-designer',version:'0.3.0'},
      instructions:handoffEnabled()?'Use list_products for valid garments and zones, then prepare_design_preview for customer-controlled layouts. Include every garment zone exactly once. When a request came from MyMerchNow, preserve its contextId and returnUrl exactly; when a user starts directly in ChatGPT, omit them and the server creates a fresh context. For a new visual background use backgroundAction upload with artwork layers and no backgroundFile, then show the Upload background and view shirt link and explain the one-upload workflow. For layout-only revisions use reuse; for designs without artwork use none. Never alter garment models, UVs, mappings, templates, renderer behavior, pricing, checkout, or authentication.':'AI design creation is temporarily paused. Do not create or invent draft links or claim a design is complete.'
    }));
  }
  if(body.method==='notifications/initialized'){
    res.statusCode=202;return res.end();
  }
  if(body.method==='ping')return json(res,200,result(id,{}));
  if(body.method==='tools/list')return json(res,200,result(id,{tools:tools.filter(tool=>tool.name==='list_products'||(handoffEnabled()&&tool.name==='prepare_design_preview'))}));
  if(body.method==='tools/call'){
    if(!tools.some(tool=>tool.name===body.params?.name))return json(res,200,error(id,-32602,'Unknown tool or invalid arguments'));
    const out=callTool(body.params?.name,body.params?.arguments||{});
    if(!out)return json(res,200,error(id,-32602,'Unknown tool or invalid arguments'));
    return json(res,200,result(id,out));
  }
  return json(res,200,error(id,-32601,'Method not found'));
}
