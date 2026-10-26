// Count incoming bytes without retaining chunks and concatenating another full
// copy before the native multipart parser. The existing 51 MiB envelope remains.
export async function boundedMultipart(req,max){
 if(!req.body)throw new Error('Request body required');
 const declared=req.headers.get('content-length');
 if(declared&&Number(declared)>max)throw new Error('Request is too large.');
 let size=0;
 const stream=req.body.pipeThrough(new TransformStream({transform(chunk,controller){size+=chunk.byteLength;if(size>max)throw new Error('Request is too large.');controller.enqueue(chunk);}}));
 return new Response(stream,{headers:{'Content-Type':req.headers.get('content-type')||''}}).formData();
}
