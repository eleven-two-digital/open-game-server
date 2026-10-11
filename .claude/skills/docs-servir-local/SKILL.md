---
name: docs-servir-local
description: Instala dependências e sobe/serve localmente o site Docusaurus da pasta docs/ (dev server ou build estático). Use quando o usuário pedir para subir, rodar, servir ou visualizar a documentação localmente.
---

# Servir a documentação localmente

O site Docusaurus fica em `docs/` (Node >= 18, CI usa Node 20). Todos os comandos rodam dentro de `docs/`.

## 1. Instalar dependências

```bash
cd docs
npm install
```

Não há `package-lock.json` versionado (está no `docs/.gitignore`), então use `npm install`, não `npm ci`.

## 2. Modo desenvolvimento (hot reload)

```bash
npm start
```

Abre em `http://localhost:3000/`. Use `npm start -- --port 3001` se a porta estiver ocupada. Use `npm start -- --host 0.0.0.0` para acessar de outra máquina na rede.

## 3. Modo produção (build + servir estático)

```bash
npm run build
npm run serve
```

- `npm run build` gera os arquivos em `docs/build/` e falha em links quebrados.
- `npm run serve` serve o build em `http://localhost:3000/open-game-server/`. O `baseUrl` do `docusaurus.config.js` é `/open-game-server/`, então a URL inclui esse prefixo.

Use o build para validar antes de subir mudanças; o `npm start` não detecta alguns links quebrados.

## Onde editar

- Páginas: `docs/docs/<secao>/*.md`
- Ordem e agrupamento do menu: `docs/sidebars.js`. Ao criar uma página nova, adicione o id (caminho sem `.md`) ao array da categoria correspondente, senão ela não aparece no menu.
- Configuração do site (título, locale pt-BR, URL do GitHub Pages): `docs/docusaurus.config.js`
- Landing page: `docs/src/pages/index.js`

## Problemas comuns

- `EADDRINUSE` na porta 3000: outro processo está usando a porta. Use `--port`.
- Página não aparece no menu: id ausente em `sidebars.js`.
- Erro de link quebrado no build: confira o caminho relativo do link (ex.: `../arquitetura/overview`).
- Dependências desatualizadas ou erro estranho após troca de branch: `rm -rf node_modules .docusaurus && npm install`.
