const trigger=document.getElementById('customerHelpToggle');
const menu=document.getElementById('customerHelpMenu');
if(trigger&&menu){
 const native=typeof menu.showPopover==='function';
 let open=false;
 function place(){
  const anchor=trigger.getBoundingClientRect();
  const width=Math.min(206,Math.max(0,window.innerWidth-16));
  const left=Math.max(8,Math.min(anchor.right-width,window.innerWidth-width-8));
  const top=Math.max(8,Math.min(anchor.bottom+8,window.innerHeight-120));
  Object.assign(menu.style,{width:width+'px',left:left+'px',top:top+'px',right:'auto',bottom:'auto',maxHeight:Math.max(80,window.innerHeight-top-8)+'px'});
 }
 function sync(value){
  open=value;trigger.setAttribute('aria-expanded',String(value));
  menu.classList.toggle('is-open',value);
  if(value)place();
 }
 function close(){if(native){if(open)menu.hidePopover();}else sync(false);}
 // Help is part of the mobile Menu; don't close its parent before opening the popover.
 trigger.addEventListener('click',event=>{event.stopPropagation();if(!native)sync(!open);});
 if(native)menu.addEventListener('beforetoggle',event=>sync(event.newState==='open'));
 else{
  document.addEventListener('click',event=>{if(open&&!menu.contains(event.target))close();});
  document.addEventListener('keydown',event=>{if(open&&event.key==='Escape'){close();trigger.focus();}});
 }
 menu.addEventListener('click',event=>{if(event.target.closest('a'))close();});
 window.addEventListener('resize',()=>{if(open)place();});
 window.addEventListener('scroll',()=>{if(open)place();},true);
}
