const pane=document.getElementById('controlPane');

if(pane&&!pane.dataset.sidebarUxPreview){
  pane.dataset.sidebarUxPreview='1';
  pane.classList.add('sidebar-ux-preview');

  const directSections=()=>[...pane.children].filter(el=>el.classList?.contains('section'));
  const orderSection=document.getElementById('orderOptionsSection');
  const backgroundSection=directSections().find(section=>section.querySelector('#zoneColor'));
  const layersSection=directSections().find(section=>section.querySelector('#layers'));

  const tabs=document.createElement('div');
  tabs.className='sidebar-ux-tabs';
  tabs.setAttribute('role','tablist');
  tabs.setAttribute('aria-label','Editor controls');

  const panelHost=document.createElement('div');
  panelHost.className='sidebar-ux-panels';

  const makePanel=(name,label)=>{
    const panel=document.createElement('div');
    panel.className='sidebar-ux-panel';
    panel.dataset.sidebarPanel=name;
    panel.id='sidebarPanel'+label;
    panel.setAttribute('role','tabpanel');
    panelHost.appendChild(panel);

    const button=document.createElement('button');
    button.type='button';
    button.className='sidebar-ux-tab';
    button.dataset.sidebarTab=name;
    button.textContent=label;
    button.setAttribute('role','tab');
    button.setAttribute('aria-controls',panel.id);
    tabs.appendChild(button);
    return panel;
  };

  const designPanel=makePanel('design','Design');
  const layersPanel=makePanel('layers','Layers');
  const orderPanel=makePanel('order','Order');

  pane.insertBefore(tabs,pane.firstChild);
  pane.insertBefore(panelHost,tabs.nextSibling);

  const addGrid=pane.querySelector('.add-grid');
  if(addGrid) designPanel.appendChild(addGrid);
  if(backgroundSection) designPanel.appendChild(backgroundSection);
  if(layersSection) layersPanel.appendChild(layersSection);
  if(orderSection) orderPanel.appendChild(orderSection);

  const buttons=[...tabs.querySelectorAll('.sidebar-ux-tab')];
  const panels=[...panelHost.querySelectorAll('.sidebar-ux-panel')];

  const activate=name=>{
    buttons.forEach(button=>{
      const active=button.dataset.sidebarTab===name;
      button.classList.toggle('active',active);
      button.setAttribute('aria-selected',active?'true':'false');
      button.tabIndex=active?0:-1;
    });
    panels.forEach(panel=>panel.classList.toggle('active',panel.dataset.sidebarPanel===name));
  };

  buttons.forEach(button=>button.addEventListener('click',()=>activate(button.dataset.sidebarTab)));
  tabs.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const index=buttons.indexOf(document.activeElement);
    const delta=event.key==='ArrowRight'?1:-1;
    const next=buttons[(Math.max(0,index)+delta+buttons.length)%buttons.length];
    next.focus();
    activate(next.dataset.sidebarTab);
  });

  const placeAi=()=>{
    if(!backgroundSection) return;
    const launch=document.querySelector('#controlPane .ai-designer-launch');
    const panel=document.getElementById('chatBackgroundPanel');
    if(launch&&launch.parentElement!==backgroundSection) backgroundSection.appendChild(launch);
    if(panel&&panel.parentElement!==backgroundSection) backgroundSection.appendChild(panel);
  };

  const dockLayerControls=()=>{
    if(!layersSection) return;
    const controls=document.getElementById('layerControls');
    if(!controls) return;
    const activeCard=layersSection.querySelector('#layers .layer.active');
    if(activeCard){
      if(controls.parentElement!==activeCard) activeCard.appendChild(controls);
    }else if(controls.parentElement!==layersSection){
      layersSection.appendChild(controls);
    }
  };

  const placeQualityCard=()=>{
    const card=document.getElementById('printQualityCard');
    if(card&&card.parentElement!==layersPanel) layersPanel.appendChild(card);
  };

  const controls=document.getElementById('layerControls');
  if(controls&&!controls.dataset.sidebarUxEvents){
    controls.dataset.sidebarUxEvents='1';
    for(const eventName of ['click','mousedown','pointerdown','touchstart']){
      controls.addEventListener(eventName,event=>event.stopPropagation());
    }
    controls.addEventListener('dragstart',event=>{
      event.stopPropagation();
      event.preventDefault();
    });
  }

  const canvas=document.getElementById('editorCanvas');
  canvas?.addEventListener('pointerup',()=>{
    requestAnimationFrame(()=>{
      const layerControls=document.getElementById('layerControls');
      if(layerControls&&!layerControls.classList.contains('hidden')){
        dockLayerControls();
        activate('layers');
      }
    });
  });

  document.getElementById('addTextBtn')?.addEventListener('click',()=>{
    requestAnimationFrame(()=>{
      dockLayerControls();
      const layerControls=document.getElementById('layerControls');
      if(layerControls&&!layerControls.classList.contains('hidden')) activate('layers');
    });
  });

  document.getElementById('artUpload')?.addEventListener('change',()=>{
    setTimeout(()=>{
      dockLayerControls();
      const layerControls=document.getElementById('layerControls');
      if(layerControls&&!layerControls.classList.contains('hidden')) activate('layers');
    },250);
  });

  const observer=new MutationObserver(()=>{
    placeAi();
    dockLayerControls();
    placeQualityCard();
  });
  observer.observe(pane,{childList:true,subtree:true});

  placeAi();
  dockLayerControls();
  placeQualityCard();
  activate('design');
}
