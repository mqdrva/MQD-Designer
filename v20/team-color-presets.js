export const TEAM_COLOR_PRESETS=[
 ['White','#FFFFFF'],['Black','#111111'],['Navy','#14213D'],['Royal Blue','#2456A6'],
 ['Red','#C62828'],['Maroon','#800020'],['Forest Green','#1B5E3C'],['Kelly Green','#16854A'],
 ['Purple','#673A91'],['Orange','#EF6C20'],['Gold','#E8B923'],['Gray','#808080']
];
export function mountTeamColorPresets({container=null,applyColor=null,allowMaster=false}={}){
 if(document.body.dataset.teamMaster==='true'&&!allowMaster||document.getElementById('teamColorPresets'))return;
 const picker=document.getElementById('zoneColor'),hex=document.getElementById('zoneHex'),apply=document.getElementById('applyAll');if(!applyColor&&(!picker||!hex||!apply))return;
 const box=document.createElement('fieldset');box.id='teamColorPresets';box.style.cssText='margin:12px 0;padding:10px;border:1px solid #ddd;border-radius:10px;min-width:0';
 const legend=document.createElement('legend');legend.textContent='Whole-shirt colors';const note=document.createElement('p');note.textContent='One click colors every garment zone. Your logo and artwork stay in place. The custom color picker is still available.';note.className='subtle';
 const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px';const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 for(const [name,color] of TEAM_COLOR_PRESETS){const button=document.createElement('button');button.type='button';button.setAttribute('aria-label','Color whole shirt '+name);button.style.cssText='padding:5px;border:1px solid #bbb;border-radius:8px;background:#fff;color:#222;min-width:0;font:inherit;font-size:12px;cursor:pointer';const chip=document.createElement('span');chip.style.cssText='display:block;height:26px;border:1px solid #bbb;border-radius:4px;margin-bottom:4px;background:'+color;chip.setAttribute('aria-hidden','true');button.append(chip,document.createTextNode(name));button.onclick=async()=>{try{if(applyColor)await applyColor(color);else{if(apply.disabled||document.body.dataset.teamMaster==='true')return;hex.value=color;picker.value=color.toLowerCase();apply.click();}status.textContent=name+' applied to every garment zone. Logo and artwork placement are unchanged.';}catch(error){status.textContent=error.message;}};grid.append(button);}
 box.append(legend,note,grid,status);(container||picker.closest('.section')).append(box);return box;
}
