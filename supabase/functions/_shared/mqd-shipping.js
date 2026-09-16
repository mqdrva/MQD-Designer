export function quantityFromOrderItem(item) {
  const options = Array.isArray(item?.order_options) && item.order_options.length
    ? item.order_options
    : [{ quantity: item?.quantity }];
  return options.reduce((total, option) => {
    const quantity = Number(option?.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new Error("Each cart quantity must be between 1 and 99");
    }
    return total + quantity;
  }, 0);
}

export function shippingCentsForQuantity(quantity) {
  const total = Number(quantity);
  if (!Number.isSafeInteger(total) || total < 1) throw new Error("The cart quantity is invalid");
  if (total <= 9) return 1000;
  if (total <= 19) return 1500;
  return 2000;
}
