import { crc32 } from './everyday-zip.js';

const DPI = 300;
const inch = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });

export function transferProductionSheets(layout) {
  const names = new Map((layout.sources || []).map(source => [source.source, source.originalFilename || source.filename]));
  return layout.sheets.map((sheet, index) => {
    const name = 'sheet-' + (index + 1);
    return {
      name,
      number: index + 1,
      graphics: sheet.layers.map((layer, layerIndex) => ({
        layer,
        originalName: names.get(layer.source) || 'Artwork ' + layer.source,
        number: layerIndex + 1,
        printFile: 'print/individual/' + name + '/graphic-' + (layerIndex + 1) + '.png'
      }))
    };
  });
}

export function renderTransferMeasurements(section, layout) {
  const host = section.querySelector('#transferMeasurementSheets');
  section.hidden = !layout?.sheets?.length;
  host.replaceChildren();
  if (section.hidden) return;
  const markup = (tag, text) => {
    const el = document.createElement(tag);
    el.textContent = text;
    return el;
  };
  for (const sheet of transferProductionSheets(layout)) {
    const heading = markup('h4', 'Sheet ' + sheet.number + ' · ' + layout.inches + ' × ' + layout.inches + ' in');
    const table = document.createElement('table');
    const header = table.createTHead().insertRow();
    for (const label of ['Graphic', 'Print size (in)', 'Left / Top (in)']) {
      const col = markup('th', label);
      col.scope = 'col';
      header.append(col);
    }
    const body = table.createTBody();
    for (const { number, layer, originalName } of sheet.graphics) {
      const row = body.insertRow();
      row.append(
        markup('td', number + '. ' + originalName),
        markup('td', inch.format(layer.width) + ' × ' + inch.format(layer.height)),
        markup('td', inch.format(layer.x) + ' / ' + inch.format(layer.y))
      );
    }
    host.append(heading, table);
  }
}

export function transferMeasurementsCsv(layout) {
  const rows = [['Sheet','Graphic','Original filename','Width (in)','Height (in)','Left (in)','Top (in)','Individual print PNG','Full sheet PNG']];
  for (const sheet of transferProductionSheets(layout)) {
    for (const { number, originalName, layer, printFile } of sheet.graphics) {
      // Uploaded filenames are data even when a spreadsheet opens the CSV.
      const filename = /^[\s\u0000-\u001f]*[=+@-]|^[\t\r\n]/.test(originalName) ? "'" + originalName : originalName;
      rows.push([sheet.number,number,filename,layer.width,layer.height,layer.x,layer.y,printFile,'print/' + sheet.name + '.png']);
    }
  }
  return rows.map(row => row.map(cell => '"' + String(cell).replaceAll('"', '""') + '"').join(',')).join('\r\n') + '\r\n';
}

// Canvas PNGs can default to screen density. Write the intended print density
// before the image data, replacing any density already supplied by the browser.
export function transferPngAtPrintDensity(bytes) {
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  const pixelsPerMeter = Math.round(DPI / .0254);
  view.setUint32(0, 9);
  chunk.set([112,72,89,115], 4); // pHYs
  view.setUint32(8, pixelsPerMeter);
  view.setUint32(12, pixelsPerMeter);
  chunk[16] = 1;
  view.setUint32(17, crc32(chunk.subarray(4,17)));

  const parts = [bytes.subarray(0,33), chunk]; // PNG signature and IHDR
  for (let start = 33; start < bytes.length;) {
    const end = start + 12 + data.getUint32(start);
    if (data.getUint32(start + 4) !== 0x70485973) parts.push(bytes.subarray(start,end));
    start = end;
  }
  return new Blob(parts, { type: 'image/png' });
}

async function printPng(canvas, name) {
  const blob = await new Promise((resolve,reject) => canvas.toBlob(
    result => result ? resolve(result) : reject(new Error('Unable to render ' + name + '.')), 'image/png'
  ));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return transferPngAtPrintDensity(bytes).arrayBuffer();
}

export async function transferProductionZip(detail, fetchBlob) {
  const layout = detail.order.design_json.transfers;
  const zip = new window.JSZip();
  const root = zip.folder(detail.order.order_number + '-transfers');
  root.file('layout.json', JSON.stringify(layout, null, 2));
  root.file('graphic-measurements.csv', transferMeasurementsCsv(layout));
  root.file('print-instructions.txt', [
    layout.inches + ' × ' + layout.inches + ' inches per full sheet at ' + DPI + ' pixels/inch.',
    'Print at actual size. Each numbered full-sheet PNG is a separate sheet.',
    'Individual PNGs show each placed artwork after crop, sized to the nearest pixel. Use graphic-measurements.csv for the exact dimensions in inches.',
    'Left and top coordinates are measured from the top-left of each sheet. The layout records stacking from bottom to top.',
    'Originals retain the uploaded resolution. Review the source resolution and printer-specific mirroring before pressing.'
  ].join('\n') + '\n');
  const graphicCanvas = document.createElement('canvas');
  for (const sheet of transferProductionSheets(layout)) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = layout.inches * DPI;
    const context = canvas.getContext('2d');
    for (const { layer, printFile } of sheet.graphics) {
      const asset = detail.assets.find(asset => asset.zone_name === sheet.name && asset.layer_id === String(layer.source));
      if (!asset?.download_url) throw new Error('Missing original artwork for ' + sheet.name + '.');
      const blob = await fetchBlob(asset.download_url);
      root.file('originals/' + sheet.name + '/' + asset.original_filename, await blob.arrayBuffer());
      const url = URL.createObjectURL(blob);
      const image = new Image();
      try {
        image.src = url;
        await image.decode();
        const { left,top,right,bottom } = layer.crop || { left:0,top:0,right:0,bottom:0 };
        const source = [
          left * image.naturalWidth, top * image.naturalHeight,
          (1-left-right) * image.naturalWidth, (1-top-bottom) * image.naturalHeight
        ];
        context.drawImage(image, ...source, layer.x * DPI, layer.y * DPI, layer.width * DPI, layer.height * DPI);
        graphicCanvas.width = Math.max(1, Math.round(layer.width * DPI));
        graphicCanvas.height = Math.max(1, Math.round(layer.height * DPI));
        graphicCanvas.getContext('2d').drawImage(image, ...source, 0, 0, graphicCanvas.width, graphicCanvas.height);
        root.file(printFile, await printPng(graphicCanvas,printFile));
      } finally {
        URL.revokeObjectURL(url);
        graphicCanvas.width = graphicCanvas.height = 1;
      }
    }
    root.file('print/' + sheet.name + '.png', await printPng(canvas,sheet.name));
    canvas.width = canvas.height = 1;
  }
  return zip.generateAsync({type:'blob'});
}
