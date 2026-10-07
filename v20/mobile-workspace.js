const tabs=[...document.querySelectorAll('[data-mobile-pane]')];
const panes={preview:document.querySelector('.preview-pane'),canvas:document.querySelector('.canvas-pane'),control:document.querySelector('.control-pane')};
const app=document.querySelector('.app');
const mobile=window.matchMedia('(max-width: 850px)');
let active='canvas',sheetOpen=false,sheetPanel='layers',lastSelection=null,canvasGesture=false;
const canvasPointers=new Set();

// Keep every existing header action available in a compact mobile menu.
const header=document.querySelector('body > header');
const topActions=header?.querySelector('.top-actions');
const actionsHome=document.createComment('Desktop header actions');
const actionsMenu=document.createElement('details');
const editorTools=document.querySelector('.editor-toolbar');
const toolsHome=document.createComment('Desktop editor tools');
let helpHome=null;
editorTools?.before(toolsHome);
actionsMenu.className='mobile-studio-menu';
actionsMenu.innerHTML='<summary class="btn">Menu</summary>';
if(topActions){topActions.before(actionsHome);header.appendChild(actionsMenu);}
function placeHeaderActions(){
  if(!topActions)return;
  if(mobile.matches)actionsMenu.appendChild(topActions);
  else{actionsMenu.open=false;actionsHome.after(topActions);}
  if(editorTools){if(mobile.matches)panes.control.appendChild(editorTools);else toolsHome.after(editorTools);}
  const help=document.getElementById('mqdHelpLauncher');
  if(help){
    if(!helpHome){helpHome=document.createComment('Desktop help launcher');help.before(helpHome);}
    if(mobile.matches)topActions.appendChild(help);else helpHome.after(help);
  }
}
topActions?.addEventListener('click',event=>{if(event.target.closest('button,a'))actionsMenu.open=false;});
placeHeaderActions();
const helpObserver=new MutationObserver(()=>{
  if(document.getElementById('mqdHelpLauncher')){placeHeaderActions();helpObserver.disconnect();}
});
if(!document.getElementById('mqdHelpLauncher'))helpObserver.observe(document.body,{childList:true});

const studio=document.createElement('div');
studio.className='mobile-studio-tools';
studio.innerHTML='<div class="mobile-selection-bar"><span id="mobileSelectedLayer" role="status" aria-live="polite">Front · No layer selected</span><button id="mobileEditLayer" type="button" class="btn" disabled>Edit</button></div><div class="mobile-studio-toolbar" aria-label="Design tools"><button type="button" data-studio-action="image">Add Image</button><button type="button" data-studio-action="text">Add Text</button><button type="button" data-studio-action="layers">Layers</button><button type="button" data-studio-action="background">Background</button><button type="button" data-studio-action="more">More tools</button></div>';
panes.canvas?.appendChild(studio);

const sheetHead=document.createElement('div');
sheetHead.className='mobile-sheet-head';
sheetHead.innerHTML='<strong id="mobileSheetTitle">Layers</strong><button type="button" id="mobileSheetDone" class="btn">Done</button>';
panes.control?.prepend(sheetHead);
const selectedLabel=document.getElementById('mobileSelectedLayer');
const editButton=document.getElementById('mobileEditLayer');
const sheetTitle=document.getElementById('mobileSheetTitle');
const doneButton=document.getElementById('mobileSheetDone');

function selection(){return window.MQDDesigner?.getSelection?.()||null;}
function syncSelection(detail=selection()){
  const zone=detail?.zone||document.getElementById('zoneName')?.textContent||'Front';
  const name=detail?.id?(detail.type==='text'?`Text: ${detail.text||detail.label}`:`Image: ${detail.filename||detail.label}`):'No layer selected';
  selectedLabel.textContent=`${zone} · ${name}${detail?.locked?' · Locked':''}${detail?.visible===false?' · Hidden':''}`;
  editButton.disabled=!detail?.id;
  const key=detail?.id?`${detail.productId}:${zone}:${detail.id}`:null;
  if(mobile.matches&&active==='canvas'&&!canvasGesture&&key!==lastSelection){
    sheetOpen=Boolean(key);
    if(key)sheetPanel='edit';
    else if(sheetPanel==='edit')sheetPanel='layers';
  }
  lastSelection=key;
  render(false);
}

function render(refresh=true){
  const paneName=active==='order'?'control':active;
  app?.classList.toggle('mobile-design-studio',mobile.matches);
  if(app){app.dataset.mobileWorkspace=active;app.dataset.studioPanel=sheetPanel;app.classList.toggle('studio-sheet-open',sheetOpen);}
  for(const [name,pane] of Object.entries(panes))pane?.classList.toggle('mobile-active',mobile.matches&&(name===paneName||(active==='canvas'&&name==='control'&&sheetOpen)));
  for(const tab of tabs){const selected=tab.dataset.mobilePane===active;tab.classList.toggle('active',selected);tab.setAttribute('aria-selected',String(selected));}
  if(panes.control?.firstChild!==sheetHead)panes.control?.prepend(sheetHead);
  sheetTitle.textContent=sheetPanel==='edit'?'Edit selected layer':sheetPanel==='background'?'Background':sheetPanel==='more'?'Artwork & tools':'Layers';
  editButton.setAttribute('aria-expanded',String(sheetOpen&&sheetPanel==='edit'));
  studio.querySelectorAll('[data-studio-action]').forEach(button=>button.setAttribute('aria-pressed',String(sheetOpen&&button.dataset.studioAction===sheetPanel)));
  if(!mobile.matches||!refresh)return;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const refreshed=window.MQDDesigner?.refreshMobileWorkspace?.(paneName);
    if(active==='preview'&&!refreshed)window.dispatchEvent(new Event('resize'));
  }));
}

function setSheet(panel){
  active='canvas';sheetPanel=panel;sheetOpen=true;
  window.dispatchEvent(new CustomEvent('mqd:sidebar-tab',{detail:'design'}));
  const section=panes.control?.querySelector(`[data-sidebar-section="${panel==='background'?'background':'layers'}"]`);
  section?._sidebarSetOpen?.(true);
  render();
  panes.control.scrollTop=0;
}

for(const tab of tabs)tab.addEventListener('click',()=>{
  active=tab.dataset.mobilePane==='control'?'canvas':tab.dataset.mobilePane;
  if(tab.dataset.mobilePane==='control'){sheetOpen=true;sheetPanel='layers';}
  window.dispatchEvent(new CustomEvent('mqd:sidebar-tab',{detail:active==='order'?'order':'design'}));
  render();
});
studio.addEventListener('click',event=>{
  const action=event.target.closest('[data-studio-action]')?.dataset.studioAction;
  if(!action)return;
  if(action==='image')document.getElementById('addImageBtn')?.click();
  else if(action==='text')document.getElementById('addTextBtn')?.click();
  else setSheet(action);
});
editButton.addEventListener('click',()=>setSheet('edit'));
doneButton.addEventListener('click',()=>{sheetOpen=false;render();editButton.focus();});
mobile.addEventListener?.('change',()=>{placeHeaderActions();syncSelection();render();});
window.addEventListener('mqd:selection-changed',event=>syncSelection(event.detail));
document.getElementById('editorCanvas')?.addEventListener('pointerup',event=>{
  canvasPointers.delete(event.pointerId);canvasGesture=canvasPointers.size>0;
  if(canvasGesture)return;
  if(!mobile.matches||active!=='canvas')return;
  // Keep the larger canvas available after positioning or pinching artwork.
  if(sheetOpen){sheetOpen=false;render();}
});
document.getElementById('editorCanvas')?.addEventListener('pointerdown',event=>{canvasPointers.add(event.pointerId);canvasGesture=true;},{capture:true});
function clearCanvasGesture(){canvasPointers.clear();canvasGesture=false;}
document.getElementById('editorCanvas')?.addEventListener('pointercancel',clearCanvasGesture);
document.getElementById('editorCanvas')?.addEventListener('lostpointercapture',clearCanvasGesture);
window.addEventListener('blur',clearCanvasGesture);
window.addEventListener('pagehide',clearCanvasGesture);
panes.control?.addEventListener('click',event=>{
  if(!mobile.matches||active!=='canvas'||!event.target.closest('#layers .layer'))return;
  if(event.target.closest('button'))return;
  requestAnimationFrame(()=>setSheet('edit'));
},{capture:true});
window.addEventListener('mqd:text-added',()=>{if(mobile.matches)setSheet('edit');});
window.addEventListener('mqd:show-preview',()=>{if(mobile.matches){active='preview';render();}});
window.addEventListener('mqd:garment-ready',()=>{if(mobile.matches&&active==='preview')render();});
window.addEventListener('mqd:sidebar-changed',event=>{
  if(!mobile.matches)return;
  if(event.detail==='order'){active='order';render();}
  else if(active==='order'){active='canvas';render();}
});
render();
