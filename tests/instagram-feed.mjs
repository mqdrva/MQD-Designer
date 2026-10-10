import assert from 'node:assert/strict';
const originalFetch = globalThis.fetch;
const originalToken = process.env.MQD_INSTAGRAM_ACCESS_TOKEN;
let serial = 0;
async function handler() { return (await import('../api/instagram-feed.js?test=' + serial++)).default; }
async function request(handle, method = 'GET') {
  const headers = {};
  let body;
  const res = { setHeader: (name, value) => { headers[name] = value; }, end: value => { body = value; } };
  await handle({ method }, res);
  return { status: res.statusCode, headers, body, json: JSON.parse(body) };
}
try {
  delete process.env.MQD_INSTAGRAM_ACCESS_TOKEN;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('Must not call Instagram without credentials'); };
  const disconnected = await request(await handler());
  assert.equal(disconnected.status, 200);
  assert.deepEqual(disconnected.json.posts, []);
  assert.equal(calls, 0);
  assert.equal((await request(await handler(), 'POST')).status, 405);

  const token = 'server-only-test-token';
  process.env.MQD_INSTAGRAM_ACCESS_TOKEN = token;
  const media = [
    { id: '1', caption: '<script>alert(1)</script>', media_type: 'IMAGE', media_url: 'https://scontent.cdninstagram.com/photo.jpg', permalink: 'https://www.instagram.com/p/photo/', timestamp: '2026-10-01T12:00:00Z', private_field: token },
    { id: '2', media_type: 'VIDEO', media_url: 'https://scontent.cdninstagram.com/video.mp4', thumbnail_url: 'https://scontent.fbcdn.net/reel.jpg', permalink: 'https://www.instagram.com/reel/video/', timestamp: '2026-10-02T12:00:00Z' },
    { id: '3', media_type: 'CAROUSEL_ALBUM', children: { data: [{ media_type: 'IMAGE', media_url: 'https://scontent.cdninstagram.com/carousel.jpg' }] }, permalink: 'https://www.instagram.com/p/carousel/', timestamp: '2026-10-03T12:00:00Z' },
    { id: '4', media_type: 'IMAGE', permalink: 'https://www.instagram.com/p/noimage/', timestamp: 'bad date' },
    { id: '5', permalink: 'javascript:alert(1)', media_url: 'https://evil.example/tracking.jpg' },
    { id: '6', permalink: 'https://instagram.com.evil.example/p/phishing/' },
    { id: '7', permalink: 'https://www.instagram.com/p/unsafeimage/', media_url: 'http://scontent.cdninstagram.com/p.jpg' }
  ];
  calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(options.headers.Authorization, 'Bearer ' + token);
    assert.equal(new URL(url).hostname, 'graph.instagram.com');
    assert(!String(url).includes(token));
    return { ok: true, json: async () => new URL(url).pathname === '/me' ? { username: 'mqdllc' } : { data: media, paging: { next: 'https://untrusted.example/?token=' + token } } };
  };
  const connected = await handler();
  const [first, second] = await Promise.all([request(connected), request(connected)]);
  assert.equal(calls, 2, 'Concurrent feed requests share the same upstream load');
  assert.equal(first.json.posts.length, 5);
  assert.equal(first.json.posts[0].id, '3');
  assert.equal(first.json.posts.find(p => p.id === '2').imageUrl, 'https://scontent.fbcdn.net/reel.jpg');
  assert.equal(first.json.posts.find(p => p.id === '3').imageUrl, 'https://scontent.cdninstagram.com/carousel.jpg');
  assert.equal(first.json.posts.find(p => p.id === '4').imageUrl, '');
  assert.equal(first.json.posts.find(p => p.id === '7').imageUrl, '');
  assert(!first.body.includes(token));
  assert(!first.body.includes('paging'));
  assert.deepEqual(first.json, second.json);
  await request(connected);
  assert.equal(calls, 2, 'The short cache prevents a Meta request per visitor');

  calls = 0;
  globalThis.fetch = async () => { calls++; return { ok: true, json: async () => ({ username: 'another-business' }) }; };
  const mismatch = await request(await handler());
  assert.deepEqual(mismatch.json.posts, []);
  assert.equal(calls, 1, 'Other account media is never fetched');
  assert(!mismatch.body.includes('another-business'));

  for (const fail of [
    async () => { throw new Error(token); },
    async () => ({ ok: false, json: async () => ({ error: { message: token } }) })
  ]) {
    globalThis.fetch = fail;
    const unavailable = await request(await handler());
    assert.deepEqual(unavailable.json.posts, []);
    assert(!unavailable.body.includes(token));
    assert.equal(unavailable.json.profileUrl, 'https://www.instagram.com/mqdllc/');
  }
  console.log('PASS: Instagram identity, photos, Reel thumbnails, carousels, safe links, token privacy, caching, missing connection and upstream failures.');
} finally {
  globalThis.fetch = originalFetch;
  if (originalToken === undefined) delete process.env.MQD_INSTAGRAM_ACCESS_TOKEN;
  else process.env.MQD_INSTAGRAM_ACCESS_TOKEN = originalToken;
}
