import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sectionPattern=/\/\/ @mapping-begin ([A-Za-z][A-Za-z0-9]*)\n([\s\S]*?)\n\/\/ @mapping-end \1/g;

function sections(source){
  const found=new Map();
  for(const match of source.matchAll(sectionPattern)){
    if(found.has(match[1]))throw new Error('Duplicate mapping section: '+match[1]);
    found.set(match[1],match[2]);
  }
  if(!found.size)throw new Error('Shared mapping sections are missing.');
  return found;
}

export function syncGarmentMapping(root=projectRoot,{check=false}={}){
  const canonical=fs.readFileSync(path.join(root,'v20/garment-mapping-source.js'),'utf8');
  const shared=sections(canonical),outputs=new Map();
  // Include imported mapping helpers and template images in the version, so
  // helper-only fixes also invalidate the two entry points together.
  const inputs=new Map(),visit=relative=>{
    if(inputs.has(relative))return;
    const bytes=fs.readFileSync(path.join(root,relative));inputs.set(relative,bytes);
    if(!relative.endsWith('.js'))return;
    for(const match of bytes.toString().matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){
      const dependency=path.posix.normalize(path.posix.join(path.posix.dirname(relative),match[1].split('?')[0]));
      visit(dependency);
    }
  };
  visit('v20/garment-mapping-source.js');visit('v20/garment-mapping-catalog.js');
  for(const file of ['assets/calibration/tshirt-surface-uv.bin','assets/calibration/tshirt-surface-uv.json'])visit(file);
  for(const match of fs.readFileSync(path.join(root,'v20/garment-mapping-catalog.js'),'utf8').matchAll(/"path": "\/([^"\n]+)"/g))visit(match[1]);
  const hash=crypto.createHash('sha256');
  for(const [file,bytes] of [...inputs].sort(([a],[b])=>a.localeCompare(b)))hash.update(file+'\0').update(bytes);
  const version='mapping-'+hash.digest('hex').slice(0,16);

  for(const file of ['v20/editor.js','v20/shop-editor.js']){
    const source=fs.readFileSync(path.join(root,file),'utf8'),host=sections(source);
    if(host.size!==shared.size||[...shared.keys()].some(name=>!host.has(name)))throw new Error(file+' does not contain every shared mapping section.');
    if(!source.includes("import {applyGarmentMappings} from './garment-mapping-catalog.js';")||!source.includes('applyGarmentMappings(seed);')||!source.includes('applyGarmentMappings(catalog);'))throw new Error(file+' must use the shared garment catalog.');
    outputs.set(file,source.replace(sectionPattern,(_all,name)=>`// @mapping-begin ${name}\n${shared.get(name)}\n// @mapping-end ${name}`));
  }
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const shop=fs.readFileSync(path.join(root,'shop-3d.html'),'utf8');
  const loader=fs.readFileSync(path.join(root,'v20/print-shop.js'),'utf8');
  if(!/v20\/editor\.js(?:\?[^"']*)?["']/.test(index)||!/v20\/print-shop\.js(?:\?[^"']*)?["']/.test(shop)||!/'\.\/shop-editor\.js(?:\?[^']*)?'/.test(loader))throw new Error('Designer entry points are missing.');
  outputs.set('index.html',index.replace(/(v20\/editor\.js)(?:\?[^"']*)?(?=["'])/g,'$1?v='+version));
  outputs.set('shop-3d.html',shop.replace(/(v20\/print-shop\.js)(?:\?[^"']*)?(?=["'])/g,'$1?v='+version));
  outputs.set('v20/print-shop.js',loader.replace(/'\.\/shop-editor\.js(?:\?[^']*)?'/g,"'./shop-editor.js?v="+version+"'"));
  const changed=[...outputs].filter(([file,text])=>fs.readFileSync(path.join(root,file),'utf8')!==text);
  if(check&&changed.length)throw new Error('Generated mapping is stale: '+changed.map(([file])=>file).join(', ')+'. Run npm run build:mappings.');
  if(!check)for(const [file,text]of changed)fs.writeFileSync(path.join(root,file),text);
  return {version,sections:shared.size,changed:changed.map(([file])=>file)};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  console.log(JSON.stringify(syncGarmentMapping(projectRoot,{check:process.argv.includes('--check')})));
}
