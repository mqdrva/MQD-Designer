// Header-only dimension validation: reject misleading upload metadata before storing it.
export function imageDimensions(bytes,mime){
 if(mime==='png'){
  if(bytes.length<24||bytes.toString('ascii',12,16)!=='IHDR')throw Error('Invalid PNG header');
  return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
 }
 if(mime==='jpeg'){
  let at=2;
  while(at+4<bytes.length){if(bytes[at++]!==255)throw Error('Invalid JPEG header');while(bytes[at]===255)at++;const marker=bytes[at++];if(marker===0xd9||marker===0xda)break;if(marker===0xd8||marker===1||(marker>=0xd0&&marker<=0xd7))continue;const length=bytes.readUInt16BE(at);if(length<2||at+length>bytes.length)break;if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){if(length<7)break;return {width:bytes.readUInt16BE(at+5),height:bytes.readUInt16BE(at+3)}}at+=length;
  }
  throw Error('JPEG dimensions could not be read');
 }
 if(mime==='webp'){
  for(let at=12;at+8<=bytes.length;){const type=bytes.toString('ascii',at,at+4),length=bytes.readUInt32LE(at+4),data=at+8;if(data+length>bytes.length)break;
   if(type==='VP8X'&&length>=10)return {width:1+bytes.readUIntLE(data+4,3),height:1+bytes.readUIntLE(data+7,3)};
   if(type==='VP8L'&&length>=5&&bytes[data]===0x2f){const bits=bytes.readUInt32LE(data+1);return {width:1+(bits&0x3fff),height:1+((bits>>>14)&0x3fff)}}
   if(type==='VP8 '&&length>=10&&bytes[data+3]===0x9d&&bytes[data+4]===1&&bytes[data+5]===0x2a)return {width:bytes.readUInt16LE(data+6)&0x3fff,height:bytes.readUInt16LE(data+8)&0x3fff};
   at=data+length+(length%2);
  }
  throw Error('WebP dimensions could not be read');
 }
 throw Error('Unsupported image');
}
