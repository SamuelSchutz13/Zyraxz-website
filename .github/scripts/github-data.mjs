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

// bytes of code per language, summed over every listed repository
const languages = Object.entries((await Promise.all(repos.map(r => json(r.languages_url).catch(() => ({})))))
  .reduce((sum, langs) => { for (const [k, v] of Object.entries(langs)) sum[k] = (sum[k] || 0) + v; return sum; }, {}))
  .map(([name, bytes]) => ({ name, bytes })).sort((a, b) => b.bytes - a.bytes);

const data = {
  languages,
  t: Date.now(),
  stars: Object.fromEntries(repos.map(r => [r.name, r.stargazers_count])),
  pushed: Object.fromEntries(repos.map(r => [r.name, r.pushed_at])),
  commits: per.flat().filter(c => !c.msg.startsWith('Merge')).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7),
  contributions,
};

await mkdir('assets/data', { recursive: true });
await writeFile('assets/data/github.json', JSON.stringify(data));
console.log(`repos ${repos.length}, commits ${data.commits.length}, contribution days ${contributions.days.length}, total ${contributions.total}`);
