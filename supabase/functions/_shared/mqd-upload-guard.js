export class UploadError extends Error {
  constructor(message, status = 413) { super(message); this.status = status; }
}

// Count actual streamed bytes, including requests without Content-Length.
export async function boundedFormData(req, maxBytes = 64 * 1024 * 1024) {
  if (Number(req.headers.get('content-length')) > maxBytes) throw new UploadError('Design upload is too large. Maximum total upload is 64 MB.');
  if (!req.body) throw new UploadError('Missing design upload.', 400);
  const reader = req.body.getReader();
  let total = 0;
  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) return controller.close();
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return controller.error(new UploadError('Design upload is too large. Maximum total upload is 64 MB.'));
      }
      controller.enqueue(value);
    },
    cancel(reason) { return reader.cancel(reason); }
  });
  return new Response(stream, { headers: { 'content-type': req.headers.get('content-type') || '' } }).formData();
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
