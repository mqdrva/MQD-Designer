const tabs=[...document.querySelectorAll('[data-mobile-pane]')];
const panes={
  preview:document.querySelector('.preview-pane'),
  canvas:document.querySelector('.canvas-pane'),
  control:document.querySelector('.control-pane')
};
const mobile=window.matchMedia('(max-width: 850px)');
let active='canvas';

function render(){
  for(const [name,pane] of Object.entries(panes))pane?.classList.toggle('mobile-active',mobile.matches&&name===active);
  for(const tab of tabs){
    const selected=tab.dataset.mobilePane===active;
    tab.classList.toggle('active',selected);
    tab.setAttribute('aria-selected',String(selected));
  }
  if(mobile.matches&&active==='preview')requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
}

for(const tab of tabs)tab.addEventListener('click',()=>{active=tab.dataset.mobilePane;render();});
mobile.addEventListener?.('change',render);
render();
