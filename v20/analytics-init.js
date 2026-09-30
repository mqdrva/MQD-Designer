(function () {
  const GA_MEASUREMENT_ID = 'G-BMFG2BB9VS';
  const privatePaths = new Set([
    '/owner-orders.html',
    '/owner-backup.html',
    '/library-admin.html'
  ]);
  let isPrivatePage = false;
  try {
    const current = new URL(window.location.href);
    isPrivatePage = privatePaths.has(current.pathname) || current.searchParams.get('owner') === '1';
  } catch (_) {}

  if (!isPrivatePage) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID);

    const googleTag = document.createElement('script');
    googleTag.async = true;
    googleTag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
    document.head.appendChild(googleTag);
  }

  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };
  window.si = window.si || function () {
    (window.siq = window.siq || []).push(arguments);
  };

  window.va('beforeSend', function (event) {
    try {
      const url = new URL(event.url, window.location.origin);
      if (privatePaths.has(url.pathname) || url.searchParams.get('owner') === '1') {
        return null;
      }
      url.search = '';
      url.hash = '';
      return Object.assign({}, event, { url: url.toString() });
    } catch (_) {
      return event;
    }
  });
})();