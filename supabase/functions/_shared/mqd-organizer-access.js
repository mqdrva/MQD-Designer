// Organizer billing is an explicit owner grant, never implied by contact details.
export const OWNER_TEAM_POLICY='2026-10-25-owner';
export const OWNER_TEAM_REWARD_QUANTITY=5;
export const ORGANIZER_ACTIONS=new Set(['owner-status','subscribe','portal','pause','resume']);
export function organizerSettings(raw={},email=''){
 const enabled=raw.enabled===true;
 const quantity=raw.rewardQuantity??OWNER_TEAM_REWARD_QUANTITY;
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>500)throw new Error('Choose a reward target from 1 to 500 paid garments.');
 if(enabled&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Add the organizer email before enabling billing access.');
 return {enabled,rewardQuantity:quantity};
}
export function organizerIdentityAllowed(business,account,user){
 if(business?.status==='closed'||account?.status==='closed'||business?.shop_config?.ownerManaged!==true)return false;
 if(!user?.id||user.is_anonymous||!user.email_confirmed_at||!user.email)return false;
 if(account?.organizer_user_id)return user.id===account.organizer_user_id&&(!!account.stripe_subscription_id||business.shop_config.organizerAccess?.enabled===true);
 if(business.shop_config.organizerAccess?.enabled!==true)return false;
 return user.email.toLowerCase()===business.owner_email?.toLowerCase();
}
export function organizerRewardTarget(account,business){
 return account?.reward_quantity??organizerSettings(business?.shop_config?.organizerAccess,business?.owner_email).rewardQuantity;
}
