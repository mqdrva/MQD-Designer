// Decode incrementally: keeping every byte chunk and a second contiguous byte
// buffer alongside the decoded JSON can exhaust the worker on full-size masters.
export async function boundedJson(req,max){
 const reader=req.body?.getReader();if(!reader)throw Error('Request body required.');
 const declared=Number(req.headers.get('content-length'));
 if(Number.isFinite(declared)&&declared>max){await reader.cancel();throw Error('Request is too large.');}
 const decoder=new TextDecoder('utf-8',{fatal:true});let pieces=[],byteLength=0;
 try{while(true){const part=await reader.read();if(part.done)break;byteLength+=part.value.byteLength;if(byteLength>max){await reader.cancel();throw Error('Request is too large.');}pieces.push(decoder.decode(part.value,{stream:true}));}
  pieces.push(decoder.decode());let text=pieces.join('');pieces=null;const value=JSON.parse(text);text=null;return{value,byteLength};
 }finally{reader.releaseLock();}
}
