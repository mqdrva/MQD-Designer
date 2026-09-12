import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const editorPath=path.join(root,'v20/editor.js');
const editor=fs.readFileSync(editorPath,'utf8');
const expectedCatalog=JSON.parse(fs.readFileSync(path.join(root,'tests/frozen-products.json'),'utf8'));
const manifestPath=path.join(root,'tests/frozen-renderers.json');

function extractSeed(source){
  const start=source.indexOf('const seed=[');
  const end=source.indexOf('\n];',start);
  assert(start>=0&&end>start,'Could not find the product seed catalog');
  return vm.runInNewContext(source.slice(start+'const seed='.length,end+2),Object.create(null),{timeout:1000});
}

function extractFunction(source,name){
  const start=source.indexOf(`function ${name}(`);
  assert(start>=0,`Could not find protected editor function ${name}`);
  const brace=source.indexOf('{',start);
  let depth=0,quote=null,lineComment=false,blockComment=false;
  for(let i=brace;i<source.length;i++){
    const c=source[i],next=source[i+1];
    if(lineComment){if(c==='\n')lineComment=false;continue;}
    if(blockComment){if(c==='*'&&next==='/'){blockComment=false;i++;}continue;}
    if(quote){
      if(c==='\\'){i++;continue;}
      if(c===quote)quote=null;
      continue;
    }
    if(c==='/'&&next==='/'){lineComment=true;i++;continue;}
    if(c==='/'&&next==='*'){blockComment=true;i++;continue;}
    if(c==='\''||c==='"'||c==='`'){quote=c;continue;}
    if(c==='{')depth++;
    if(c==='}'&&--depth===0)return source.slice(start,i+1);
  }
  assert.fail(`Unclosed protected editor function ${name}`);
}

const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const hashFile=relative=>sha256(fs.readFileSync(path.join(root,relative)));
const protectedFunctions=[
  'ensureTemplateImage','buildTemplateMask','makeCleanZoneArtworkCanvas',
  'makeLongSleeveTshirtArtworkCanvas','renderMaskedZoneCanvas','drawEditor',
  'maxLayerScale','garmentCopyFamily','zonePlacement','splitTshirtGeometry',
  'splitFleeceHoodieGeometry','rebuildFleeceHoodiePreview',
  'updateTshirtZoneTextures','rebuildJacketPreview','rebuildHoodMaskPreview',
  'rebuildHoodedLongSleevePreview','rebuildHatPreview','rebuildShortsPreview',
  'rebuildMaskPreview','rebuildGarmentPreview','loadGarment'
];

function currentManifest(){
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  return {
    rendererFiles:Object.fromEntries(Object.keys(manifest.rendererFiles).map(file=>[file,hashFile(file)])),
    templateFiles:Object.fromEntries(Object.keys(manifest.templateFiles).map(file=>[file,hashFile(file)])),
    editorFunctions:Object.fromEntries(protectedFunctions.map(name=>[name,sha256(extractFunction(editor,name))]))
  };
}

if(process.argv.includes('--print-current')){
  console.log(JSON.stringify(currentManifest(),null,2));
  process.exit(0);
}

const actualCatalog=JSON.parse(JSON.stringify(extractSeed(editor)));
assert.deepEqual(actualCatalog,expectedCatalog,
  'Frozen product catalog changed: model URLs, prices, zones, or template dimensions no longer match the approved baseline');
assert.equal(new Set(actualCatalog.map(product=>product.id)).size,actualCatalog.length,'Product IDs must remain unique');
assert.equal(actualCatalog.length,12,'The approved catalog must contain exactly 12 products');

const expectedManifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
assert.deepEqual(currentManifest(),expectedManifest,
  'A frozen renderer, mapping function, or production template changed. Review the affected product and update the baseline only after approval.');

assert(editor.includes("const MQD_TSHIRT_RENDERER_LOCK='stable-v1'"),'T-Shirt renderer lock missing');
assert(editor.includes("const MQD_LONG_SLEEVE_TSHIRT_TEXT_MAPPING_LOCK='unified-five-zone-artwork-v2'"),'Long Sleeve mapping lock missing');
assert(editor.includes('let garmentLoadVersion=0;'),'Stale garment-load protection missing');
assert(editor.includes('if(loadVersion!==garmentLoadVersion)'),'Stale GLB callback guard missing');

console.log('PASS: 12 approved products, renderer mappings, templates, and stale-load protection match the frozen baseline.');
