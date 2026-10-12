export function hasShopAccess(shop,account,now=Date.now()){
 if(!shop?.approved_at||!shop?.email_verified_at)return false;
 if(shop.status==='pilot_active')return Number.isFinite(Date.parse(shop.pilot_expires_at))&&Date.parse(shop.pilot_expires_at)>now;
 return shop.status==='active'&&shop.billing_status==='active'&&account?.status==='active'&&Number.isFinite(Date.parse(account.period_end))&&Date.parse(account.period_end)>now;
}
