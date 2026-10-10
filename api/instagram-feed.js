const PROFILE_URL = 'https://www.instagram.com/mqdllc/';
const USERNAME = 'mqdllc';
const CACHE_MS = 10 * 60 * 1000;
const RETRY_MS = 60 * 1000;
let cached = null;
let cachedUntil = 0;
let pending = null;

function instagramLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['instagram.com', 'www.instagram.com'].includes(url.hostname) && /\/(p|reel|tv)\/[\w-]+\/?$/.test(url.pathname) ? url.href : '';
  } catch { return ''; }
}

function imageLink(value) {
  try {
    const url = new URL(value);
    const host = url.hostname;
    return url.protocol === 'https:' && (host.endsWith('.cdninstagram.com') || host.endsWith('.fbcdn.net')) ? url.href : '';
  } catch { return ''; }
}

async function graph(path, fields, token) {
  const url = new URL('https://graph.instagram.com/' + path);
  url.searchParams.set('fields', fields);
  if (path.endsWith('/media')) url.searchParams.set('limit', '6');
  const response = await fetch(url, {
    headers: { Authorization: 'Bearer ' + token },
    signal: AbortSignal.timeout(4500),
    redirect: 'error'
  });
  if (!response.ok) throw new Error('Instagram unavailable');
  const data = await response.json();
  if (data.error) throw new Error('Instagram unavailable');
  return data;
}

async function loadFeed(token) {
  // Verify identity before exposing media from a configured credential.
  const account = await graph('me', 'username', token);
  if (String(account.username || '').toLowerCase() !== USERNAME) throw new Error('Instagram account mismatch');
  const media = await graph('me/media', 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}', token);
  if (!Array.isArray(media.data)) throw new Error('Invalid Instagram response');
  const posts = media.data.map(item => {
    const permalink = instagramLink(item.permalink);
    if (!permalink) return null;
    const video = item.media_type === 'VIDEO';
    const first = item.children?.data?.[0];
    const preview = video ? item.thumbnail_url : item.media_url;
    const childPreview = first?.media_type === 'VIDEO' ? first.thumbnail_url : first?.media_url;
    return {
      id: String(item.id || '').slice(0, 80),
      caption: String(item.caption || '').slice(0, 500),
      imageUrl: imageLink(preview) || imageLink(childPreview),
      permalink,
      mediaType: video ? 'VIDEO' : item.media_type === 'CAROUSEL_ALBUM' ? 'CAROUSEL_ALBUM' : 'IMAGE',
      timestamp: Number.isFinite(Date.parse(item.timestamp)) ? new Date(item.timestamp).toISOString() : null
    };
  }).filter(Boolean).sort((a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0)).slice(0, 6);
  return { profileUrl: PROFILE_URL, username: USERNAME, posts };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.setHeader('Cache-Control', 'no-store');
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
  const token = process.env.MQD_INSTAGRAM_ACCESS_TOKEN;
  let payload;
  if (!token) {
    payload = { profileUrl: PROFILE_URL, username: USERNAME, posts: [] };
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
  } else {
    if (Date.now() >= cachedUntil) {
      if (!pending) {
        pending = loadFeed(token).then(data => {
          cached = data;
          cachedUntil = Date.now() + CACHE_MS;
        }).catch(() => {
          // No token, upstream error text or account details leave this endpoint.
          // Do not keep deleted/revoked media public through an unlimited stale cache.
          cached = null;
          cachedUntil = Date.now() + RETRY_MS;
        }).finally(() => { pending = null; });
      }
      await pending;
    }
    payload = cached || { profileUrl: PROFILE_URL, username: USERNAME, posts: [] };
    res.setHeader('Cache-Control', cached ? 'public, max-age=0, s-maxage=600' : 'public, max-age=0, s-maxage=60');
  }
  res.statusCode = 200;
  res.end(JSON.stringify(payload));
}
