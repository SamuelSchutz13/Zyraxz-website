// Writes assets/data/github.json for the site: stars, last push per repo,
// recent commits and the contributions calendar. Run by the deploy workflow.
import { mkdir, writeFile } from 'node:fs/promises';

const user = 'SamuelSchutz13';
const hidden = ['REST-API-Test', 'Blog.ts-backend', 'eCommerce-Backend', 'ai-job-search', user];
const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'portfolio-data' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const json = async url => {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};

const repos = (await json(`https://api.github.com/users/${user}/repos?sort=pushed&per_page=100`))
  .filter(r => !r.fork && !hidden.includes(r.name));

const per = await Promise.all(repos.slice(0, 4).map(r =>
  json(`https://api.github.com/repos/${user}/${r.name}/commits?per_page=5`).then(cs => cs.map(c => ({
    repo: r.name, avatar: c.author?.avatar_url, msg: c.commit.message.split('\n')[0],
    date: c.commit.author.date, url: c.html_url,
  })))));

// the contributions calendar has no REST endpoint; GitHub serves it as an HTML fragment
const contributions = await fetch(`https://github.com/users/${user}/contributions`, { headers: { 'User-Agent': 'portfolio-data' } })
  .then(r => r.ok ? r.text() : '')
  .then(html => {
    // each day cell has an id; its tooltip ("5 contributions on …") points back to it with for="<id>"
    const tips = Object.fromEntries([...html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([^<]*)/g)].map(([, id, text]) => [id, text]));
    const days = [...html.matchAll(/<td\b[^>]*>/g)].map(([td]) => {
      const d = td.match(/data-date="(\d{4}-\d{2}-\d{2})"/)?.[1];
      if (!d) return null;
      const id = td.match(/\bid="([^"]+)"/)?.[1];
      return { d, l: Number(td.match(/data-level="(\d)"/)?.[1] ?? 0), c: Number(tips[id]?.match(/^(\d+)/)?.[1] ?? 0) };
    }).filter(Boolean).sort((a, b) => a.d.localeCompare(b.d));
    const total = Number(html.match(/([\d,]+)\s+contributions?\s+in the last year/)?.[1].replace(/,/g, '') ?? days.reduce((n, x) => n + x.c, 0));
    return { total, days };
  })
  .catch(() => ({ total: 0, days: [] }));

// last song played on Spotify; only when the three SPOTIFY_* secrets are set (see spotify-auth.mjs)
const spotify = await (async () => {
  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret, SPOTIFY_REFRESH_TOKEN: refresh } = process.env;
  if (!id || !secret || !refresh) return null;
  const auth = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
  }).then(r => r.json());
  const res = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', { headers: { Authorization: `Bearer ${auth.access_token}` } });
  const item = res.ok ? (await res.json()).items?.[0] : null;
  if (!item) return null;
  const { track } = item;
  return {
    track: track.name, artist: track.artists.map(a => a.name).join(', '),
    image: track.album.images.at(-1)?.url, url: track.external_urls.spotify, played: item.played_at,
  };
})().catch(() => null);

const data = {
  spotify,
  t: Date.now(),
  stars: Object.fromEntries(repos.map(r => [r.name, r.stargazers_count])),
  pushed: Object.fromEntries(repos.map(r => [r.name, r.pushed_at])),
  commits: per.flat().filter(c => !c.msg.startsWith('Merge')).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7),
  contributions,
};

await mkdir('assets/data', { recursive: true });
await writeFile('assets/data/github.json', JSON.stringify(data));
console.log(`repos ${repos.length}, commits ${data.commits.length}, contribution days ${contributions.days.length}, total ${contributions.total}`);
