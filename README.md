# Zion Maison

Boutique digital em português com catálogo, seleção de interesses e atendimento pelo WhatsApp. Painel administrativo com produtos, variações, estoque, vendas confirmadas manualmente, mídias, conteúdo editorial, equipe, relatórios e integrações.

**Estado da entrega:** implementação local com testes automatizados. Não há projeto Supabase, credenciais de provedores ou catálogo comercial configurado. Login, persistência remota, e-mails, Storage e entregas externas ainda exigem a homologação descrita abaixo. A interface funciona sem essas credenciais com estados vazios; não existe banco simulado em produção.

## Iniciar no computador

Requisitos: Node.js 22 ou superior e pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Abra `http://127.0.0.1:3000`. O painel fica em `/admin`. Sem Supabase, a loja apresenta a identidade visual e o catálogo vazio; o painel informa a configuração necessária. Não existem usuário ou senha padrão.

## Configurar e operar

- [Supabase, migrations e primeira proprietária](docs/operations/setup.md)
- [Publicação, worker, backups e recuperação](docs/operations/deployment.md)
- [Operação da loja e integrações](docs/operations/store-guide.md)
- [Checklist de homologação com serviços reais](docs/operations/acceptance.md)
- [Evidências e limites da verificação local](docs/progress.md)
- [Especificação aprovada](docs/superpowers/specs/2026-10-23-zion-maison-design.md)

## Verificar o código

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
```

Com o build inicial servido por `pnpm start`, `pnpm exec tsx scripts/verify-production.ts` confere respostas HTTP e salva capturas desktop/tablet/mobile. Esse smoke visual espera os textos iniciais da loja, antes de personalizações do CMS.

Os testes SQL usam PostgreSQL via PGlite para executar migrations, RLS e funções transacionais. Auth e Storage são recursos específicos do Supabase e precisam dos testes reais do checklist. Os testes de interface usam fixtures explicitamente identificadas e contratos HTTP isolados; não demonstram integração remota. As rotas `/testing/*` só existem em desenvolvimento com `ZION_E2E=1` e retornam 404 em produção.

## Organização

`src/app`: rotas públicas, painel e APIs. `src/server`: Auth, persistência, mídias e integrações. `src/lib`: validação e regras comerciais. `src/components`: interfaces da loja e do painel. `supabase/migrations`: banco, políticas e funções. `tests`: domínio, PostgreSQL, segurança e navegador.

Next.js App Router, React, TypeScript, Tailwind/CSS, Supabase Auth/Postgres/Storage. Imagens processadas com Sharp; vídeos inspecionados com MediaInfo WASM. Preferências e seleção são locais; permissões e operações comerciais são validadas no servidor e no banco.

As skills de Emil Kowalski estão instaladas no projeto em `.agents/skills`, com registro em `skills-lock.json`.
