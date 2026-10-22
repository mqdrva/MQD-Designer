import {comparePurchasedOrders,sameOrderCustomer} from './mqd-order-comparison.js';

export async function ownerOrderComparison(supabase,orderId){
 const {data:order,error}=await supabase.from('mqd_orders').select('*').eq('id',orderId).maybeSingle();
 if(error)throw new Error('Could not load the purchased order snapshot.');
 if(!order)return {status:'unknown',label:'Review needed',guidance:'Order not found.'};
 const unknown=message=>({status:'unknown',label:'Review needed',changes:[],orderChanges:[],guidance:message});
 if(order.is_test===true||order.stripe_payment_status!=='paid'||!order.paid_at)return unknown('Comparison uses paid production orders only.');
 let history=supabase.from('mqd_orders').select('*').eq('is_test',false).eq('stripe_payment_status','paid').lt('paid_at',order.paid_at).neq('id',order.id);
 if(order.user_id)history=history.eq('user_id',order.user_id);
 else if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(order.customer_email||'')))history=history.eq('customer_email',order.customer_email);
 else return unknown('This order has no reliable customer account or email for comparison.');
 const {data:rows,error:historyError}=await history.order('paid_at',{ascending:false}).limit(8);
 if(historyError)return unknown('Previous paid orders could not be checked. Try again before reusing files.');
 const previous=(rows||[]).filter(row=>sameOrderCustomer(order,row));
 if(!previous.length)return {status:'new',label:'No previous paid order found',changes:[],orderChanges:[],guidance:'Prepare production files for this order. No files are automatically reused.'};
 if(!order.user_id&&new Set(previous.map(row=>row.user_id).filter(Boolean)).size>1)return unknown('More than one customer account uses this email. Review the orders separately.');
 const ids=[order.id,...previous.map(row=>row.id)];
 const [{data:assets,error:assetsError},{data:items,error:itemsError}]=await Promise.all([
  supabase.from('mqd_order_assets').select('order_id,zone_name,layer_id,layer_type,storage_path,metadata').in('order_id',ids).eq('layer_type','image'),
  supabase.from('mqd_order_items').select('order_id,quantity,order_options').in('order_id',ids)
 ]);
 if(assetsError||itemsError)return unknown('Saved production evidence could not be loaded. Review the order files.');
 const hashes=new Map();let downloaded=0;
 const evidence=async id=>{
  const output=[];
  for(const asset of (assets||[]).filter(a=>a.order_id===id&&a.zone_name!=='__mockup__')){
   let hash=null;const path=String(asset.storage_path||'');
   // Hash only the immutable order-specific production copy, never mutable customer drafts.
   if(path.startsWith(id+'/')&&!path.split('/').some(p=>p==='.'||p==='..')&&downloaded<112*1024*1024){
    if(hashes.has(path))hash=hashes.get(path);
    else try{
     const {data:blob,error}=await supabase.storage.from('mqd-production').download(path);
     if(error||!blob||blob.size>24*1024*1024)throw new Error('Artwork unavailable');
     downloaded+=blob.size;
     const bytes=await blob.arrayBuffer();hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
     hashes.set(path,hash);
    }catch{hashes.set(path,null);}
   }
   output.push({...asset,content_sha256:hash});
  }
  return output;
 };
 const currentAssets=await evidence(order.id),currentItems=(items||[]).filter(i=>i.order_id===order.id);let latest=null;
 for(const prior of previous){
  const result=comparePurchasedOrders(order,prior,currentAssets,await evidence(prior.id),currentItems,(items||[]).filter(i=>i.order_id===prior.id));
  if(!latest)latest=result;
  if(result.status==='same')return {...result,historyNote:'Checked up to 8 previous paid orders for this customer. No production files were automatically reused.'};
 }
 return {...latest,historyNote:'Compared with the latest paid order; no exact match was verified among up to 8 previous paid orders. No production files were automatically reused.'};
}
