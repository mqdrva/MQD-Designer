const tabs=[...document.querySelectorAll('[data-mobile-pane]')];
const panes={
  preview:document.querySelector('.preview-pane'),
  canvas:document.querySelector('.canvas-pane'),
  control:document.querySelector('.control-pane')
};
const mobile=window.matchMedia('(max-width: 850px)');
let active='canvas';

function render(){
  const paneName=active==='order'?'control':active;
  for(const [name,pane] of Object.entries(panes))pane?.classList.toggle('mobile-active',mobile.matches&&name===paneName);
  for(const tab of tabs){
    const selected=tab.dataset.mobilePane===active;
    tab.classList.toggle('active',selected);
    tab.setAttribute('aria-selected',String(selected));
  }
  if(!mobile.matches)return;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const refreshed=window.MQDDesigner?.refreshMobileWorkspace?.(paneName);
    if(active==='preview'&&!refreshed)window.dispatchEvent(new Event('resize'));
  }));
}

for(const tab of tabs)tab.addEventListener('click',()=>{active=tab.dataset.mobilePane;window.dispatchEvent(new CustomEvent('mqd:sidebar-tab',{detail:active==='order'?'order':'design'}));render();});
mobile.addEventListener?.('change',render);
render();


function showPreviewAfterGarmentCopy(){
  if(!mobile.matches)return;
  active='preview';
  render();
}
window.addEventListener('mqd:show-preview',showPreviewAfterGarmentCopy);
window.addEventListener('mqd:garment-ready',()=>{
  if(!mobile.matches||active!=='preview')return;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    window.MQDDesigner?.refreshMobileWorkspace?.('preview');
  }));
});

window.addEventListener('mqd:sidebar-changed',event=>{
  if(active!=='control'&&active!=='order')return;
  active=event.detail==='order'?'order':'control';
  render();
});
