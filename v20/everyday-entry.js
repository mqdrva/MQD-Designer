// Separate Everyday designer using the shared checkout.
{
  const actions = document.querySelector('header .top-actions');
  if (actions && !document.getElementById('everydayEntry')) {
    const entry = document.createElement('a');
    entry.id = 'everydayEntry'; entry.className = 'btn everyday-entry'; entry.href = '/everyday.html'; entry.textContent = 'Everyday Custom';
    entry.setAttribute('aria-label', 'Everyday Custom — cotton garments from $20');
    if (new URLSearchParams(location.search).get('mqdStripeTest') === '1') entry.href = '/everyday-preview.html?mqdStripeTest=1';
    actions.prepend(entry);
  }
}
