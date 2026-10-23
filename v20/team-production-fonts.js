// Archive the exact web-font files declared by the existing designer, including
// unicode subsets. Production PNGs remain the final rendered reference.
export async function teamProductionFonts(layers){
 const families=[...new Set(layers.filter(l=>l.type==='text').map(l=>l.font||'Inter'))];if(!families.length)return[];
 const entries=[],faces=[],seen=new Map();
 const links=[...document.querySelectorAll('link[rel="stylesheet"]')].map(l=>l.href).filter(url=>new URL(url).hostname==='fonts.googleapis.com');
 for(const url of links){
  const response=await fetch(url);if(!response.ok)throw new Error('Font source unavailable. Keep your artwork and retry before checkout.');
  const css=await response.text();
  for(const block of css.match(/@font-face\s*\{[^}]+\}/g)||[]){
   const family=block.match(/font-family:\s*['"]?([^;'"}]+)/)?.[1]?.trim();if(!families.includes(family))continue;
   let local=block;
   for(const match of block.matchAll(/url\(([^)]+)\)/g)){
    const source=match[1].replace(/['"]/g,'');if(new URL(source).hostname!=='fonts.gstatic.com')throw new Error('Unapproved font source.');
    let path=seen.get(source);if(!path){const r=await fetch(source);if(!r.ok)throw new Error('Font download failed for '+family);const data=await r.blob();if(data.size>5*1024*1024)throw new Error('Font source is too large.');path='font-'+seen.size+'.woff2';seen.set(source,path);entries.push({name:'fonts/'+path,data});}
    local=local.replace(match[0],'url('+path+')');
   }
   faces.push({family,css:local});
  }
 }
 for(const family of families){if(!faces.some(f=>f.family===family))throw new Error('The font '+family+' cannot be included for reproduction. Choose an available web font before ordering.');
  await document.fonts.load('32px "'+family+'"');if(!document.fonts.check('32px "'+family+'"'))throw new Error('Font not loaded: '+family);
 }
 entries.push({name:'fonts/fonts.css',data:faces.map(f=>f.css).join('\n')});
 entries.push({name:'fonts/README.txt',data:'Exact font resources from the designer stylesheet. Load fonts.css to reproduce editable text. Font files retain their original license; obtain applicable license terms from the font publisher. Final production-zone PNGs preserve the purchased rendered output. Browser synthesized bold/italic may differ in other renderers; use the supplied PNGs for exact reproduction.'});return entries;
}
