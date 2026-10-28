// Stars and recent commits, live from the public GitHub API.
// Cached for 15 min so repeat visits don't burn the 60 req/h anonymous limit.
const user = 'SamuelSchutz13';
const hidden = ['REST-API-Test', 'Blog.ts-backend', 'eCommerce-Backend', 'ai-job-search', user];
const html = document.documentElement;
const base = document.querySelector('script[src*="js/github.js"]').src.replace(/js\/github\.js.*$/, ''); // src carries ?v=<hash>

// display name and icon of each repo, for the commit list and the status card
const apps = {
  TitanLive: ['TitanLive', 'img/logos/titanlive.svg'], Restyx: ['Restyx', 'img/logos/restyx.svg'],
  Gityx: ['Gityx', 'img/logos/gityx.svg'], 'Match-Sim': ['MatchSim', 'img/logos/matchsim.svg'],
  FoculessPDF: ['FoculessPDF', 'img/logos/foculesspdf.svg'], FoculessYT: ['FoculessYT', 'img/logos/foculessyt.svg'],
  FoculessPad: ['FoculessPad', 'img/logos/foculesspad.svg'], 'AHK-SpotifyControl': ['Spotify Control', 'img/icons/spotify.svg'],
  'Zyraxz-website': ['Zyraxz', 'img/logos/zyraxz.svg'], 'Youtube-Ultrawide': ['YouTube Ultrawide', 'img/icons/youtube.svg'],
  'PES21-UltrawideFix': ['PES 2021 Ultrawide', 'img/icons/lua.svg'],
};
const app = repo => {
  const [name, logo] = apps[repo] || [repo, null];
  const icon = document.createElement('img');
  icon.className = 'app-ic'; icon.width = icon.height = 16; icon.alt = '';
  icon.src = logo ? base + logo : base + 'img/icons/github-white.svg';
  return { name, icon };
};

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

const ago = (d, locale = html.lang) => {
  const m = Math.round((Date.now() - new Date(d)) / 60000);
  const f = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  return m < 60 ? f.format(-m, 'minute') : m < 1440 ? f.format(-Math.round(m / 60), 'hour') : f.format(-Math.round(m / 1440), 'day');
};

const renderCommits = (list, commits) => {
  list.replaceChildren(...commits.map(c => {
    const li = document.createElement('li'), a = document.createElement('a');
    const msg = document.createElement('span'), meta = document.createElement('span'), av = new Image(36, 36);
    av.className = 'av'; av.src = c.avatar || base + 'img/avatar.png'; av.alt = '';
    a.href = c.url; msg.className = 'msg'; meta.className = 'meta';
    msg.textContent = c.msg;
    const { name, icon } = app(c.repo);
    meta.append(icon, `${name} · ${ago(c.date)}`);
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

  // hover card on the name: "online" = committed in the last 24 h (data refreshes hourly)
  const last = data?.commits?.[0];
  if (last) {
    const on = Date.now() - new Date(last.date) < 24 * 36e5;
    document.querySelectorAll('.who .dot').forEach(d => { d.hidden = false; d.classList.toggle('on', on); });
    const status = document.querySelector('.status');
    const { name, icon } = app(last.repo);
    const where = document.createElement('a');
    where.className = 'status-app'; where.href = last.url; where.append(icon, name);
    status.querySelector('.status-text').innerHTML =
      `<span lang="pt">${on ? 'Online · último' : 'Último'} commit ${ago(last.date, 'pt-BR')} em</span>` +
      `<span lang="en">${on ? 'Online · last' : 'Last'} commit ${ago(last.date, 'en')} in</span> `;
    status.querySelector('.status-text').append(where);
    status.hidden = false;
    document.querySelector('.who-empty').hidden = true;
  }

  // languages bar: only in the Action's file (it needs one request per repository)
  const langs = document.getElementById('langs');
  if (langs && data?.languages?.length) {
    const colors = { TypeScript: '#3178c6', JavaScript: '#f1e05a', Vue: '#41b883', Go: '#00add8', Python: '#3572a5',
      CSS: '#663399', HTML: '#e34c26', Lua: '#000080', AutoHotkey: '#6594b9', PHP: '#4f5d95', Shell: '#89e051' };
    const total = data.languages.reduce((n, l) => n + l.bytes, 0);
    const top = data.languages.slice(0, 6);
    const rest = total - top.reduce((n, l) => n + l.bytes, 0);
    if (rest > 0) top.push({ name: html.lang === 'en' ? 'Other' : 'Outros', bytes: rest, other: true });
    const pct = b => (b / total * 100);
    document.getElementById('lang-bar').innerHTML = top
      .map(l => `<i style="width:${pct(l.bytes)}%;background:${l.other ? 'var(--hover)' : colors[l.name] || '#9a9080'}" title="${l.name}"></i>`).join('');
    document.getElementById('lang-legend').innerHTML = top
      .map(l => `<li><i style="background:${l.other ? 'var(--hover)' : colors[l.name] || '#9a9080'}"></i>${l.other ? '<span lang="pt">Outros</span><span lang="en">Other</span>' : l.name} <span class="muted">${pct(l.bytes).toFixed(1)}%</span></li>`).join('');
    langs.hidden = false;
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
