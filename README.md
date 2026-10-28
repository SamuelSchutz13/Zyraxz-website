# Portfólio

Site estático, sem build e sem dependências externas: fonte e ícones ficam no próprio projeto.
Publicado em https://samuelschutz13.github.io/Zyraxz-website/ pelo workflow `.github/workflows/deploy.yml`.

```
index.html                página inicial
404.html                  página de "não encontrado" (GitHub Pages)
sitemap.xml, robots.txt   para buscadores
projects/*.html           uma página por projeto principal
assets/
  css/main.css            estilos, temas claro/escuro e idiomas
  fonts/                  General Sans (woff2)
  js/prefs.js             tema e idioma (PT/EN) do popup de configurações, aplicados antes de pintar a tela
  js/nav.js               destaca no menu a seção que está na tela
  js/filters.js           filtro de projetos por tecnologia
  js/github.js            estrelas, projetos recentes, commits e contribuições
  js/reveal.js            cartões surgindo ao rolar (desligado para quem prefere menos movimento)
  js/lightbox.js          amplia as capturas ao clicar, com setas entre as telas
  img/icons/              ícones das tecnologias (Simple Icons, CC0)
  img/logos/              ícones dos projetos (dos repositórios)
  img/projects/           capturas de tela em WebP (até 1600px) usadas nas páginas dos projetos
  img/projects/thumbs/    miniaturas de 800px usadas nos cartões
  img/favicon.svg, og.png ícone da aba e prévia ao compartilhar o link
.github/
  workflows/deploy.yml    publica o site a cada push e de hora em hora
  scripts/github-data.mjs gera assets/data/github.json (dados do GitHub) antes de publicar
```

## Dados do GitHub

A cada hora o workflow roda `github-data.mjs`, que salva estrelas, data do último push, commits
recentes e o calendário de contribuições em `assets/data/github.json`. O site lê esse arquivo,
então os visitantes nunca esbarram no limite de 60 consultas/hora da API pública.
Abrindo o `index.html` direto do disco, o arquivo não existe e o site consulta a API como reserva.

## Cartão do nome (status)

Passando o mouse em "Zyraxz" aparece um cartão com o status: bolinha verde e "Online" quando houve
commit nas últimas 24 h (os dados atualizam de hora em hora), senão a data do último commit.

## Idiomas

Cada texto existe nas duas línguas no próprio HTML, marcado com `lang="pt"` ou `lang="en"`.
O CSS esconde a versão inativa.

## Demos ao vivo

Quando um projeto tiver versão hospedada, o botão "Abrir" aparece na página dele.
