import {validPhone} from './contract.js';
export function validateInterest(body,now=Date.now()){
 if(body.website||!Number.isFinite(body.startedAt)||now-body.startedAt<2000||now-body.startedAt>86400000)throw new Error('Please take a moment to review your details, then try again.');
 if(typeof body.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId))throw new Error('Refresh the page and try again.');
 const field=(key,max,required=true)=>{const value=body.contact?.[key];if(typeof value!=='string'||value.length>max||/[\u0000-\u001f\u007f]/.test(value)||required&&!value.trim())throw new Error('Enter a valid '+({name:'name',email:'email',shopName:'shop name',phone:'phone number'}[key])+'.');return value.trim();};
 const contact={name:field('name',100),email:field('email',254).toLowerCase(),shopName:field('shopName',100),phone:field('phone',40,false)};
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email))throw new Error('Enter a valid email.');
 if(contact.phone&&!validPhone(contact.phone))throw new Error('Enter a phone number with 7 to 15 digits, or leave it blank.');
 return contact;
}
export async function receiveInterest({body,req,db,hash,mail,ipSecret}){
 const contact=validateInterest(body);
 const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('cf-connecting-ip')||'unknown';
 const {data:rows,error}=await db.rpc('mqd_claim_print_shop_interest',{p_row:{id:body.requestId,contact_name:contact.name,contact_email:contact.email,shop_name:contact.shopName,phone:contact.phone,payload_hash:await hash(JSON.stringify(contact)),ip_hash:await hash(ipSecret+ip)}});
 if(error)throw new Error(error.message.includes('limit')?'Too many pilot requests. Try later or email mqdrva@gmail.com.':'Your request could not be saved. Retry the same details or email mqdrva@gmail.com.');
 const row=rows?.[0];if(!row)throw new Error('Your request could not be confirmed. Please try again.');
 const reference='PILOT-'+row.id.replaceAll('-','').slice(0,12).toUpperCase();let notificationAccepted=row.admin_email_sent===true;
 if(!notificationAccepted){
  try{
   await mail(db,{to:['mqdrva@gmail.com'],reply_to:row.contact_email,subject:'[Print Shops] Pilot request: '+row.shop_name,text:`${reference}\nName: ${row.contact_name}\nShop: ${row.shop_name}\nEmail: ${row.contact_email}\nPhone: ${row.phone||'Not provided'}\n\nThis is a short pilot inquiry, not a completed setup. Follow up with this business or direct them to https://mymerchnow.app/print-shop-setup.html?configure=1\nNo shop activated, no pilot started and no payment collected. The seven-day pilot begins only after full setup, email verification and approval.`},'shop-interest-admin-'+row.id);
   notificationAccepted=true;
   // Provider idempotency handles a retry if recording the notification fails.
   await db.from('mqd_print_shop_interest').update({admin_email_sent:true}).eq('id',row.id);
  }catch{ /* The durable lead is still saved; the response reports notification status. */ }
 }
 return {status:'received',reference,notificationAccepted};
}
