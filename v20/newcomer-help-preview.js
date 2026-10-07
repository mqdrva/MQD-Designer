const TOUR_KEY='mqd-newcomer-tour-v1';
let activeTarget=null;
let activeIndex=0;
let overlay=null;
let card=null;

const steps=[
  {
    title:'1. Add your design',
    body:'Start with Add Image, Add Text, or the MQD Library. You can also create a background with ChatGPT from the Background section.',
    target:()=>document.querySelector('.sidebar-ux-panel[data-sidebar-panel="design"] .add-grid'),
    tab:'design'
  },
  {
    title:'2. Position and size it',
    body:'Select the artwork on the 2D editor, then drag it into place. Open the Layers dropdown under Background for precise position, size, rotation, visibility, fill, and delete controls.',
    target:()=>document.getElementById('editorCanvas'),
    tab:'design'
  },
  {
    title:'3. Choose size and quantity',
    body:'Open Order to choose the garment size and quantity. You can add another size when the same design is needed in multiple sizes.',
    target:()=>document.getElementById('orderOptionsSection'),
    tab:'order'
  },
  {
    title:'4. Add it to your cart',
    body:'When the design and sizes look right, use Add to Cart. You can review the item before checkout.',
    target:()=>document.getElementById('addToCart')
  }
];

function activateTab(name){
  const button=document.querySelector(`.sidebar-ux-tab[data-sidebar-tab="${name}"]`);
  if(button&&!button.classList.contains('active'))button.click();
}

function clearTarget(){
  activeTarget?.classList.remove('mqd-tour-target');
  activeTarget=null;
}

function finishTour(){
  clearTarget();
  overlay?.remove();
  card?.remove();
  overlay=null;card=null;
  try{localStorage.setItem(TOUR_KEY,'done');}catch{}
}

function showStep(index){
  activeIndex=Math.max(0,Math.min(steps.length-1,index));
  const step=steps[activeIndex];
  if(step.tab)activateTab(step.tab);
  clearTarget();
  requestAnimationFrame(()=>{
    const mobileStudio=document.querySelector('.app.mobile-design-studio');
    const mobileCopy=[
      'Use Add Image or Add Text below the shirt. More tools opens the MQD Library and advanced tools; Background opens your background controls.',
      'Tap your artwork to edit it below the shirt. The selected area and layer stay labeled. Scroll inside the editing panel for font, color, size, position and rotation; Done gives you more shirt space.',
      'Open Size & Qty to choose garment sizes and quantities. Add another size when the same design is needed in multiple sizes.',
      'Open Menu for Add to Cart, Save Design, your account and other actions. Review your design and sizes before ordering.'
    ];
    if(mobileStudio&&activeIndex===3){const menu=document.querySelector('.mobile-studio-menu');if(menu)menu.open=true;}
    activeTarget=mobileStudio&&activeIndex===0?document.querySelector('.mobile-studio-toolbar'):step.target?.()||null;
    activeTarget?.classList.add('mqd-tour-target');
    activeTarget?.scrollIntoView?.({behavior:'smooth',block:'center',inline:'nearest'});
    card.querySelector('.mqd-tour-progress').textContent=`Quick tour · ${activeIndex+1} of ${steps.length}`;
    card.querySelector('h3').textContent=step.title;
    card.querySelector('p').textContent=mobileStudio?mobileCopy[activeIndex]:step.body;
    const next=card.querySelector('.mqd-tour-next');
    next.textContent=activeIndex===steps.length-1?'Finish':'Next';
  });
}

function startTour({force=false}={}){
  if(card)return;
  if(!force){
    try{if(localStorage.getItem(TOUR_KEY)==='done')return;}catch{}
  }
  overlay=document.createElement('div');overlay.className='mqd-tour-backdrop';
  card=document.createElement('div');card.className='mqd-tour-card';card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-label','Quick design walkthrough');
  card.innerHTML='<div class="mqd-tour-progress"></div><h3></h3><p></p><div class="mqd-tour-actions"><button type="button" class="mqd-tour-skip">Skip tour</button><button type="button" class="mqd-tour-next">Next</button></div>';
  card.querySelector('.mqd-tour-skip').onclick=finishTour;
  card.querySelector('.mqd-tour-next').onclick=()=>activeIndex===steps.length-1?finishTour():showStep(activeIndex+1);
  document.body.append(overlay,card);
  activeIndex=0;
  showStep(0);
}

function addReplayButton(){
  const tabs=document.querySelector('.sidebar-ux-tabs');
  if(!tabs||document.getElementById('quickDesignTour'))return;
  const button=document.createElement('button');
  button.id='quickDesignTour';
  button.type='button';
  button.className='sidebar-tour-replay';
  button.textContent='? Quick design tour';
  button.onclick=()=>startTour({force:true});
  tabs.insertAdjacentElement('afterend',button);
}

function boot(){
  addReplayButton();
  const force=new URLSearchParams(location.search).get('tour')==='1';
  setTimeout(()=>startTour({force}),650);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
