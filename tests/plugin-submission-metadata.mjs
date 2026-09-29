import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest=JSON.parse(fs.readFileSync(new URL('../plugins/mymerchnow/.codex-plugin/plugin.json',import.meta.url),'utf8'));
const ui=manifest.interface;
const ext=manifest.extensions?.['com.openai'];
const positive=ext?.review?.test_cases?.positive||[];
const negative=ext?.review?.test_cases?.negative||[];

assert.equal(manifest.name,'mymerchnow');
assert.ok(/^\d+\.\d+\.\d+$/.test(manifest.version),'version must be semver');
assert.ok(ui.displayName&&ui.displayName.length<=30,'displayName must be <=30 chars');
assert.ok(ui.shortDescription&&ui.shortDescription.length<=30,'shortDescription must be <=30 chars');
assert.ok(ui.longDescription&&ui.longDescription.length<=4000,'longDescription must be <=4000 chars');
assert.ok(ui.developerName&&ui.developerName.length<=80,'developerName must be <=80 chars');
assert.ok(Array.isArray(ui.capabilities)&&ui.capabilities.length<=20,'capabilities must be valid');
for(const prompt of ui.defaultPrompt||[]){
  assert.ok(prompt.length<=128,'starter prompt must be <=128 chars');
  assert.ok(!prompt.includes('@'),'starter prompt must not contain @mentions');
}
for(const key of ['websiteURL','supportURL','privacyPolicyURL','termsOfServiceURL']){
  assert.ok(/^https:\/\//.test(ui[key]||''),key+' must be HTTPS');
}
assert.equal(positive.length,5,'initial MCP review needs exactly 5 positive tests');
assert.equal(negative.length,3,'initial MCP review needs exactly 3 negative tests');
for(const t of positive){
  assert.ok(t.description&&t.prompt&&t.tools_triggered&&t.expected_behavior,'positive test is incomplete');
}
for(const t of negative){
  assert.ok(t.description&&t.prompt,'negative test is incomplete');
}
assert.equal(ext.review.commerce,true,'commerce disclosure must remain explicit');
assert.deepEqual(ext.publication.countries,['US']);
assert.ok(ext.publication.release_notes);

console.log('PASS: MyMerchNow public submission metadata is within OpenAI review limits.');
