// Add more .customer-video-player elements to the homepage to extend the gallery.
const videos = document.querySelectorAll('[data-video-src]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function loadVideo(video) {
  if (video.dataset.loaded) return;
  video.dataset.loaded = 'true';
  video.muted = true;
  video.defaultMuted = true;
  if (reduceMotion) video.removeAttribute('autoplay');
  video.src = video.dataset.videoSrc;
  video.load();
  // Mobile power/data-saving settings may require pressing the visible Play control.
  if (!reduceMotion) video.play().catch(() => {});
}

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      loadVideo(entry.target);
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '200px 0px' });
  videos.forEach(video => observer.observe(video));
} else {
  videos.forEach(loadVideo);
}
