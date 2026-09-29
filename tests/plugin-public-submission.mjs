import assert from 'node:assert/strict';
import {prepareDesignPreview} from '../api/mcp.js';
import {decodeTransfer} from '../v20/ai-transfer-contract.js';

const tshirtZones=['Front','Back','Left Sleeve','Right Sleeve','Collar'];

function zones(elementsFor=()=>[]){
  return tshirtZones.map(zone=>({zone,background:'#000000',elements:elementsFor(zone)}));
}

{
  const out=prepareDesignPreview({
    productId:'tshirt',
    summary:'Direct ChatGPT public-plugin smoke test',
    zones:zones(),
    backgroundAction:'none'
  });
  assert.equal(out.productId,'tshirt');
  assert.equal(out.needsBackgroundUpload,false);
  const url=new URL(out.url);
  assert.equal(url.origin,'https://mymerchnow.app');
  assert.equal(url.searchParams.get('ai-test'),'1');
  assert.ok(url.hash.startsWith('#ai-transfer='));
  const transfer=decodeTransfer(url.hash.slice('#ai-transfer='.length));
  assert.match(transfer.plan.contextId,/^[a-f0-9]{32}$/);
  assert.equal(transfer.needsBackgroundUpload,false);
}

{
  const contextId='a'.repeat(32);
  const out=prepareDesignPreview({
    productId:'tshirt',
    summary:'Website-origin revision smoke test',
    contextId,
    returnUrl:'https://mymerchnow.app/?ai-test=1',
    zones:zones(),
    backgroundAction:'reuse'
  });
  const url=new URL(out.url);
  const transfer=decodeTransfer(url.hash.slice('#ai-transfer='.length));
  assert.equal(transfer.plan.contextId,contextId);
}

{
  const out=prepareDesignPreview({
    productId:'tshirt',
    summary:'Background upload smoke test',
    zones:zones(()=>[{kind:'artwork',x:0,y:0,scale:1,rotation:0}]),
    backgroundAction:'upload'
  });
  assert.equal(out.needsBackgroundUpload,true);
  const url=new URL(out.url);
  const transfer=decodeTransfer(url.hash.slice('#ai-transfer='.length));
  assert.equal(transfer.needsBackgroundUpload,true);
}

console.log('MyMerchNow public plugin handoff tests passed.');
