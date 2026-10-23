import {validateSetup} from '../mqd-print-shop-setup/validation.js';
import {canonicalTeamShop} from '../mqd-team-service/runtime.js';
export function ownerWorkspace(packet,kind,mode='flexible'){
 if(!['team','brand'].includes(kind)||!['flexible','strict'].includes(mode))throw new Error('Choose Team or Brand pilot and a supported editing mode.');
 // Teams use server-owned prices. Supply validation rates, never accept client prices for checkout.
 const input=structuredClone(packet);
 input.shop.organizationType='team';input.plan='3d';
 input.shop.printMethods={transfer:'Standard transfer'};
 input.shop.pricing.printRules={'2d':{transfer:{mode:'calculated',minimumQuantity:1,setupCents:0,tiers:[{fromQuantity:1,frontCents:0,backCents:0,sleevesCents:0}]}}};
 const saved=validateSetup(input),shop=canonicalTeamShop(saved.shop);
 if(mode==='strict'&&(shop.engines.length!==1||shop.engines[0]!=='3d'||Object.keys(shop.garments).length!==1))throw new Error('A strict master supports one 3D garment. Choose flexible fixed-logo mode for several garments.');
 if(mode==='flexible'&&Object.values(shop.garments).some(g=>g.logoPreset?.mode!=='fixed'))throw new Error('Choose a fixed logo for each garment. Members may add artwork and backgrounds around that protected logo.');
 const note=packet.owner?.designRequest||'';if(typeof note!=='string'||note.length>1500)throw new Error('Keep private design requests under 1,500 characters.');
 const reference=packet.owner?.referenceUrl||'';if(reference){let url;try{url=new URL(reference);}catch{throw new Error('Enter a valid reference URL.');}if(url.protocol!=='https:'||reference.length>2000)throw new Error('Use an HTTPS reference URL under 2,000 characters.');}
 shop.ownerManaged=true;shop.pilotKind=kind;shop.editingMode=mode;
 shop.ownerRequest={designRequest:note,referenceUrl:reference};
 return {contact:saved.owner,shop};
}
export function publicTeamShop(shop){
 const allowed=['name','slug','logo','garmentLogo','tagline','requirements','garments','engines','pricing','printMethods','printMethods3d','productNames','organizationType','fulfillmentMode','pilot','teamEnvironment'];
 return Object.fromEntries(allowed.filter(key=>Object.hasOwn(shop,key)).map(key=>[key,structuredClone(shop[key])]));
}
