# Dallas browser broadcaster

## 1. Configure privately

Use the existing Next.js deployment for curtisroadtrip.com. No new Cloudflare input or Cloudflare API token is needed. Do not change the Poinsettia Mine input.

In Supabase Authentication → Users, create a dedicated Dallas host with a strong unique password and confirmed email. Do not add this user to app_admins. Copy its user UUID. Supabase handles password verification and authentication rate limits; keep those enabled, and disable public sign-ups if they are not needed.

Set these only in .env.local for local testing and in the hosting provider's server environment settings for deployment:

- HALLOWEEN_DALLAS_HOST_IDS: the host UUID (comma-separated if more than one).
- HALLOWEEN_DALLAS_WHIP_URL: the existing Dallas input's complete WebRTC Broadcast URL, ending in /webRTC/publish.
- SUPABASE_SERVICE_ROLE_KEY: the existing server-only Supabase credential used by the website. The broadcaster derives its session encryption key from this credential, so no separate session secret is required. Never use the public publishable/anon key here.
- HALLOWEEN_SESSION_SECRET (optional): at least 32 random characters if you prefer a separate key. When set, it takes precedence over the Supabase server credential. Changing either active key invalidates outstanding cleanup tokens.
- Existing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or ANON_KEY).

Never prefix the publish URL or signing secret with NEXT_PUBLIC_. Never paste secrets into chat, source control, screenshots, or browser URLs. If the old host prototype has been used, rotate the Dallas publishing credential in Cloudflare because that implementation sent it to the browser; update the server setting afterward.

Legacy party passwords now require at least 16 characters and have no defaults. Set HALLOWEEN_ADMIN_PASSWORD if you still use the existing party admin screen. The Dallas broadcaster uses Supabase instead of these shared passwords.

## 2. Local acceptance test

Run npm run dev and open http://localhost:3000/halloween/dallas.

1. In a private browser window, verify only sign-in is visible. POST /api/halloween/dallas without an authenticated session must return 403. The old /api/halloween action broadcast must return 410 and no URL.
2. Sign in with an unlisted test account. It must be denied. Sign in with the dedicated host; it must show the booth and must not grant website admin access.
3. Click Preview camera & mic and allow both permissions. Verify the preview appears and says you are not live. The Cloudflare input should still be idle. Preview sound is intentionally muted locally.
4. Click Go Live. Verify the status becomes LIVE only after the peer connects. Use the existing Dallas playback URL on a second device with headphones to verify moving video and audible speech. Confirm the Poinsettia Mine OBS stream continues normally.
5. Mute and unmute the microphone; confirm playback audio follows. Stop; verify camera/mic indicators turn off and playback ends. Start again, then reload/close the page and verify transmission ends.
6. Preview once to discover device labels, stop, select another camera or microphone, preview again, and go live.
7. Deny permissions, unplug a device, temporarily disconnect the network, and try an incorrect Dallas URL on the local server. Verify useful errors, no false LIVE status, and that Stop remains available while connecting. Restore configuration afterward.
8. Inspect browser network responses and page source: no permanent Cloudflare publish URL or account credential should appear. POST returns SDP and an encrypted, user-bound cleanup token; DELETE uses that opaque token. A cross-origin POST/DELETE must fail. Expired, altered, or another user's cleanup token must fail.

## 3. Deploy and rehearse

Run npm run typecheck, npm run lint, and npm run build. Deploy through the site's normal workflow after setting the server environment variables. Open https://curtisroadtrip.com/halloween/dallas and repeat the tests from Dallas on the actual camera, microphone, and network. The old /halloweenparty/host link redirects here. Share only the booth URL and the dedicated host's login privately.

## Design and limits

The server forwards SDP signaling to the fixed, validated Dallas Cloudflare endpoint. Media travels directly between the browser and Cloudflare. No permanent publish credential is returned. Upstream redirects, headers, and error bodies are never forwarded. Cleanup locations are encrypted with AES-GCM, bound to the authenticated user, and expire after 12 hours. POST and DELETE check both authentication/allowlist and same-origin requests. Offers are size-limited, and upstream calls time out. The browser gathers ICE candidates before posting, so no trickle PATCH proxy is needed.

Stop closes the local peer and camera immediately, then requests remote session deletion. Closing a browser is best-effort remote cleanup; loss of its media connection ends transmission even if that request fails. This implementation does not enforce a distributed single-host lock: coordinate one active Dallas broadcaster at a time. It does not automatically reconnect or promise successful traversal on restrictive networks; rehearse from the Dallas network. Removing a UUID prevents future signaling but does not forcibly disconnect a peer already sending media; terminate that broadcast in Cloudflare if immediate revocation is necessary. Cloudflare end-to-end camera testing requires real credentials and hardware and cannot be established by a successful build alone.

Reference: https://developers.cloudflare.com/stream/examples/browser-based-webrtc/
