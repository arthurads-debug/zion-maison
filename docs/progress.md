# Registro de execução — Zion Maison

Especificação e implementação aprovadas pela usuária. Desenvolvimento no projeto solicitado, branch local `dev/zion-maison`, sem histórico anterior a isolar. Stack aprovada Next.js/Supabase/Vercel mantida; não foi usado hosting do Sites. Skills de Emil Kowalski instaladas no próprio projeto.

## Implementação

- Loja editorial responsiva, catálogo pesquisável e filtrável, busca com sugestões, produto/galeria/variações, coleções, looks, vídeos, favoritos, seleção e páginas institucionais.
- Seleção revalidada pelo servidor; snapshot de preços e estoque, mensagem completa e link oficial WhatsApp, sem checkout ou baixa automática.
- Auth SSR, perfis e permissões verificadas em cada operação, RLS, proteção da última proprietária e bootstrap sem credenciais padrão.
- Painel: produtos/prévia, estoque, venda/estorno idempotentes, biblioteca/editor de mídias, categorias/coleções, CMS/looks/vídeos, configurações/ordem da homepage, equipe, histórico, dashboard e CSV.
- Mídias verificadas pelos bytes; Sharp aplica orientação, recorte e rotação, gera derivados e remove EXIF. MediaInfo inspeciona vídeos; não há transcodificação. Originais privados; biblioteca paginada e exclusão com fila durável.
- Eventos consentidos, preferências entre abas, adaptadores GA4/Pixel, transporte CAPI opt-in sem envio automático, configurações criptografadas, Pushcut com fila/retries/limite e recuperação de resumos, webhook oficial WhatsApp condicionado a assinatura.
- Retenção: eventos/interesses próximos a 90 dias, arquivo diário anônimo por 13 meses, apresentado separadamente; histórico comercial preservado até definição de política pela operação.

## Revisões e correções

Houve revisão do plano e uma revisão independente do código. Os cinco achados importantes da revisão final foram tratados com testes específicos:

1. Arquivos com assinatura de contêiner sem fluxo de vídeo: substituída confiança no cabeçalho por inspeção MediaInfo. Testados arquivos falsos e WebM sintético real, incluindo rejeição de MIME divergente.
2. Revogação/reautorização do consentimento e abas: centralizadas permissões dos SDKs e filas; eventos de storage filtrados pela chave de consentimento. Regressões de helper e navegador desktop/mobile.
3. Contatos por produto: associação persistente dos eventos aos produtos do snapshot real de interesse, preservando um clique global. Regressão SQL.
4. Resumos perdidos após pausa: cursor persistente e recuperação de intervalos fechados com deduplicação. Regressão SQL.
5. Arquivos restantes após excluir mídia: exclusão transacional cria trabalho de limpeza, com estado visível, retentativas e remoção de derivados. Regressão SQL e validação dos caminhos.

A verificação adicional corrigiu o pipeline de recorte/rotação, o lease de jobs após interrupção na última tentativa, paginação de listas/seletores e descarte de identificadores após revogação. A prévia do editor e o transform enviado são comparados no navegador. O teste de preço passou a exigir um produto-base válido, evitando falso positivo por UUID inválido.

No smoke de produção, `notFound()` em página com streaming podia manter HTTP 200 embora o conteúdo de teste não fosse renderizado. O proxy passou a bloquear `/testing/*` antes da renderização; regressão observa falha anterior (200) e exige 404 mesmo com a flag de testes em produção. O mesmo princípio garante o redirect HTTP do painel para login antes de iniciar streaming.

## Evidência local em 23/10/2026

- TypeScript estrito e ESLint sem erros no fechamento.
- Vitest: **44 testes em 8 arquivos**, cobrindo domínio, permissões/RLS, funções PostgreSQL, estoque/idempotência, integrações, consentimento, bytes de mídia e fronteira de produção.
- Playwright: **20 cenários**, desktop Chrome e viewport iPhone 13 em Chromium, incluindo editor, seleção/WhatsApp, prévia, painel, navegação e consentimento entre abas.
- Smoke do build servido: `/` e `/catalogo` 200; `/testing/product` e `/testing/asset` 404; `/api/jobs` sem segredo 401; `/admin/produtos` anônimo 307 para login. Capturas desktop/tablet/mobile sem overflow horizontal em `docs/screenshots`.
- Build de produção: `next build --webpack`. O build Turbopack nesta sandbox encontrou restrição de criação de porta por worker; o comando do projeto usa Webpack e não depende dessa operação.
- Navegadores e geração dos pequenos fixtures sintéticos foram usados somente para testes; nenhum produto demonstrativo é publicado na loja.

A primeira rodada ampliada do navegador teve dois timeouts durante compilação fria; a configuração passou a usar dois workers e expectativa de 15 segundos. Outra rodada identificou seletor de teste inadequado para o select de proporção; corrigido para o papel acessível de combobox. As rodadas finais devem ser interpretadas pelos resultados abaixo, sem ocultar essas falhas intermediárias.

## Limites e decisões explícitas

A usuária informou que ainda não tem Supabase e pediu as instruções prontas. Portanto, as oito migrations, as políticas de Storage, Auth real, SMTP/convites, upload remoto e persistência ponta a ponta **não foram homologados contra uma instância Supabase**. PGlite executou migrations SQL 1, 2 e 4 a 8; a migration 3 depende do schema gerenciado de Storage. Os testes SQL não substituem uma disputa simultânea entre conexões reais para a última unidade.

Os testes de interface usam fixtures identificadas e respostas HTTP isoladas. Não provam entrega de e-mail, upload remoto, abertura real do aplicativo WhatsApp, entrega de Pushcut ou recepção de eventos em GA/Meta. Sem credenciais, nenhum envio externo foi realizado. A CAPI é somente um adaptador preparado, e o webhook não implica uma conta WhatsApp Business conectada. Entregas externas podem repetir após uma interrupção; não há promessa de exactly-once.

A infraestrutura de mídia preserva originais e referências; uploads abandonados antes de virar registro podem requerer auditoria manual de órfãos. Não há coletor automático desses arquivos. A retenção comercial depende de decisão operacional antes do lançamento; não se apagam vendas ou auditoria automaticamente.

Sem logo original, fotos individuais, catálogo, WhatsApp e políticas finais da operação, foram usados marca tipográfica provisória, arte abstrata em CSS e estados vazios. A imagem de referência não virou mercadoria fictícia. O projeto não foi publicado nem conectado a contas externas.

Próximas ações dependentes da operação estão em `docs/operations/acceptance.md`; o passo a passo de criação do Supabase está em `docs/operations/setup.md`.


## Atualização — Reels na homepage (23/10/2026)

Área “Zion in Motion” agora sempre presente na homepage, com cartões verticais em 9:16 (referência 1080 × 1920 px), faixa horizontal responsiva, setas e deslize nativo. Vídeos reais vêm dos registros publicados no CMS. Reprodução inline, silenciosa e em looping, apenas com pelo menos 50% do vídeo visível; pausa fora da tela/aba e preservação da pausa manual. Movimento reduzido exige início manual. Falhas de carregamento têm mensagem própria. Sem arquivos publicados, a área mostra um estado editorial “em breve”; não foram adicionados vídeos comerciais fictícios.

Verificação desta alteração: TypeScript e ESLint aprovados; build Webpack aprovado; 26 testes de navegador desktop/mobile aprovados, incluindo seis cenários novos de Reels. Os três cenários iniciais falharam antes da implementação porque a seção/fixture ainda não existia. Uma expectativa adicional foi corrigida para refletir a navegação móvel: avançar uma tela revela o próximo cartão, não o último da lista. A pausa manual continuou preservada no retorno. No build servido, `/testing/video` responde 404. Capturas da seção pública estão em `docs/screenshots/reels-desktop.png` e `reels-mobile.png`. Os arquivos de vídeo usados na automação são fixtures isoladas; não demonstram a reprodução de conteúdo comercial hospedado nem homologação em aparelho físico iOS/Android.

Situação separada da infraestrutura: o projeto Supabase “Zion Maison” foi criado na organização ads, mas a conexão anterior foi interrompida. Foram confirmadas somente as migrations foundation e storage; não existe `.env.local` configurado nem administradora provisionada. Essa alteração de interface não conclui a conexão Supabase pendente.


## Atualização — Supabase conectado e administrador provisionado (23/10/2026)

Concluída a conexão com o projeto Zion Maison, organização ads, região São Paulo. As oito migrations agora constam no histórico remoto; buckets `originals` privado e `published` público confirmados. Todas as tabelas públicas têm RLS habilitado. A conta administrativa solicitada foi criada via API administrativa do Supabase, sem envio de convite, e recebeu perfil owner ativo. A senha solicitada não foi adicionada a arquivos ou ao histórico Git.

Credenciais salvas somente em `.env.local`, com permissão 0600 e exclusão do Git. A chave pública moderna foi configurada no nome de variável de compatibilidade já usado pelo aplicativo; a chave secreta moderna é usada somente pelo servidor. A chave nunca foi registrada integralmente em saídas de comandos.

Verificação real: login com senha pelo Supabase Auth, leitura do próprio perfil owner, consulta de `dashboard_report` e logout da sessão de teste aprovados. Build Webpack com `.env.local` aprovado. Na interface real em Chrome, login abriu `/admin`, exibindo “Administrador Zion Maison” e os indicadores reais vazios. A página de login deixou de exibir o aviso de conexão por estar efetivamente configurada; não foi removido o tratamento de erro nem criado bypass de autenticação. Captura em `docs/screenshots/admin-connected.png`.

Advisors consultados: nenhuma tabela pública sem RLS; os avisos de execução de SECURITY DEFINER correspondem às funções RPC intencionais de catálogo e operações protegidas por permissões. Referências de revisão: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable e https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable. O provedor também informa proteção de senhas vazadas desativada; essa configuração padrão não foi alterada: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

As migrations remotas foram aplicadas por MCP e têm versões de aplicação geradas pelo provedor. Antes de adotar `supabase db push`, reconciliar esse histórico com os nomes locais usando o fluxo oficial de migration repair, sem reaplicar o esquema. A conexão confirmada não equivale a homologação de e-mails, uploads de ponta a ponta ou entregas de GA/Meta/Pushcut, que continuam no checklist operacional.


## 24/10/2026 — operação simplificada e vitrine mais legível

- Início administrativo focado em tarefas, com relatórios mantidos na rota própria; navegação agrupada conforme permissões, atalhos e guia de primeiros passos.
- Cadastro de peças em quatro etapas, cartão da loja atualizado em tempo real, prévia detalhada sem compra/favoritos/eventos, gerador de combinações que preserva IDs/estoque e elimina duplicação; verificação local com mensagens legíveis e valores em formato brasileiro.
- Escolha de mídia visual no conteúdo, com miniaturas e links externos recolhidos; tipos traduzidos para linguagem da operação.
- Lora e Manrope locais, licenças preservadas; hierarquia, tamanhos e entrelinhas revistos. Entrada editorial e revelação ao rolar por CSS/WAAPI, com conteúdo visível sem JavaScript, preferências de movimento respeitadas e hover restrito a mouse.
- Menu móvel com foco inicial, contenção de Tab, Escape, retorno de foco, bloqueio de rolagem de fundo e conteúdo recolhido inerte.
- Revisão independente identificou um cálculo de limite antes da deduplicação: corrigido e coberto por expansão 62→65 variações. Segunda revisão sem novos achados acionáveis.
- Testes usam dados isolados: nenhum produto, estoque ou conteúdo comercial foi criado no Supabase para demonstrar o redesign. Sessão real de proprietária e rotas públicas conferidas na instância de produção local.

Validação desta entrega: 44 testes de lógica/banco, suíte E2E de 38 casos, regressões de foco e visibilidade da prévia, lint sem avisos, tipagem e build aprovados. Smoke de produção final e capturas em 1440×1000, 820×1180 e 390×844 sem transbordamento horizontal; testes continuam inacessíveis na produção. A captura aguarda fontes e animações finitas para registrar a tela em repouso. Servidor local atualizado na porta 3000; nenhuma publicação externa foi feita.
