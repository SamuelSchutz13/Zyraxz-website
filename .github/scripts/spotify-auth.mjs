// One-time helper to get a Spotify refresh token for the "last listened to" card.
// Run locally (never in CI):
//   SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... node .github/scripts/spotify-auth.mjs
// The Spotify app must list http://127.0.0.1:8888/callback as a redirect URI.
import { createServer } from 'node:http';

const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env;
if (!id || !secret) throw new Error('Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET first.');
const redirect = 'http://127.0.0.1:8888/callback';

const server = createServer(async (req, res) => {
  const code = new URL(req.url, redirect).searchParams.get('code');
  if (!code) return res.end('Missing code.');
  const tokens = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirect }),
  }).then(r => r.json());
  res.end(tokens.refresh_token ? 'Done! Go back to the terminal.' : 'Something went wrong, check the terminal.');
  console.log(tokens.refresh_token ? `\nSPOTIFY_REFRESH_TOKEN=${tokens.refresh_token}\n` : tokens);
  server.close();
}).listen(8888, '127.0.0.1');

const auth = new URL('https://accounts.spotify.com/authorize');
auth.search = new URLSearchParams({ client_id: id, response_type: 'code', redirect_uri: redirect, scope: 'user-read-recently-played' });
console.log(`Open this link, log in and accept:\n\n${auth}\n`);
