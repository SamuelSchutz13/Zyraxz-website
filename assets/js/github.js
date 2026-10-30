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
  'Zyraxz-website': ['Zyraxz Website', 'img/logos/zyraxz.svg'], 'Youtube-Ultrawide': ['YouTube Ultrawide', 'img/icons/youtube.svg'],
  'PES21-UltrawideFix': ['PES 2021 Ultrawide', 'img/icons/lua.svg'], SistemTemp: ['SistemTemp', 'img/logos/sistemtemp.svg'],
  uJobsGUI: ['uJobs', 'img/logos/ujobs.svg'],
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
      }))).catch(() => []))); // an empty repository answers 409
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
  const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
  // consecutive commits to the same repository share one header
  const groups = [];
  commits.forEach(c => groups.at(-1)?.repo === c.repo ? groups.at(-1).items.push(c) : groups.push({ repo: c.repo, items: [c] }));
  list.replaceChildren(...groups.map(g => {
    const li = el('li'), head = el('div', 'repo'), node = el('span', 'node'), ol = el('ol');
    const { name, icon } = app(g.repo);
    const gh = el('a', 'gh-link'), ghIc = new Image(16, 16);
    ghIc.src = base + 'img/icons/github-white.svg'; ghIc.alt = 'GitHub';
    gh.href = `https://github.com/${user}/${g.repo}/commits`; gh.title = `${name} · commits`; gh.append(ghIc);
    node.append(icon); head.append(node, name, gh);
    ol.append(...g.items.map(c => {
      const item = el('li'), a = el('a'), msg = el('span', 'msg'), meta = el('span', 'meta');
      // a conventional-commit prefix ("feat:", "fix(ui):") becomes a small tag
      const [, type, text] = c.msg.match(/^(\w+)(?:\([^)]*\))?!?:\s*(.+)$/) || [, '', c.msg];
      msg.textContent = text[0].toUpperCase() + text.slice(1);
      // everyone on the commit, overlapping; without the Action's file only the author is known
      const avs = el('span', 'avs');
      avs.append(...(c.people || [{ avatar: c.avatar }]).map(p => {
        const av = new Image(20, 20);
        av.src = p.avatar || base + 'img/avatar.png'; av.alt = p.login || ''; av.title = p.login || '';
        return av;
      }));
      meta.append(avs, ago(c.date));
      if (type) { const tag = el('span', 'tag'); tag.dataset.type = tag.textContent = type.toLowerCase(); meta.append(tag); }
      a.href = c.url; a.append(msg, meta); item.append(a); return item;
    }));
    li.append(head, ol); return li;
  }));
};

(async () => {
  const data = await load();
  const list = document.getElementById('commits');

  document.querySelectorAll('.stars[data-repo]').forEach(el => {
    const n = data?.stars[el.dataset.repo];
    if (n !== undefined) { el.querySelector('b').textContent = n; el.hidden = false; }
  });

  // contributor avatars at the end of the tech row, on each card and on the project page:
  // only in the Action's file (one request per repository)
  document.querySelectorAll('.card[data-repo], .p-head[data-repo]').forEach(card => {
    const people = data?.contributors?.[card.dataset.repo];
    const row = card.querySelector('.stack');
    if (!people?.length || !row) return;
    const wrap = document.createElement('span');
    wrap.className = 'contribs';
    wrap.append(...people.slice(0, 5).map(p => {
      const av = new Image(26, 26);
      av.src = `${p.avatar}&s=52`; av.alt = p.login; av.title = p.login; av.loading = 'lazy';
      return av;
    }));
    row.append(wrap);
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

  // status under the name: "coding" = committed in the last 24 h (data refreshes hourly)
  const last = data?.commits?.[0];
  if (last) {
    const on = Date.now() - new Date(last.date) < 24 * 36e5;
    document.querySelector('.av-wrap .dot').hidden = false;
    document.querySelector('.av-wrap .dot').classList.toggle('on', on);
    const status = document.querySelector('.status');
    const { name, icon } = app(last.repo);
    const where = document.createElement('span'); // plain text: the whole name block is already a link
    where.className = 'status-app'; where.append(icon, name);
    status.innerHTML =
      `<span lang="pt">${on ? 'Codando · ' : 'Último commit '}${ago(last.date, 'pt-BR')} em</span>` +
      `<span lang="en">${on ? 'Coding · ' : 'Last commit '}${ago(last.date, 'en')} in</span>`;
    status.append(where);
    status.hidden = false;
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
    const icons = { TypeScript: 'typescript', JavaScript: 'javascript', Vue: 'vuedotjs', Go: 'go', Python: 'python',
      CSS: 'css', HTML: 'html5', Lua: 'lua', AutoHotkey: 'autohotkey-white', PHP: 'php', Shell: 'gnubash' };
    const icon = l => icons[l.name] ? `<img src="${base}img/icons/${icons[l.name]}.svg" width="16" height="16" style="width:16px;height:16px" alt="">` : '';
    document.getElementById('lang-legend').innerHTML = top
      .map(l => `<li><i style="background:${l.other ? 'var(--hover)' : colors[l.name] || '#9a9080'}"></i>${icon(l)}${l.other ? '<span lang="pt">Outros</span><span lang="en">Other</span>' : l.name} <span class="muted">${pct(l.bytes).toFixed(1)}%</span></li>`).join('');
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

  // "By the numbers": streaks and totals from the same calendar, nothing new to fetch
  const stats = document.getElementById('stats');
  if (stats && data?.contributions?.days?.length) {
    const { total, days } = data.contributions;
    const $ = id => document.getElementById(id);
    const both = (pt, en) => `<span lang="pt">${pt}</span><span lang="en">${en}</span>`;
    const dias = v => both(v === 1 ? 'dia' : 'dias', v === 1 ? 'day' : 'days');
    let longest = 0, run = 0;
    days.forEach(day => { run = day.c ? run + 1 : 0; longest = Math.max(longest, run); });
    // today may have no commits yet: the streak only breaks after a full day without any
    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].c) streak++;
      else if (i < days.length - 1) break;
    }
    const active = days.filter(d => d.c).length;
    const best = days.reduce((a, d) => d.c > a.c ? d : a);
    const stars = Object.entries(data.stars).sort((a, b) => b[1] - a[1]);
    const weeks = [...Array(16)].map((_, w) => days.slice(-7 * (16 - w), -7 * (15 - w) || undefined).reduce((t, d) => t + d.c, 0));

    $('st-streak-unit').innerHTML = dias(streak);
    $('st-longest').innerHTML = `${longest} ${dias(longest)}`;
    $('st-days').innerHTML = days.slice(-7).map(d => {
      const day = new Date(d.d + 'T00:00:00');
      const wd = loc => day.toLocaleDateString(loc, { weekday: 'narrow' });
      return `<li class="${d.c ? 'on' : ''}" title="${d.d}: ${d.c}"><i></i>${both(wd('pt-BR'), wd('en'))}</li>`;
    }).join('');
    $('st-total-sub').innerHTML = `${both('melhor dia', 'best day')}: ${best.c}`;
    $('st-active-sub').innerHTML = `${Math.round(active / days.length * 100)}% ${both('do ano', 'of the year')}`;
    $('st-repos-sub').innerHTML = both('públicos no GitHub', 'public on GitHub');
    if (stars[0]?.[1]) $('st-stars-sub').innerHTML = `${both('mais em', 'most in')} ${app(stars[0][0]).name}`;
    $('st-week').textContent = weeks[15];

    const max = Math.sqrt(Math.max(...weeks, 1)); // square root, so one huge week does not flatten the rest
    $('st-weeks').innerHTML = weeks.map((c, w) =>
      `<i class="${c ? 'on' : ''}${w === 15 ? ' now' : ''}" style="--h:${Math.max(Math.sqrt(c) / max * 100, 6)}%" title="${c}"></i>`).join('');
    stats.hidden = false;

    // count up and grow the bars once the card scrolls into view
    const counts = { 'st-streak': streak, 'st-total': total, 'st-active': active,
      'st-repos': stars.length, 'st-stars': stars.reduce((t, [, v]) => t + v, 0) };
    const play = () => {
      stats.classList.add('in');
      $('st-bar').style.width = `${longest ? streak / longest * 100 : 0}%`;
      const t0 = performance.now(), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const tick = t => {
        const k = still ? 1 : Math.min(Math.max(t - t0, 0) / 1200, 1), e = 1 - (1 - k) ** 3;
        for (const [id, v] of Object.entries(counts)) $(id).textContent = Math.round(v * e).toLocaleString(html.lang);
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    new IntersectionObserver(([e], io) => { if (e.isIntersecting) { io.disconnect(); play(); } }, { threshold: .3 }).observe(stats);
  }

  // achievements: only in the Action's file (scraped from the profile page)
  const badges = document.getElementById('badges');
  if (badges && data?.achievements?.length) {
    document.getElementById('badge-list').replaceChildren(...data.achievements.map(a => {
      const li = document.createElement('li'), link = document.createElement('a'), img = new Image(64, 64);
      img.crossOrigin = 'anonymous'; // githubassets sends CORS, so showBadge can read the badge's color
      img.src = a.img; img.alt = ''; img.loading = 'lazy';
      link.href = `https://github.com/${user}?achievement=${a.slug}&tab=achievements`;
      link.append(img, a.name);
      if (a.tier) { const t = document.createElement('span'); t.className = 'tier'; t.textContent = a.tier; link.append(t); }
      link.addEventListener('click', e => { e.preventDefault(); showBadge(a, link.href, link); });
      li.append(link); return li;
    }));
    badges.hidden = false;
  }

  // click a badge: a small card under it with what it's for (light-dismiss popover, Esc or click outside closes)
  const pop = document.createElement('div');
  pop.className = 'badge-pop';
  pop.popover = 'auto';
  document.body.append(pop);
  let closedAt = 0, shown = '';
  pop.addEventListener('toggle', e => { if (e.newState === 'closed') closedAt = performance.now(); });
  addEventListener('scroll', () => pop.matches(':popover-open') && pop.hidePopover(), { passive: true });
  function showBadge(a, href, anchor) {
    if (shown === a.slug && performance.now() - closedAt < 300) return; // this click just closed it: act as a toggle
    shown = a.slug;
    const about = {
      'quickdraw': ['Fechou uma issue ou pull request em até 5 minutos depois de abrir.', 'Closed an issue or pull request within 5 minutes of opening.'],
      'pull-shark': ['Abriu pull requests que foram mergeados.', 'Opened pull requests that have been merged.'],
      'public-sponsor': ['Patrocinou um projeto open source pelo GitHub Sponsors.', 'Sponsored an open source contributor through GitHub Sponsors.'],
      'yolo': ['Mergeou um pull request sem code review.', 'Merged a pull request without code review.'],
      'pair-extraordinaire': ['Foi coautor de pull requests mergeados.', 'Coauthored commits on merged pull requests.'],
      'starstruck': ['Criou um repositório com muitas estrelas.', 'Created a repository that has many stars.'],
      'galaxy-brain': ['Teve respostas aceitas no GitHub Discussions.', 'Answered discussions that got accepted.'],
    }[a.slug];
    pop.innerHTML = `
      <img src="${a.img}" width="64" height="64" alt="">
      <div>
        <span><b></b>${a.tier ? `<span class="tier">${a.tier}</span>` : ''}</span>
        ${about ? `<p><span lang="pt">${about[0]}</span><span lang="en">${about[1]}</span></p>` : ''}
        <a href="${href}"><span lang="pt">Ver no GitHub</span><span lang="en">See on GitHub</span> ↗</a>
      </div>`;
    pop.querySelector('b').textContent = a.name;
    pop.style.setProperty('--tint', badgeColor(anchor.querySelector('img')));
    pop.showPopover();
    const r = anchor.getBoundingClientRect(), w = pop.offsetWidth;
    pop.style.left = `${Math.min(Math.max(8, r.left + r.width / 2 - w / 2), document.documentElement.clientWidth - w - 8)}px`; // clientWidth: without the scrollbar
    pop.style.top = `${r.bottom + 8}px`;
  }

  // the badge's main color: average of its opaque, colorful pixels (GitHub mobile tints the sheet this way)
  function badgeColor(img) {
    try {
      const c = document.createElement('canvas'), n = c.width = c.height = 24, g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, n, n);
      const px = g.getImageData(0, 0, n, n).data;
      let r = 0, gr = 0, b = 0, w = 0;
      for (let i = 0; i < px.length; i += 4) {
        const s = Math.max(px[i], px[i + 1], px[i + 2]) - Math.min(px[i], px[i + 1], px[i + 2]); // 0 for grays
        const k = px[i + 3] > 200 ? s : 0;
        r += px[i] * k; gr += px[i + 1] * k; b += px[i + 2] * k; w += k;
      }
      return w ? `rgb(${r / w | 0} ${gr / w | 0} ${b / w | 0})` : 'var(--surface)';
    } catch { return 'var(--surface)'; } // image not loaded yet, or tainted
  }

  if (!list) return;
  if (data?.commits.length) {
    renderCommits(list, data.commits);
    document.addEventListener('langchange', () => renderCommits(list, data.commits));
  } else {
    list.innerHTML = `<li class="muted fail"><span lang="pt">Não deu para carregar agora.</span><span lang="en">Couldn't load right now.</span> <a href="https://github.com/${user}"><span lang="pt">Ver no GitHub</span><span lang="en">See on GitHub</span></a></li>`;
  }
})();
