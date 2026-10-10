# MQD Instagram homepage feed

The homepage section lives in `custom-apparel.html`. Its browser script waits until the section is near the viewport before requesting `GET /api/instagram-feed`. The server verifies the connected account is **mqdllc**, reads the latest six media entries, and returns only public display fields. Photos and carousel covers appear as images; videos use their thumbnail with a link to watch on Instagram. No access token is sent to visitors.

## Connection required

Use the **Instagram API with Instagram Login** for the owner-operated Business/Creator account. This is not the retired Basic Display API. Open the existing Meta developer app if it supports this use case; otherwise configure an Instagram app for the account. Request only `instagram_business_basic` for reading the feed, not messaging or publishing permissions.

In Meta's Instagram API setup with Instagram login, add/authorize **@mqdllc** and obtain its Instagram User access token. Store the long-lived token directly in the **mqd-designer-vercel** project's Vercel environment variables, production scope, as a Secret:

- `MQD_INSTAGRAM_ACCESS_TOKEN`

Do not paste the token into chat, commit it to the repository, or put it into page source. Redeploy the same project after adding it. The backend uses `graph.instagram.com/me` to verify the account and `graph.instagram.com/me/media` for the feed. It does not accept a client-supplied account or token.

Long-lived Instagram tokens expire (normally around 60 days) and require renewal before expiry. Token renewal and durable credential storage must be finalized as part of account connection; this initial website implementation does **not** claim automatic token renewal. A generated dashboard token may have different expiry; check its actual expiry before activation. If using a short-lived token first for validation, replace it with a long-lived token before calling the feed connected.

## Behavior and verification

- Successful feeds are cached for ten minutes. New posts appear after the next refresh, not instantly after publishing.
- If unconfigured, empty, disconnected, or temporarily unavailable, the existing Instagram profile card remains visible with a working link. No fake customer images or frozen sample posts are shown.
- Deleted/revoked media is not kept indefinitely through a stale cache.
- Instagram links and CDN image URLs are validated on both server and browser. Captions render as text.
- Verify `/api/instagram-feed` contains up to six real posts for mqdllc, and that photos, carousel previews, video links, mobile layout, empty feed, and disconnection behave correctly.
- Verify after the connection: refresh the homepage, click a post, and confirm its destination is the original MQD Instagram media.
- Local backend checks: `node tests/instagram-feed.mjs`.
