// Keep the existing form and validation; group its choices into manageable steps.
const form=document.getElementById('setupForm');
if(form){
 const cards=[...form.children].filter(node=>node.matches('section.card')&&node.id!=='ownerBilling');
 const titles=['1. Business and plan','2. Garments and printing','3. Review and submit'];
 const groups=cards.length===5?[[cards[0]],[cards[1],cards[2],cards[3]],[cards[4]]]:[];
 const steps=groups.map((nodes,index)=>{
  const step=document.createElement('details');step.className='setup-step card';step.open=index===0;
  const summary=document.createElement('summary');summary.textContent=titles[index];step.append(summary);nodes[0].before(step);
  for(const node of nodes)step.append(node);
  if(index<2){const next=document.createElement('button');next.type='button';next.textContent=index===0?'Continue to garments':'Review my setup';next.onclick=()=>{const invalid=[...step.querySelectorAll('input,select,textarea')].find(input=>!input.disabled&&!input.checkValidity());if(invalid){invalid.reportValidity();return;}step.open=false;steps[index+1].open=true;steps[index+1].querySelector('summary').focus();};step.append(next);}
  return step;
 });
 form.addEventListener('invalid',event=>{let node=event.target.parentElement;while(node&&node!==form){if(node.tagName==='DETAILS')node.open=true;node=node.parentElement;}},true);
 // Billing links land directly on the existing authenticated status panel.
 if(location.hash==='#ownerBilling')document.getElementById('ownerBilling').scrollIntoView({block:'start'});
}
