// Per-style color and size ranges verified against the supplied product pages on October 10, 2026.
export const SIZES = Object.freeze(['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL']);
export const COLORS = ['White', 'Black', 'Navy', 'Royal', 'Red', 'Sport Grey', 'Charcoal', 'Forest Green', 'Purple', 'Gold'];
const core = ['White', 'Black', 'Navy', 'Royal', 'Red', 'Sport Grey'];
export const PRODUCT_OPTIONS = Object.freeze({
  'everyday-tshirt': { colors: COLORS, sizes: SIZES, description: 'Soft, lightweight 4.45 oz cotton tee with a modern classic fit, ribbed crew neck and taped shoulders. Sport Grey is a cotton blend.' },
  'everyday-long-sleeve': { colors: COLORS, sizes: SIZES.slice(1, 8), description: 'Comfortable cotton long-sleeve shirt with a classic fit and ribbed cuffs. Great for everyday wear and custom prints.' },
  'everyday-hoodie': { colors: COLORS.map(color => color === 'Forest Green' ? 'Forest' : color), sizes: SIZES.slice(0, 9), description: 'Cozy 8 oz cotton-blend hoodie with a classic fit, double-lined drawcord hood, ribbed cuffs and a roomy pouch pocket.' },
  'everyday-polo': { colors: [...COLORS.slice(0, 8), 'Light Blue', 'Sand'], sizes: SIZES.slice(1, 8), description: 'Breathable 5.2 oz ring-spun cotton pique polo with a modern classic fit, ribbed collar and matching buttons. Sport Grey is a cotton blend.' },
});
export const colorsForProduct = product => [...(PRODUCT_OPTIONS[product]?.colors || [])];
export function sizesForProduct(product, color) {
  const options = PRODUCT_OPTIONS[product];
  if (!options || !options.colors.includes(color)) return [];
  if (product === 'everyday-tshirt' && ['Forest Green', 'Purple', 'Gold'].includes(color)) return options.sizes.filter(size => size !== '6XL');
  if (product === 'everyday-hoodie' && !core.includes(color)) return options.sizes.filter(size => size !== 'XS');
  return [...options.sizes];
}
export const isExtendedSize = size => ['2XL', '3XL', '4XL', '5XL', '6XL'].includes(size);
