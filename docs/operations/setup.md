# Configuração do Supabase

Use um projeto de desenvolvimento separado do de produção. Você ainda não precisa enviar credenciais pelo chat: preencha `.env.local`, ignorado pelo Git.

## 1. Criar o projeto

Crie um projeto no [Supabase](https://supabase.com/dashboard), escolha uma região adequada e guarde a senha do banco em seu gerenciador de senhas. Aguarde a criação dos serviços.

Nas configurações de API do projeto, obtenha a URL, a chave pública publishable e a chave secreta de servidor. Os nomes de variáveis `ANON_KEY` e `SERVICE_ROLE_KEY` foram preservados por compatibilidade; o projeto conectado usa as chaves modernas do Supabase. Nunca coloque essa chave em uma variável `NEXT_PUBLIC_*` ou no navegador.

```dotenv
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_SERVICE_ROLE
INTEGRATION_ENCRYPTION_KEY=HEX_DE_32_BYTES_ALEATORIOS
CRON_SECRET=SEGREDO_ALEATORIO_LONGO
```

Para gerar cada segredo localmente:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Use valores diferentes para criptografia e cron. Preserve a chave de criptografia em backup seguro: ela é necessária para recuperar os segredos das integrações.

## 2. Aplicar migrations

No SQL Editor do projeto **vazio de desenvolvimento**, execute os arquivos de `supabase/migrations` uma vez cada, nesta ordem, conferindo sucesso antes de avançar:

1. `202610230001_foundation.sql`
2. `202610230002_services.sql`
3. `202610230003_storage.sql`
4. `202610230004_admin_functions.sql`
5. `202610230005_hardening.sql`
6. `202610230006_catalog_search.sql`
7. `202610230007_contact_and_summaries.sql`
8. `202610230008_retention.sql`
9. `20261024160318_illustrative_commerce_guard.sql`

Todas são necessárias antes de abrir o painel. Algumas funções referenciam estruturas de migrations posteriores, resolvidas na execução. Não execute funções do aplicativo com o conjunto aplicado parcialmente. Não reaplique migrations já executadas; elas não são um script de reset.

Alternativa para equipes: gerencie o mesmo diretório com o [Supabase CLI](https://supabase.com/docs/guides/local-development) e seu histórico de migrations. Não misture aplicação manual com `db push` sem reconciliar o histórico. Não use `db reset` em um projeto que contém dados.

A migration de Storage cria `originals` privado e `published` público. O cliente não recebe permissão de escrita direta nesses buckets. Uploads usam URLs assinadas emitidas depois de autenticação e permissão; publicação depende da inspeção dos bytes no servidor.

## 3. Configurar autenticação e e-mails

Configure Site URL para `http://127.0.0.1:3000` e autorize os redirects de desenvolvimento:

- `http://127.0.0.1:3000/auth/callback`
- `http://127.0.0.1:3000/auth/callback?next=/admin/redefinir`
- `http://127.0.0.1:3000/auth/confirm`

Configure SMTP para e-mails operacionais e teste a entrega. Não há cadastro público no aplicativo; desative novas inscrições públicas na configuração do provedor. O provisionamento administrativo usa a API administrativa.

Nos templates de **convite** e **recuperação de senha**, use links com `TokenHash` para funcionar entre dispositivos:

```html
<!-- Convite -->
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite"
  >Definir minha senha</a
>
<!-- Recuperação -->
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery"
  >Redefinir minha senha</a
>
```

O callback PKCE também existe para o fluxo iniciado pelo mesmo navegador. Os links só aceitam destinos internos previstos. Consulte a documentação de [Auth com SSR](https://supabase.com/docs/guides/auth/server-side/nextjs) e [templates](https://supabase.com/docs/guides/auth/auth-email-templates).

## 4. Criar a primeira proprietária

Adicione temporariamente a `.env.local`:

```dotenv
BOOTSTRAP_OWNER_EMAIL=seu-email-real
BOOTSTRAP_OWNER_NAME=Seu nome
BOOTSTRAP_OWNER_PASSWORD=senha-unica-com-no-minimo-12-caracteres
```

```sh
pnpm bootstrap
```

O script cria usuário e perfil `owner` e recusa criar uma nova primeira proprietária quando já existe uma ativa. Se falhar ao criar o perfil, tenta remover o usuário recém-criado. Não imprime senha. Remova as três variáveis `BOOTSTRAP_*` após o uso. Entre em `/admin` e convide funcionários pelo painel. Nunca coloque a senha no código ou no Git.

## 5. Primeira configuração

Reinicie `pnpm dev` após mudar variáveis. No painel, configure WhatsApp em formato internacional sem `+`, Instagram, identificação comercial e textos. Envie a identidade visual e fotos reais pela biblioteca, crie categorias e produtos como rascunho e publique somente após preencher preço, variações, disponibilidade e mídia verificada.

Conclua o [checklist com serviços reais](acceptance.md). Se uma migration ou login falhar, guarde o nome da etapa e a mensagem sanitizada, sem copiar chaves ou senhas.

## 6. Vitrine ilustrativa opcional

A loja conectada já recebeu o conteúdo de exemplo solicitado. Todas as imagens, peças, valores, coleções e vídeos podem ser substituídos pelo painel. Não é necessário executar outro comando para editar.

Para preparar um novo ambiente vazio com os mesmos assets, use `pnpm seed:illustrative` após configurar o banco e a proprietária. O script é aditivo, preserva edições e mantém estoque zero; a tag `ilustrativo` impede interesse e venda nos RPCs do banco. Na etapa Publicação do produto existe um controle para remover a condição ilustrativa depois de cadastrar fotos, dados e estoque reais.

Migração aplicada no projeto conectado com versão remota `20261024160425`, correspondente ao arquivo local `20261024160318_illustrative_commerce_guard.sql`. Preserve o histórico existente ao usar a CLI; não reaplique as oito migrações anteriores.
