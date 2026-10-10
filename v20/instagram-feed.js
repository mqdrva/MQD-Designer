(() => {
  const section = document.getElementById('instagramFeed');
  const grid = document.getElementById('instagramGrid');
  const fallback = document.getElementById('instagramFallback');
  if (!section || !grid || !fallback) return;

  function validLink(value, image = false) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') return '';
      const host = url.hostname;
      return (image ? host.endsWith('.cdninstagram.com') || host.endsWith('.fbcdn.net') : ['www.instagram.com', 'instagram.com'].includes(host) && /\/(p|reel|tv)\/[\w-]+\/?$/.test(url.pathname)) ? url.href : '';
    } catch { return ''; }
  }

  async function load() {
    try {
      const response = await fetch('/api/instagram-feed', { signal: AbortSignal.timeout(11000) });
      if (!response.ok) return;
      const feed = await response.json();
      if (feed.username !== 'mqdllc' || !Array.isArray(feed.posts)) return;
      const cards = [];
      for (const post of feed.posts.slice(0, 6)) {
        const href = validLink(post.permalink);
        if (!href) continue;
        const link = document.createElement('a');
        link.className = 'instagram-post';
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', (post.caption || 'MQD custom apparel') + ' — view on Instagram');
        const media = document.createElement('div');
        media.className = 'instagram-post-media';
        const imageUrl = validLink(post.imageUrl, true);
        if (imageUrl) {
          const img = document.createElement('img');
          img.src = imageUrl;
          img.alt = String(post.caption || 'Custom apparel from @mqdllc').slice(0, 180);
          img.loading = 'lazy';
          img.decoding = 'async';
          img.width = 600;
          img.height = 600;
          img.addEventListener('error', () => { img.remove(); media.classList.add('instagram-post-no-image'); }, { once: true });
          media.append(img);
        } else media.classList.add('instagram-post-no-image');
        const label = document.createElement('span');
        label.className = 'instagram-post-label';
        label.textContent = post.mediaType === 'VIDEO' ? 'Watch on Instagram ↗' : 'View on Instagram ↗';
        media.append(label);
        const caption = document.createElement('p');
        caption.textContent = String(post.caption || 'Custom apparel by MQD').slice(0, 160);
        link.append(media, caption);
        cards.push(link);
      }
      if (cards.length) {
        grid.replaceChildren(...cards);
        grid.hidden = false;
        fallback.hidden = true;
      }
    } catch {
      // The Instagram link remains usable if Instagram or the connection is unavailable.
    }
  }
  section.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (link) window.mqdAnalytics?.track('Instagram Clicked', { source: 'homepage', kind: link.classList.contains('instagram-post') ? 'post' : 'profile' });
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); void load(); }
    }, { rootMargin: '250px' });
    observer.observe(section);
  } else void load();
})();
