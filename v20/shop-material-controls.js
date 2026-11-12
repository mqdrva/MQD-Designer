import {materialOptions, requestMaterial, REQUEST_MATERIAL} from './print-shop-contract.js';

// Request preferences stay separate from artwork and print-zone dimensions.
export function mountMaterialControls({shop, form, getProduct, onChange}) {
  const section = document.createElement('fieldset');
  section.className = 'shop-materials';
  const legend = document.createElement('legend');
  legend.textContent = 'Garment material';
  const label = document.createElement('label');
  label.textContent = 'Fabric preference';
  const select = document.createElement('select');
  select.id = 'shopMaterial'; select.className = 'input';
  label.append(select);
  const otherLabel = document.createElement('label');
  otherLabel.textContent = 'Material you would like the shop to quote';
  const other = document.createElement('input');
  other.id = 'shopMaterialRequest'; other.className = 'input'; other.maxLength = 150;
  otherLabel.append(other);
  const note = document.createElement('p');
  note.id = 'shopMaterialHelp'; note.className = 'subtle';
  note.textContent = 'Your shop confirms fabric, availability and final pricing. The preview does not show fabric texture. Other materials require a quote.';
  select.setAttribute('aria-describedby', note.id);
  section.append(legend, label, otherLabel, note); form.prepend(section);
  let product, restoring = false;
  const choices = new Map();
  function toggle() { otherLabel.hidden = select.value !== REQUEST_MATERIAL; other.required = !otherLabel.hidden; }
  function value() { return {material: select.value, materialRequest: select.value === REQUEST_MATERIAL ? other.value.trim() : ''}; }
  function sync() {
    const next = getProduct(); if (!next || next === product) return;
    if (product && !restoring) choices.set(product, value());
    product = next;
    const options = materialOptions(shop.garments?.[product]?.materials);
    select.replaceChildren(new Option(options.length ? 'Choose a fabric' : 'Confirm material with shop', ''), ...options.map(v => new Option(v, v)), new Option('Request another material — shop quote', REQUEST_MATERIAL));
    select.required = !!options.length;
    const saved = choices.get(product);
    select.value = saved?.material || ''; other.value = saved?.materialRequest || ''; toggle();
  }
  function restore(summary) {
    const saved = requestMaterial(shop, summary);
    choices.set(summary.productId, saved); restoring = true; product = null; sync(); restoring = false;
    // Missing choices in older packages remain unspecified instead of choosing a fabric for the customer.
    select.value = saved.material; other.value = saved.materialRequest; toggle();
  }
  select.onchange = () => { toggle(); onChange(); };
  other.oninput = onChange;
  return {sync, value, restore, validate: () => requestMaterial(shop, {productId: getProduct(), ...value()}, {requireSelection: true})};
}
