export function validateDesignRequest(input = {}) {
  const clean = (key, max) => String(input[key] ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
  const result = { name: clean('name', 100), email: clean('email', 254).toLowerCase(), garment: clean('garment', 160), quantity: Number(input.quantity), brief: clean('brief', 2000), page: clean('page', 180), requestId: clean('requestId', 36) };
  if (!result.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new Error('Please enter your name and a valid email.');
  if (!result.garment || !Number.isSafeInteger(result.quantity) || result.quantity < 1 || result.quantity > 9999) throw new Error('Choose a garment and a quantity from 1 to 9999.');
  if (result.brief.length < 10) throw new Error('Please describe your design in at least 10 characters.');
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(result.requestId)) throw new Error('Please refresh and try again.');
  if (!/^\/[a-zA-Z0-9/_\-.]*$/.test(result.page)) result.page = '/';
  return result;
}
