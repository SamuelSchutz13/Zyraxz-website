// Stars and recent commits, live from the public GitHub API.
// Cached for 15 min so repeat visits don't burn the 60 req/h anonymous limit.
const user = 'SamuelSchutz13';
const hidden = ['REST-API-Test', 'Blog.ts-backend', 'eCommerce-Backend', 'ai-job-search', user];
const html = document.documentElement;
const base = document.querySelector('script[src$="github.js"]').src.replace(/js\/github\.js$/, '');

const load = async () => {
  // on the published site an hourly GitHub Action writes this file, so visitors never hit the API limit
  try {
    const res = await fetch(base + 'data/github.json', { cache: 'no-cache' });
    if (res.ok) return await res.json();
  } catch {} // opened from disk (file://) or not published yet: fall back to the API

  let cache; try { cache = JSON.parse(localStorage.getItem('github')); } catch {}
  if (cache && Date.now() - cache.t < 15 * 60000) return cache;
  const json = url => fetch(url).then(r => { if (!r.ok) throw r.status; return r.json(); });
  try {
    const repos = (await json(`https://api.github.com/users/${user}/repos?sort=pushed&per_page=100`))
      .filter(r => !r.fork && !hidden.includes(r.name));
    const stars = Object.fromEntries(repos.map(r => [r.name, r.stargazers_count]));
    const pushed = Object.fromEntries(repos.map(r => [r.name, r.pushed_at]));
    const per = await Promise.all(repos.slice(0, 4).map(r =>
      json(`https://api.github.com/repos/${user}/${r.name}/commits?per_page=5`).then(cs => cs.map(c => ({
        repo: r.name, avatar: c.author?.avatar_url, msg: c.commit.message.split('\n')[0],
        date: c.commit.author.date, url: c.html_url,
      })))));
    const commits = per.flat().filter(c => !c.msg.startsWith('Merge'))
      .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
    const data = { t: Date.now(), stars, pushed, commits };
    try { localStorage.setItem('github', JSON.stringify(data)); } catch {}
    return data;
  } catch {
    return cache; // stale is better than nothing
  }
};

const ago = d => {
  const m = Math.round((Date.now() - new Date(d)) / 60000);
  const f = new Intl.RelativeTimeFormat(html.lang, { numeric: 'auto' });
  return m < 60 ? f.format(-m, 'minute') : m < 1440 ? f.format(-Math.round(m / 60), 'hour') : f.format(-Math.round(m / 1440), 'day');
};

const renderCommits = (list, commits) => {
  const logos = Object.fromEntries([...document.querySelectorAll('[data-repo]')]
    .map(el => [el.dataset.repo, el.querySelector('.logo-p')?.src]).filter(x => x[1]));
  list.replaceChildren(...commits.map(c => {
    const li = document.createElement('li'), a = document.createElement('a');
    const msg = document.createElement('span'), meta = document.createElement('span'), av = new Image(36, 36);
    av.className = 'av'; av.src = c.avatar || base + 'img/avatar.png'; av.alt = '';
    a.href = c.url; msg.className = 'msg'; meta.className = 'meta';
    msg.textContent = c.msg;
    if (logos[c.repo]) { const lg = new Image(16, 16); lg.src = logos[c.repo]; lg.alt = ''; meta.append(lg); }
    meta.append(`${c.repo} · ${ago(c.date)}`);
    a.append(msg, meta); li.append(av, a); return li;
  }));
};

(async () => {
  const data = await load();
  const list = document.getElementById('commits');

  document.querySelectorAll('.stars[data-repo]').forEach(el => {
    const n = data?.stars[el.dataset.repo];
    if (n !== undefined) { el.querySelector('b').textContent = n; el.hidden = false; }
  });

  // the two most recently pushed projects go to "Recent", the rest to "Projects", newest first
  const recent = document.getElementById('recent-grid'), all = document.getElementById('all-grid');
  if (recent && all) {
    const cards = [...document.querySelectorAll('#recent-grid > .card, #all-grid > .card')];
    cards.forEach(c => { if (data?.pushed?.[c.dataset.repo]) c.dataset.pushed = data.pushed[c.dataset.repo]; });
    cards.sort((a, b) => b.dataset.pushed.localeCompare(a.dataset.pushed));
    recent.replaceChildren(...cards.slice(0, 2));
    all.replaceChildren(...cards.slice(2));
  }

  // contributions calendar: only in the Action's file (it needs a server to fetch)
  const contrib = document.getElementById('contrib');
  if (contrib && data?.contributions?.days?.length) {
    const { total, days } = data.contributions;
    const pad = new Date(days[0].d + 'T00:00:00').getDay(); // weeks start on Sunday, like GitHub
    const cells = [...Array(pad)].map(() => '<i style="visibility:hidden"></i>');
    days.forEach(day => cells.push(`<i data-l="${day.l}" title="${day.d}: ${day.c}"></i>`));
    document.getElementById('contrib-grid').innerHTML = cells.join('');
    document.getElementById('contrib-total').textContent = `· ${total}`;
    contrib.hidden = false;
  }

  if (!list) return;
  if (data?.commits.length) {
    renderCommits(list, data.commits);
    document.addEventListener('langchange', () => renderCommits(list, data.commits));
  } else {
    list.innerHTML = `<li class="muted fail"><span lang="pt">Não deu para carregar agora.</span><span lang="en">Couldn't load right now.</span> <a href="https://github.com/${user}"><span lang="pt">Ver no GitHub</span><span lang="en">See on GitHub</span></a></li>`;
  }
})();
