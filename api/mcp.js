import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {z} from 'zod';
import {AI_PRODUCTS,AI_FONTS,sanitizePlan,encodePlan} from '../v20/ai-design-contract.js';

const productIds=AI_PRODUCTS.map(p=>p.id);
const productEnum=z.enum(productIds);
const fontEnum=z.enum(AI_FONTS);

function createMyMerchNowServer(){
  const server=new McpServer(
    {name:'mymerchnow-designer',version:'0.1.0'},
    {instructions:'MyMerchNow tools may create customer-design drafts only. Never claim access to or attempt to change UVs, GLBs, mesh data, templates, garment mappings, calibration, renderer logic, pricing, checkout, or authentication. Use list_products before creating a draft when the garment is unclear. Draft links open the customer in MyMerchNow for review and purchase.'}
  );

  server.registerTool(
    'list_products',
    {
      title:'List MyMerchNow garments',
      description:'Lists the garments and printable zones available in the MyMerchNow 2D/3D designer. Use this when a customer is choosing a garment or when you need valid print-zone names.',
      inputSchema:{},
      outputSchema:{products:z.array(z.object({id:z.string(),name:z.string(),zones:z.array(z.string())}))},
      annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}
    },
    async()=>({
      structuredContent:{products:AI_PRODUCTS},
      content:[{type:'text',text:`MyMerchNow has ${AI_PRODUCTS.length} garments. Choose one of the returned product ids and only its listed print zones when creating a design draft.`}]
    })
  );

  const elementSchema=z.object({
    kind:z.enum(['logo','text']),
    text:z.string().max(80).nullable(),
    x:z.number().min(-100).max(100),
    y:z.number().min(-100).max(100),
    scale:z.number().min(.05).max(2.2),
    rotation:z.number().min(-180).max(180),
    color:z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    strokeColor:z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    strokeWidth:z.number().min(0).max(20),
    font:fontEnum,
    bold:z.boolean(),
    italic:z.boolean(),
    align:z.enum(['left','center','right'])
  });
  const zoneSchema=z.object({
    zone:z.string().max(40),
    background:z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    elements:z.array(elementSchema).max(6)
  });

  server.registerTool(
    'create_design_draft',
    {
      title:'Create MyMerchNow design draft',
      description:'Creates a safe MyMerchNow draft link from customer-facing design choices. Use only existing product ids and print zones returned by list_products. The link changes customer artwork, text, colors and placement only; it cannot alter the garment engine. If the draft includes logo elements, tell the customer they will upload their logo after opening the link.',
      inputSchema:{
        productId:productEnum,
        summary:z.string().min(1).max(280),
        zones:z.array(zoneSchema).min(1).max(6)
      },
      outputSchema:{
        url:z.string().url(),
        productId:z.string(),
        summary:z.string(),
        needsLogoUpload:z.boolean()
      },
      annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false,idempotentHint:true}
    },
    async(args)=>{
      const safe=sanitizePlan({version:'mqd-ai-plan-v1',...args},{fallbackProductId:args.productId});
      const needsLogoUpload=safe.zones.some(zone=>zone.elements.some(el=>el.kind==='logo'));
      const url=`https://mymerchnow.app/#ai-plan=${encodePlan(safe)}`;
      return{
        structuredContent:{url,productId:safe.productId,summary:safe.summary,needsLogoUpload},
        content:[{type:'text',text:needsLogoUpload
          ?'Draft link created. The customer should open it, upload their logo in the AI Designer panel, click Apply Draft, then review the 2D/3D garment before saving or purchasing.'
          :'Draft link created. The customer should open it and click Apply Draft, then review the 2D/3D garment before saving or purchasing.'}]
      };
    }
  );

  return server;
}

export default async function handler(req,res){
  if(req.method==='OPTIONS'){
    res.statusCode=204;
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Methods','POST, GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','content-type, mcp-session-id');
    res.setHeader('Access-Control-Expose-Headers','Mcp-Session-Id');
    return res.end();
  }
  if(!['POST','GET','DELETE'].includes(req.method||'')){
    res.statusCode=405;return res.end('Method not allowed');
  }
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Expose-Headers','Mcp-Session-Id');

  const server=createMyMerchNowServer();
  const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
  res.on('close',()=>{transport.close();server.close();});
  try{
    await server.connect(transport);
    await transport.handleRequest(req,res);
  }catch(error){
    console.error('MyMerchNow MCP error',error);
    if(!res.headersSent){res.statusCode=500;res.end('Internal server error');}
  }
}
