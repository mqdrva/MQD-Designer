// Small dependency-free ZIP writer using the standard STORE method. Originals
// remain byte-for-byte intact. UTF-8 names and standard CRCs support common unzip tools.
const encoder = new TextEncoder();
const table = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(bytes) { let crc = 0xffffffff; for (const byte of bytes) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }
function header(length) { const bytes = new Uint8Array(length); return { bytes, view: new DataView(bytes.buffer) }; }
export async function makeZip(entries) {
  if (entries.length > 65535) throw new Error('Too many files for this ZIP.');
  const parts = [], central = [], names = new Set(); let offset = 0, centralLength = 0;
  for (const entry of entries) {
    if (!entry.name || entry.name.includes('..') || entry.name.startsWith('/') || entry.name.includes('\\') || names.has(entry.name)) throw new Error('Invalid or duplicate ZIP filename.');
    names.add(entry.name);
    const name = encoder.encode(entry.name), data = entry.data instanceof Blob ? new Uint8Array(await entry.data.arrayBuffer()) : typeof entry.data === 'string' ? encoder.encode(entry.data) : entry.data;
    if (!(data instanceof Uint8Array) || name.length > 65535 || offset + data.length > 512 * 1024 * 1024) throw new Error('ZIP exceeds supported size or contains invalid data.');
    const crc = crc32(data), local = header(30), directory = header(46);
    local.view.setUint32(0, 0x04034b50, true); local.view.setUint16(4, 20, true); local.view.setUint16(6, 0x800, true); local.view.setUint16(12, 0x21, true);
    local.view.setUint32(14, crc, true); local.view.setUint32(18, data.length, true); local.view.setUint32(22, data.length, true); local.view.setUint16(26, name.length, true);
    directory.view.setUint32(0, 0x02014b50, true); directory.view.setUint16(4, 20, true); directory.view.setUint16(6, 20, true); directory.view.setUint16(8, 0x800, true); directory.view.setUint16(14, 0x21, true);
    directory.view.setUint32(16, crc, true); directory.view.setUint32(20, data.length, true); directory.view.setUint32(24, data.length, true); directory.view.setUint16(28, name.length, true); directory.view.setUint32(42, offset, true);
    parts.push(local.bytes, name, data); central.push(directory.bytes, name);
    offset += local.bytes.length + name.length + data.length; centralLength += directory.bytes.length + name.length;
  }
  const end = header(22); end.view.setUint32(0, 0x06054b50, true); end.view.setUint16(8, entries.length, true); end.view.setUint16(10, entries.length, true); end.view.setUint32(12, centralLength, true); end.view.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.bytes], { type: 'application/zip' });
}
export function safeArtworkName(name) { return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '_').slice(0, 120) || 'artwork'; }
