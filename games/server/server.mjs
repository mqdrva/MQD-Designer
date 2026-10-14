import http from 'node:http';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,randomInt,timingSafeEqual} from 'node:crypto';
import * as E from './engine.mjs';
import {localFaceCutout} from './face-cutout.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function startServer({port=8770,statePath=resolve(root,'.runtime/state.json'),ownerToken=randomBytes(32).toString('base64url'),persist=true,rulesApproved=false,faceProcessor=localFaceCutout,lanHost=null,lanAccessCode=String(randomInt(10000000,100000000)),lanLifetimeMs=8*60*60*1000}={}){
 let state=E.initialState();if(persist){try{state=JSON.parse(await readFile(statePath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}}
 state.rulesApproved=rulesApproved;let queue=Promise.resolve();
 const save=async()=>{if(!persist)return;await mkdir(dirname(statePath),{recursive:true,mode:0o700});await writeFile(statePath+'.tmp',JSON.stringify(state),{mode:0o600});await rename(statePath+'.tmp',statePath);};
 const serial=fn=>{const p=queue.then(async()=>{const old=structuredClone(state);try{const result=await fn();await save();return result}catch(e){state=old;throw e}});queue=p.catch(()=>{});return p};
 const safeEqual=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
 if(lanHost&&!/^(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/.test(lanHost))throw new Error('Use a private Wi-Fi address for phone testing');
 const lanCookie=randomBytes(32).toString('base64url'),lanExpires=Date.now()+lanLifetimeMs,gateAttempts=new Map();
 const gateHtml='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shirt Games · Private phone test</title><link rel="stylesheet" href="/styles.css"><main><section class="panel narrow"><span class="badge">Private Wi-Fi test</span><h1>Shirt Games</h1><p>Enter the temporary access code shown in your chat. Your Mac must stay awake and connected to the same Wi-Fi.</p><form id="accessForm"><label>Test access code<input id="accessCode" inputmode="numeric" autocomplete="off" pattern="[0-9]{8}" maxlength="8" required></label><button class="primary">Open the games</button></form><p id="accessStatus" role="status"></p><p class="muted">This is a temporary local test. Checkout is disabled.</p></section></main><script src="/lan-access.js" defer></script></html>';
 const rates=new Map();
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  try{
   const host=req.headers.host||'';const actualPort=req.socket.localPort;const lanRequest=!!lanHost&&(req.socket.localAddress===lanHost||host===`${lanHost}:${actualPort}`);if(host!==`127.0.0.1:${actualPort}`&&host!==`localhost:${actualPort}`&&(!lanHost||host!==`${lanHost}:${actualPort}`))throw new E.GameError('Local test host only',403);
   const origin=req.headers.origin;if(origin&&origin!==`http://${host}`)throw new E.GameError('Origin not allowed',403);
   const url=new URL(req.url,`http://${host}`);
   if(lanRequest){
    if(Date.now()>lanExpires)throw new E.GameError('This phone test expired. Ask the owner to restart it.',403);
    if(['/api/owner','/owner.html','/owner.js'].includes(url.pathname))throw new E.GameError('Owner test tools are available on the Mac only',403);
    if(url.pathname==='/api/lan-access'){
     if(req.method!=='POST')throw new E.GameError('POST required',405);
     const ip=req.socket.remoteAddress,now=Date.now();let attempts=gateAttempts.get(ip);if(!attempts||now-attempts.start>300000){attempts={start:now,count:0};gateAttempts.set(ip,attempts)}
     if(attempts.count>=5)throw new E.GameError('Please wait five minutes before trying another code.',429);
     const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>512)throw new E.GameError('Invalid access code');chunks.push(chunk)}
     let code='';try{code=String(JSON.parse(Buffer.concat(chunks).toString()).code||'')}catch{}
     if(!safeEqual(code,lanAccessCode)){attempts.count++;throw new E.GameError('That access code does not match.',401)}
     const maxAge=Math.max(0,Math.floor((lanExpires-now)/1000));res.setHeader('Set-Cookie',`mqd_phone_test=${lanCookie}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}`);send({ok:true});return;
    }
    const cookies=String(req.headers.cookie||'').split(';').map(c=>c.trim());const access=cookies.find(c=>c.startsWith('mqd_phone_test='))?.slice('mqd_phone_test='.length)||'';
    if(!safeEqual(access,lanCookie)&&!['/styles.css','/lan-access.js'].includes(url.pathname)){
     if(req.method==='GET'&&!url.pathname.startsWith('/api/')){res.writeHead(200,{'Content-Type':'text/html'});res.end(gateHtml);return}
     throw new E.GameError('Enter the private phone test access code first.',401);
    }
   }
   if(url.pathname.startsWith('/api/')){
    if(req.method!=='POST')throw new E.GameError('POST required',405);
    const ip=req.socket.remoteAddress,now=Date.now(),bucket=rates.get(ip);if(!bucket||now-bucket.start>60000)rates.set(ip,{start:now,count:0});if(++rates.get(ip).count>300)throw new E.GameError('Please wait before trying again',429);
    const chunks=[];let length=0;for await(const c of req){length+=c.length;if(length>12*1024*1024)throw new E.GameError('Request is too large',413);chunks.push(c)}
    let body;try{body=JSON.parse(Buffer.concat(chunks).toString()||'{}')}catch{throw new E.GameError('Invalid request')}
    const bearer=String(req.headers.authorization||'').replace(/^Bearer /,'');
    const result=await serial(async()=>{
     if(url.pathname==='/api/catalog')return {menu:state.menu.filter(x=>x.visible).sort((a,b)=>a.rank-b.rank).map(x=>({...x,title:E.TITLES[x.id],available:x.id!=='picked'||state.rulesApproved})),colors:E.COLORS,sayings:E.SAYINGS,localTest:true,phoneTest:lanRequest,phoneBaseUrl:lanHost?`http://${lanHost}:${actualPort}`:null};
     if(url.pathname==='/api/create'){if(Object.keys(state.games).length>=100)throw new E.GameError('Local test limit reached',429);return E.createGame(state,body)}
     if(url.pathname==='/api/owner'){
      if(!safeEqual(bearer,ownerToken))throw new E.GameError('Owner test access required',403);
      if(body.action==='menu'){E.updateMenu(state,body.items);return {menu:state.menu}}
      if(body.action==='orders')return {orders:E.ownerOrders(state),menu:state.menu,mode:'local-test',manufacturingEnabled:false};
      if(body.action==='status'){
       const order=state.orders[body.orderId];if(!order||order.paymentStatus!=='paid')throw new E.GameError('Paid game order required',409);
       const next={new:'in-production','in-production':'completed'}[order.status];if(body.status!==next)throw new E.GameError('Invalid production status transition',409);
       order.status=next;order.updatedAt=new Date().toISOString();return {order:E.publicOrder(order)};
      }
      if(body.action==='package')throw new E.GameError('Manufacturing export is locked until payment integration and production templates are verified',409);
      throw new E.GameError('Unknown owner action');
     }
     const game=state.games[body.id];if(!game)throw new E.GameError('Game not found',404);
     if(url.pathname==='/api/face-cutout'){const seat=E.participant(game,bearer);if(game.type!=='faces'||game.status!=='collecting'||seat.submission)throw new E.GameError('Cutouts are available for your unsubmitted Crazy Faces photo',409);return faceProcessor(E.photo({...body.photo,consent:true,cropApproved:true}));}
     if(url.pathname==='/api/face-reveal')return E.prepareFaceReveal(game,bearer,faceProcessor);
     if(url.pathname==='/api/claim')return E.claimGame(game,body);
     if(url.pathname==='/api/state')return E.viewGame(game,bearer);
     if(url.pathname==='/api/submit')return E.submit(game,bearer,body);
     if(url.pathname==='/api/change')return E.changeGame(game,bearer,body.action,body);
     if(url.pathname==='/api/order-draft')return E.orderDraft(state,game,bearer,body);
     throw new E.GameError('Route not found',404);
    });send(result);return;
   }
   if(req.method!=='GET'&&req.method!=='HEAD')throw new E.GameError('Method not allowed',405);
   const pathname=url.pathname==='/'?'/index.html':url.pathname;
   if(!/^\/(index\.html|owner\.html|app\.js|owner\.js|lan-access\.js|render\.js|crop\.js|styles\.css|brand-logo\.png|concept-board\.png|models\/(tshirt|hoodie|long-sleeve)-(front|back)\.png)$/.test(pathname))throw new E.GameError('Not found',404);
   const data=await readFile(resolve(root,'public','.'+pathname));const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};res.writeHead(200,{'Content-Type':types[extname(pathname)]});res.end(req.method==='HEAD'?undefined:data);
  }catch(error){if(res.headersSent){res.end();return}send({error:error instanceof E.GameError?error.message:'Local service could not complete the request'},error.status||500);}
 });
 await new Promise((ok,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',ok)});
 let lanServer=null;if(lanHost){lanServer=http.createServer(server.listeners('request')[0]);try{await new Promise((ok,no)=>{lanServer.once('error',no);lanServer.listen(server.address().port,lanHost,ok)})}catch(error){await new Promise(ok=>server.close(ok));throw error}}
 return {server,lanServer,port:server.address().port,ownerToken,lanAccessCode,lanExpires,getState:()=>state};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const running=await startServer({port:Number(process.env.MQD_GAMES_PORT||8770),rulesApproved:process.env.MQD_GAMES_PICKED_RULES_APPROVED==='1',lanHost:process.env.MQD_GAMES_LAN_HOST||null});
 await mkdir(resolve(root,'.runtime'),{recursive:true,mode:0o700});await writeFile(resolve(root,'.runtime/owner-access.txt'),`http://127.0.0.1:${running.port}/owner.html#${running.ownerToken}`,{mode:0o600});
 if(process.env.MQD_GAMES_LAN_HOST){await writeFile(resolve(root,'.runtime/phone-access.json'),JSON.stringify({url:`http://${process.env.MQD_GAMES_LAN_HOST}:${running.port}/`,code:running.lanAccessCode,expiresAt:new Date(running.lanExpires).toISOString()}),{mode:0o600});console.log('Private Wi-Fi testing is enabled for eight hours. Phone link and code saved in the private local runtime directory.')}
 console.log(`Shirt Games isolated test: http://127.0.0.1:${running.port}/\nOwner test access is saved in the private local runtime directory. Checkout is disabled.`);
}
