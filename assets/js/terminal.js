// A small terminal for the curious: press ` (or the >_ button) and type "help".
// Uses apply/save from prefs.js and the GitHub data github.js exposes on window.githubData.
const term = (() => {
  const site = document.querySelector('script[src$="terminal.js"]').src.replace(/assets\/js\/terminal\.js$/, '');
  const links = {
    github: 'https://github.com/SamuelSchutz13',
    linkedin: 'https://www.linkedin.com/in/samuel-schutz-a3304a244/',
  };
  const projects = {
    titanlive: ['TitanLive', 'projects/titanlive.html'], restyx: ['Restyx', 'projects/restyx.html'],
    gityx: ['Gityx', 'projects/gityx.html'], matchsim: ['MatchSim', 'projects/matchsim.html'],
    foculesspdf: ['FoculessPDF', links.github + '/FoculessPDF'], foculessyt: ['FoculessYT', links.github + '/FoculessYT'],
    foculesspad: ['FoculessPad', links.github + '/FoculessPad'], spotify: ['Spotify Control', links.github + '/AHK-SpotifyControl'],
  };
  const pt = () => document.documentElement.dataset.lang === 'pt';
  const L = (p, e) => (pt() ? p : e);
  const go = url => setTimeout(() => { location.href = /^https?:/.test(url) ? url : site + url; }, 400);

  const commands = {
    help: () => L(
      'Comandos: sobre, projetos, abrir <projeto>, stack, commits, tema claro|escuro, idioma pt|en, github, linkedin, limpar, sair\n(e tem um comando secreto que começa com sudo…)',
      'Commands: about, projects, open <project>, stack, commits, theme light|dark, lang pt|en, github, linkedin, clear, exit\n(and there is a secret command that starts with sudo…)'),
    sobre: () => L(
      'Desenvolvedor full-stack. Faço ferramentas pequenas que resolvem um incômodo de verdade, rodam na sua máquina e não guardam nada seu.',
      'Full-stack developer. I build small tools that fix a real annoyance, run on your machine and keep nothing of yours.'),
    projetos: () => Object.entries(projects).map(([k, [n]]) => `  ${k.padEnd(12)} ${n}`).join('\n') + L('\nUse: abrir <projeto>', '\nUse: open <project>'),
    abrir: arg => {
      const p = projects[(arg || '').toLowerCase()];
      if (!p) return L(`Projeto não encontrado: ${arg || '(vazio)'}. Veja "projetos".`, `Project not found: ${arg || '(empty)'}. See "projects".`);
      go(p[1]);
      return L(`Abrindo ${p[0]}…`, `Opening ${p[0]}…`);
    },
    stack: () => 'TypeScript · JavaScript · Go · Python · PHP · Java · C\nNestJS · Vue · React · Node.js · Bun · Prisma · Tailwind\nPostgreSQL · MySQL · Redis · SQLite · Docker · Kubernetes\nJest · Vitest · Playwright',
    commits: () => {
      const list = window.githubData?.commits?.slice(0, 5);
      if (!list?.length) return L('Os commits ainda não carregaram.', "Commits haven't loaded yet.");
      return list.map(c => `  ${c.repo.padEnd(14)} ${c.msg}`).join('\n');
    },
    tema: arg => {
      const v = { claro: 'light', light: 'light', escuro: 'dark', dark: 'dark' }[arg];
      if (!v) return L('Use: tema claro | tema escuro', 'Use: theme light | theme dark');
      apply.theme(v); save('theme', v);
      document.querySelectorAll('#settings input[name="theme"]').forEach(i => { i.checked = i.value === v; });
      return L(`Tema ${v === 'light' ? 'claro' : 'escuro'} ✓`, `${v} theme ✓`);
    },
    idioma: arg => {
      if (!['pt', 'en'].includes(arg)) return L('Use: idioma pt | idioma en', 'Use: lang pt | lang en');
      apply.lang(arg); save('lang', arg);
      document.querySelectorAll('#settings input[name="lang"]').forEach(i => { i.checked = i.value === arg; });
      document.dispatchEvent(new Event('langchange'));
      return L('Idioma: português ✓', 'Language: English ✓');
    },
    github: () => { go(links.github); return L('Abrindo o GitHub…', 'Opening GitHub…'); },
    linkedin: () => { go(links.linkedin); return L('Abrindo o LinkedIn…', 'Opening LinkedIn…'); },
    sudo: arg => {
      if (!/^(contratar|hire)\b/.test(arg || '')) return L('Boa tentativa. Só um comando sudo funciona aqui 😉', 'Nice try. Only one sudo command works here 😉');
      go(links.linkedin);
      return L('[sudo] permissão concedida ✓\nÓtima escolha. Abrindo o LinkedIn…', '[sudo] permission granted ✓\nGreat choice. Opening LinkedIn…');
    },
    limpar: () => { out.replaceChildren(); return null; },
    sair: () => { box.close(); return null; },
  };
  // English names point to the same commands
  Object.assign(commands, { about: commands.sobre, projects: commands.projetos, open: commands.abrir, theme: commands.tema, lang: commands.idioma, clear: commands.limpar, exit: commands.sair });

  const box = document.createElement('dialog');
  box.className = 'terminal';
  box.setAttribute('aria-label', 'Terminal');
  box.innerHTML = `
    <div class="term-bar"><i></i><i></i><i></i><span>zyraxz — terminal</span><button type="button" aria-label="Fechar / Close">×</button></div>
    <div class="term-body"><div class="term-out" aria-live="polite"></div>
      <form class="term-line"><label for="term-in">visitante@zyraxz:~$</label><input id="term-in" autocomplete="off" spellcheck="false" autocapitalize="off"></form></div>`;
  document.body.append(box);
  const out = box.querySelector('.term-out'), input = box.querySelector('input');
  const history = []; let pos = 0;

  const print = (text, cls) => {
    const line = document.createElement('pre');
    if (cls) line.className = cls;
    line.textContent = text;
    out.append(line);
    box.querySelector('.term-body').scrollTop = 1e9;
  };

  box.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    const raw = input.value.trim();
    input.value = '';
    print(`visitante@zyraxz:~$ ${raw}`, 'cmd');
    if (!raw) return;
    history.push(raw); pos = history.length;
    const [name, ...rest] = raw.split(/\s+/);
    const run = commands[name.toLowerCase()];
    const result = run ? run(rest.join(' ').toLowerCase()) : L(`comando não encontrado: ${name}. Digite "help".`, `command not found: ${name}. Type "help".`);
    if (result) print(result, run ? '' : 'err');
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' && pos > 0) { input.value = history[--pos]; e.preventDefault(); }
    if (e.key === 'ArrowDown') { pos = Math.min(pos + 1, history.length); input.value = history[pos] || ''; e.preventDefault(); }
    if (e.key === 'Tab') { // complete the command name
      e.preventDefault();
      const match = Object.keys(commands).filter(c => c.startsWith(input.value.toLowerCase()));
      if (match.length === 1) input.value = match[0] + ' ';
      else if (match.length) print(match.join('  '));
    }
  });
  box.querySelector('.term-bar button').addEventListener('click', () => box.close());
  box.addEventListener('click', e => { if (e.target === box) box.close(); });

  const open = () => {
    if (!out.childElementCount) print(L('Bem-vindo ao terminal do Zyraxz. Digite "help" para ver os comandos.', 'Welcome to the Zyraxz terminal. Type "help" to see the commands.'), 'hint');
    box.showModal();
    input.focus();
  };
  return { open, box };
})();

document.querySelector('.term-btn')?.addEventListener('click', term.open);
addEventListener('keydown', e => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
  const backtick = e.key === '`' || (e.key === 'Dead' && e.code === 'BracketLeft'); // dead key on ABNT2 keyboards
  if (backtick && !typing && !term.box.open) { e.preventDefault(); term.open(); }
});
