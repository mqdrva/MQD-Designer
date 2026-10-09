export class UploadError extends Error {
  constructor(message, status = 413) { super(message); this.status = status; }
}

// Count actual streamed bytes, including requests without Content-Length.
export async function boundedFormData(req, maxBytes = 64 * 1024 * 1024) {
  const declared = Number(req.headers.get('content-length') || 0);
  if (declared && declared > maxBytes) throw new UploadError('Design upload is too large. Maximum total upload is 64 MB.');
  if (!req.body) throw new UploadError('Missing design upload.', 400);

  const contentType = req.headers.get('content-type') || '';
  if (!/^multipart\/form-data;\s*boundary=/i.test(contentType)) {
    throw new UploadError('Invalid design upload format. Please refresh and try again.', 400);
  }

  // Buffer the multipart request while enforcing the hard size cap. Parsing a
  // re-streamed multipart body can intermittently fail in the Edge runtime on
  // Safari/iPhone uploads even when the original request is valid.
  const reader = req.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value?.byteLength) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new UploadError('Design upload is too large. Maximum total upload is 64 MB.');
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return await new Response(bytes, { headers: { 'content-type': contentType } }).formData();
  } catch (error) {
    console.error('Guest multipart parse failed', {
      contentType,
      declaredBytes: declared || null,
      receivedBytes: total,
      message: error instanceof Error ? error.message : String(error)
    });
    throw new UploadError('Could not read the design upload. Please try again.', 400);
  }
}

export function validateGuestFiles(form) {
  const files = form.getAll('asset');
  if (files.length > 64) throw new UploadError('A design can contain at most 64 artwork files.');
  if (form.getAll('assetMeta').length !== files.length) throw new UploadError('Artwork metadata is incomplete.', 400);
  const mockup = form.get('mockup');
  for (const file of [...files, ...(mockup ? [mockup] : [])]) {
    if (!(file instanceof File) || !file.size) throw new UploadError('Invalid artwork file.', 400);
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new UploadError('Use PNG, JPG, or WebP artwork.', 400);
    if (file.size > (file === mockup ? 12 : 20) * 1024 * 1024) throw new UploadError('Artwork file is too large.');
  }
  for (const meta of form.getAll('assetMeta')) {
    try { JSON.parse(String(meta)); } catch { throw new UploadError('Invalid artwork metadata.', 400); }
  }
  return files.reduce((sum, file) => sum + file.size, mockup?.size || 0);
}

export async function consumeBudget(supabase, key, requestLimit, bytes = 0, byteLimit = 10737418240) {
  const { data, error } = await supabase.rpc('mqd_consume_upload_budget', {
    p_key: key, p_request_limit: requestLimit, p_bytes: bytes, p_byte_limit: byteLimit
  });
  if (error || (data !== true && data !== false)) throw new UploadError('Upload limits are temporarily unavailable. Please try again later.', 503);
  if (!data) throw new UploadError('Upload limit reached. Please try again tomorrow.', 429);
}
