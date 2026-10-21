import {TEMPLATE_CATEGORIES} from './template-contract.js';
import {templateRequest} from './template-api.js';
const demo=new URLSearchParams(location.search).get('demo')==='1';
const $=id=>document.getElementById(id);let designs=[],filter='All';
function render(){
 const categories=['All',...TEMPLATE_CATEGORIES.filter(c=>designs.some(d=>d.categories.includes(c)))];$('filters').replaceChildren();
 for(const category of categories){const b=document.createElement('button');b.textContent=category;b.setAttribute('aria-pressed',String(category===filter));b.onclick=()=>{filter=category;render();};$('filters').append(b);}
 const visible=designs.filter(d=>filter==='All'||d.categories.includes(filter));$('gallery').replaceChildren();
 for(const design of visible){
  const card=document.createElement('article');card.className='card';const previews=document.createElement('div');previews.className='previews';
  for(const side of ['Front','Back']){const figure=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption');image.src=design.previews[side];image.alt=design.name+' · '+side;image.loading='lazy';image.width=300;image.height=400;caption.textContent=side;figure.append(image,caption);previews.append(figure);}
  const body=document.createElement('div');body.className='card-body';const title=document.createElement('h2'),details=document.createElement('p'),button=document.createElement('a');title.textContent=design.name;details.textContent=design.garment+' · '+design.range;button.className='btn primary';button.textContent='Customize this look';
  button.href=demo?'/index.html?templateDemo='+encodeURIComponent(design.id):'/index.html?template='+encodeURIComponent(design.id)+'&templateVersion='+encodeURIComponent(design.versionId);
  body.append(title,details);if(design.draftStatus){const note=document.createElement('p');note.textContent=design.draftStatus;body.append(note);}body.append(button);card.append(previews,body);$('gallery').append(card);
 }
 $('galleryStatus').textContent=visible.length?`${visible.length} design${visible.length===1?'':'s'}`:'No designs in this category yet. You can still start from scratch.';
}
try{if(demo){$('demoNotice').hidden=false;const {demoVersions}=await import('./template-demo.js');designs=demoVersions.map(v=>({id:v.template_id,versionId:v.id,name:v.name,categories:v.categories,garment:v.payload.product.name,range:v.range,previews:v.previews,draftStatus:v.draftStatus}));}else designs=(await templateRequest({action:'gallery'})).designs;render();}catch(error){$('galleryStatus').textContent=error.message;}
