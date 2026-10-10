// Preserve existing designer deep links and authentication callbacks at the old root.
(() => {
  const query = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.slice(1));
  const designerKeys = ['mqdCapture', 'owner', 'openCart', 'everydayPreview', 'mqdStripeTest', 'ai-test', 'tour', 'product', 'design', 'code', 'error', 'error_description'];
  const callbackKeys = ['access_token', 'refresh_token', 'error', 'error_description', 'ai-transfer', 'ai-plan'];
  if (designerKeys.some(key => query.has(key)) || callbackKeys.some(key => hash.has(key))) {
    location.replace('/index.html' + location.search + location.hash);
  }
})();
