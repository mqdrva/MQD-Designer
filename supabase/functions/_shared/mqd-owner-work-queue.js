const UI={submitted:'new',draft:'new',paid:'paid',production:'in-production',shipped:'shipped',completed:'completed',cancelled:'cancelled',canceled:'cancelled'};
export function classifyOwnerOrder(order){
 const payment=String(order.stripe_payment_status||'').toLowerCase(),status=String(order.status||'').toLowerCase();
 const confirmed=payment==='paid'||!!order.paid_at&&Number(order.amount_paid)>0;
 const hold=['refunded','partially_refunded','disputed','chargeback','canceled','cancelled'].includes(payment)||['refunded','disputed','cancelled','canceled'].includes(status)||confirmed&&!!payment&&payment!=='paid';
 const reason=hold?'Review payment or cancellation before production.':null;
 return {payment_confirmed:confirmed,payment_review_reason:reason,ui_status:order.is_test===true?(UI[status]||status):hold?'payment-review':!confirmed?'unpaid':['new','draft','submitted'].includes(status)?'paid':UI[status]||status};
}
export function ownerWorkQueue(orders,requested='all'){
 const filter=requested==='new'?'unpaid':requested;
 const all=orders.map(order=>({...order,...classifyOwnerOrder(order)}));
 const live=all.filter(o=>o.is_test!==true),paid=live.filter(o=>o.payment_confirmed),unpaid=live.filter(o=>!o.payment_confirmed),tests=all.filter(o=>o.is_test===true),review=live.filter(o=>o.payment_review_reason);
 const counts={all:paid.length,new:unpaid.length,unpaid:unpaid.length,paid:0,'in-production':0,shipped:0,completed:0,review:review.length,test:tests.length};
 for(const row of paid)if(['paid','in-production','shipped','completed'].includes(row.ui_status))counts[row.ui_status]++;
 const filtered=filter==='test'?tests:filter==='unpaid'?unpaid:filter==='review'?review:!filter||filter==='all'?paid:paid.filter(row=>row.ui_status===filter||row.status===filter);
 return{counts,filtered,view:filter};
}
