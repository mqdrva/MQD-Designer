import {createContextId,validContextId,saveDraftAssets,loadDraftAssets} from './ai-draft-assets.js';
const KEY='mqd-business-setup-preview-v1';
// Reuse the existing local artwork store; session storage holds only its small reference.
export async function saveSetupPreview(setup){
 let prior;try{prior=JSON.parse(sessionStorage.getItem(KEY)||'null');}catch{}
 const id=validContextId(prior?.assetContextId)?prior.assetContextId:createContextId();
 await saveDraftAssets(id,{setup});sessionStorage.setItem(KEY,JSON.stringify({assetContextId:id}));
}
export async function loadSetupPreview(){
 const raw=sessionStorage.getItem(KEY);if(!raw)return null;
 const saved=JSON.parse(raw);if(saved?.schema==='mqd-business-setup-v1')return saved;
 return (await loadDraftAssets(saved?.assetContextId))?.setup||null;
}
