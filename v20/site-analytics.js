(function () {
  const trackedPurchases = new Set();

  function cleanData(data) {
    const out = {};
    Object.entries(data || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        out[key] = value;
      }
    });
    return out;
  }

  function track(name, data) {
    const payload = cleanData(data);
    try {
      if (typeof window.va === 'function') {
        window.va('event', { name, data: payload });
      }
    } catch (_) {}

    // Automatically forwards the same event to GA4 later if a Google tag is added.
    try {
      if (typeof window.gtag === 'function') {
        const gaNames = {
          'Garment Selected': 'select_item',
          'Add To Cart Clicked': 'add_to_cart',
          'Begin Checkout': 'begin_checkout',
          'Purchase Confirmed': 'purchase'
        };
        const gaName = gaNames[name] || String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        window.gtag('event', gaName, payload);
      }
    } catch (_) {}
  }

  function selectedProduct() {
    const select = document.getElementById('productSelect');
    if (!select) return '';
    const option = select.options && select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null;
    return (option && option.textContent ? option.textContent : select.value || '').trim();
  }

  function bindClick(id, name, extra) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', function () {
      const base = typeof extra === 'function' ? extra() : (extra || {});
      track(name, base);
    });
  }

  function parseMoney(text) {
    const value = Number(String(text || '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(value) ? value : undefined;
  }

  function watchPurchaseConfirmation() {
    const status = document.getElementById('paymentStatus');
    if (!status) return;

    const check = function () {
      if (!/paid/i.test(status.textContent || '')) return;
      const sessionId = new URLSearchParams(window.location.search).get('session_id') || 'confirmed';
      let alreadyTracked = trackedPurchases.has(sessionId);
      try {
        alreadyTracked = alreadyTracked || sessionStorage.getItem('mqd-analytics-purchase') === sessionId;
      } catch (_) {}
      if (alreadyTracked) return;
      trackedPurchases.add(sessionId);
      try {
        sessionStorage.setItem('mqd-analytics-purchase', sessionId);
      } catch (_) {}

      const product = (document.getElementById('productName')?.textContent || '').trim();
      const amount = parseMoney(document.getElementById('amount')?.textContent);
      const sandboxBadge = document.getElementById('sandboxBadge');
      const isTest = Boolean(sandboxBadge && !sandboxBadge.hidden);
      track(isTest ? 'Test Purchase Confirmed' : 'Purchase Confirmed', {
        product,
        amount,
        currency: 'USD'
      });
    };

    check();
    new MutationObserver(check).observe(status, { childList: true, subtree: true, characterData: true });
  }

  function init() {
    const productSelect = document.getElementById('productSelect');
    if (productSelect) {
      productSelect.addEventListener('change', function () {
        track('Garment Selected', { product: selectedProduct() });
      });
    }

    const upload = document.getElementById('artUpload');
    if (upload) {
      upload.addEventListener('change', function () {
        if (!upload.files || !upload.files.length) return;
        track('Artwork Uploaded', {
          product: selectedProduct(),
          fileCount: upload.files.length
        });
      });
    }

    bindClick('saveDraft', 'Design Save Clicked', () => ({ product: selectedProduct() }));
    bindClick('addToCart', 'Add To Cart Clicked', () => ({ product: selectedProduct() }));
    bindClick('cartButton', 'Cart Opened');
    bindClick('checkoutCart', 'Begin Checkout');
    bindClick('openArtworkLibrary', 'Artwork Library Opened', () => ({ product: selectedProduct() }));
    bindClick('downloadMockup', 'Mockup Downloaded', () => ({ product: selectedProduct() }));
    bindClick('saveScreenshot', '3D Screenshot Saved', () => ({ product: selectedProduct() }));
    bindClick('shareScreenshot', '3D Screenshot Shared', () => ({ product: selectedProduct() }));
    bindClick('accountButton', 'Sign In Opened');
    bindClick('googleSignInButton', 'Google Sign In Clicked');
    bindClick('emailSignInButton', 'Email Sign In Clicked');
    bindClick('guestSignInButton', 'Guest Continue Clicked');

    document.addEventListener('click', function (event) {
      const button = event.target && event.target.closest ? event.target.closest('button') : null;
      if (!button) return;
      const label = (button.textContent || '').replace(/\s+/g, ' ').trim();
      if (/remove background/i.test(label)) {
        track('Remove Background Clicked', { product: selectedProduct() });
      }
    }, true);

    watchPurchaseConfirmation();
  }

  window.mqdAnalytics = { track };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
