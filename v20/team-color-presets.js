export const TEAM_COLOR_PRESETS=[
 ['White','#FFFFFF'],['Black','#111111'],['Navy','#14213D'],['Royal Blue','#2456A6'],
 ['Red','#C62828'],['Maroon','#800020'],['Forest Green','#1B5E3C'],['Kelly Green','#16854A'],
 ['Purple','#673A91'],['Orange','#EF6C20'],['Gold','#E8B923'],['Gray','#808080']
];
export function mountTeamColorPresets({container=null,applyColor=null,allowMaster=false}={}){
 if(document.body.dataset.teamMaster==='true'&&!allowMaster||document.getElementById('teamColorPresets'))return;
 const picker=document.getElementById('zoneColor'),hex=document.getElementById('zoneHex'),apply=document.getElementById('applyAll');if(!applyColor&&(!picker||!hex||!apply))return;
 const box=document.createElement('fieldset');box.id='teamColorPresets';box.style.cssText='margin:12px 0;padding:10px;border:1px solid #ddd;border-radius:10px;min-width:0';
 const legend=document.createElement('legend');legend.textContent='Whole-shirt colors';
 const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,44px);gap:8px';
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.style.cssText='position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap';
 const style=document.createElement('style');style.textContent='#teamColorPresets button{width:44px;height:44px;min-width:44px;padding:0;border:1px solid #777;border-radius:3px;cursor:pointer;font-size:24px;line-height:1}#teamColorPresets button[aria-pressed="true"]{outline:3px solid #212121;outline-offset:2px}#teamColorPresets button:focus-visible{outline:3px solid #006cff;outline-offset:3px}';
 const syncSelection=()=>{if(!box.isConnected)return;const zones=Object.values(window.MQDDesigner?.exportDesign()?.design?.zones||{});const color=zones.length&&zones.every(z=>z.background?.toUpperCase()===zones[0].background?.toUpperCase())?zones[0].background.toUpperCase():null;for(const button of grid.children){const selected=button.dataset.color===color;button.setAttribute('aria-pressed',String(selected));button.firstChild.textContent=selected?'✓':'';}};
 for(const [name,color] of TEAM_COLOR_PRESETS){
  const button=document.createElement('button');button.type='button';button.setAttribute('aria-label','Color whole shirt '+name);button.setAttribute('aria-pressed','false');button.dataset.color=color;button.style.background=color;button.style.color=['White','Gold','Orange'].includes(name)?'#111111':'#FFFFFF';
  const mark=document.createElement('span');mark.setAttribute('aria-hidden','true');button.append(mark);
  button.onclick=async()=>{try{if(applyColor)await applyColor(color);else{if(apply.disabled||document.body.dataset.teamMaster==='true')return;hex.value=color;picker.value=color.toLowerCase();apply.click();}syncSelection();status.textContent=name+' applied to every garment zone. Logo and artwork placement are unchanged.';}catch(error){status.textContent=error.message;}};grid.append(button);
 }
 box.append(style,legend,grid,status);(container||picker.closest('.section')).append(box);syncSelection();
 const onChange=()=>{if(box.isConnected)syncSelection();else window.removeEventListener('mqd:shop-design-change',onChange);};window.addEventListener('mqd:shop-design-change',onChange);
 return box;
}
