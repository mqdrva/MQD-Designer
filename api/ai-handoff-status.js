import {handoffEnabled} from './mcp.js';
export default function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify({enabled:handoffEnabled(),privatePreview:process.env.VERCEL_ENV==='preview',publicEnabled:process.env.MQD_AI_PUBLIC_ENABLED==='1'&&handoffEnabled()}));
}
