export function shippingCentsForQuantity(quantity){
  const total=Number(quantity);
  if(!Number.isSafeInteger(total)||total<1)throw new Error('The cart quantity is invalid');
  if(total<=9)return 1000;
  if(total<=19)return 1500;
  return 2000;
}
