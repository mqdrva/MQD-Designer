// Layers use physical inches. Preview size never changes the production layout.
export const TEXT_FONTS = ['Inter','Montserrat','Oswald','Bebas Neue','Anton','Lobster','Pacifico','Permanent Marker'];
export function artworkLayers(art) {
  return art ? [...(art.file ? [{ id: 'image', kind: 'image', name: art.name, data: art }] : []), ...(art.texts || []).map(text => ({ id: text.id, kind: 'text', name: text.text, data: text }))] : [];
}
export function artworkBounds(art) {
  const boxes = artworkLayers(art).map(layer => layer.data.placement);
  if (!boxes.length) return null;
  const x = Math.min(...boxes.map(p => p.x)), y = Math.min(...boxes.map(p => p.y));
  return { x, y, width: Math.max(...boxes.map(p => p.x + p.width)) - x, height: Math.max(...boxes.map(p => p.y + p.height)) - y };
}
export function drawText(ctx, text, p) {
  const lines = text.text.split('\n'), font = `${text.italic ? 'italic ' : ''}${text.bold ? '700' : '400'} 100px "${text.font}", sans-serif`;
  ctx.save(); ctx.font = font;
  const stroke = Number(text.outline || 0), pad = 30 + stroke, lineHeight = 135;
  const width = Math.max(1, ...lines.map(line => ctx.measureText(line).width)) + pad * 2, height = lines.length * lineHeight + pad * 2;
  ctx.translate(p.x, p.y); ctx.scale(p.width / width, p.height / height);
  ctx.fillStyle = text.color; ctx.strokeStyle = text.outlineColor || '#ffffff'; ctx.lineWidth = stroke * 2; ctx.lineJoin = 'round'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = text.align || 'center';
  const x = text.align === 'left' ? pad : text.align === 'right' ? width - pad : width / 2;
  lines.forEach((line, i) => { const y = pad + 103 + i * lineHeight; if (stroke) ctx.strokeText(line, x, y); ctx.fillText(line, x, y); }); ctx.restore();
}
export async function loadTextFonts(art) {
  if (!document.fonts?.load) return;
  await Promise.all((art?.texts || []).map(text => document.fonts.load(`${text.italic ? 'italic ' : ''}${text.bold ? '700' : '400'} 100px "${text.font}"`)));
}
export async function printArtwork(art, view, { makeCanvas = () => document.createElement('canvas'), bitmap = createImageBitmap } = {}) {
  if (!art.texts?.length) return art.file;
  await loadTextFonts(art);
  const bounds = artworkBounds(art), canvas = makeCanvas(), dpi = 300;
  canvas.width = Math.ceil(bounds.width * dpi); canvas.height = Math.ceil(bounds.height * dpi);
  const ctx = canvas.getContext('2d');
  for (const layer of artworkLayers(art)) {
    const p = layer.data.placement, target = { x: (p.x - bounds.x) * dpi, y: (p.y - bounds.y) * dpi, width: p.width * dpi, height: p.height * dpi };
    if (layer.kind === 'image') ctx.drawImage(await bitmap(layer.data.file), target.x, target.y, target.width, target.height);
    else drawText(ctx, layer.data, target);
  }
  const file = await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(new File([blob], `${view}-print.png`, { type: 'image/png' })) : reject(new Error('Print file could not export.')), 'image/png'));
  canvas.width = canvas.height = 1; return file;
}
