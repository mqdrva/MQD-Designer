(function () {
  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };
  window.si = window.si || function () {
    (window.siq = window.siq || []).push(arguments);
  };

  window.va('beforeSend', function (event) {
    try {
      const url = new URL(event.url, window.location.origin);
      const privatePaths = new Set([
        '/owner-orders.html',
        '/owner-backup.html',
        '/library-admin.html'
      ]);
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
