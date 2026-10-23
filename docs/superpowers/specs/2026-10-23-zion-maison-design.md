# Zion Maison — desenho da aplicação

Data: 23 de outubro de 2026  
Estado: proposta para aprovação antes da implementação

## 1. Intenção e origem dos requisitos

Construir, neste projeto, uma boutique digital de moda feminina e sua administração real. A experiência pública deve transmitir elegância atemporal e funcionar especialmente bem no celular. A proprietária deve atualizar produtos, estoque, mídias e conteúdo sem editar código.

Esta proposta reúne os dois documentos fornecidos pela pessoa solicitante: o projeto completo e o complemento do painel administrativo. A imagem “Elegância Atemporal da Zion Maison.png” é referência de direção visual, não um catálogo real nem uma fonte de fotografias individuais. Não foi fornecido código anterior. A inspeção encontrou somente as skills instaladas e seu arquivo de registro, sem repositório Git inicializado.

Decisão aprovada na conversa: aplicação unificada com Next.js e Supabase. A pessoa solicitante delegou as demais escolhas técnicas. As decisões abaixo identificadas como propostas técnicas são escolhas do implementador, sujeitas à revisão deste documento.

## 2. Objetivos, limites e condições de sucesso

Entregar homepage editorial, catálogo pesquisável, páginas de produto, coleções, favoritos, carrinho de interesses, Shop the Look, Zion in Motion, WhatsApp Commerce e painel completo com autenticação, autorização, mídias, estoque, CMS, eventos, relatórios e integrações configuráveis.

A compra termina no atendimento pelo WhatsApp. Não haverá pagamento, cálculo definitivo de frete ou checkout financeiro nesta versão. O carrinho não reserva estoque. Abrir WhatsApp não comprova envio de mensagem nem venda. Vendas confirmadas são registradas pela administração, com baixa transacional de estoque.

Falhas inaceitáveis: botões sem operação real; métricas fictícias apresentadas como reais; produtos de exemplo publicados em produção; segredos no navegador; autorização baseada apenas na interface; publicação de arquivos inseguros; baixa de estoque após clique; preço antigo aceito sem validação; indicação de integração conectada sem teste verdadeiro.

Uma entrega local verificada e uma publicação em produção são marcos distintos. Produção depende de projeto Supabase, configuração de hospedagem, domínio, envio de e-mail, materiais comerciais e credenciais autorizadas. Não declarar produção validada enquanto essas dependências não estiverem disponíveis e testadas.

## 3. Abordagens consideradas

### A. Next.js e Supabase na mesma aplicação — escolhida

Uma aplicação Next.js com App Router para loja, administração, renderização no servidor e endpoints; Supabase para PostgreSQL, Auth e Storage. Compartilha modelos e regras comerciais, reduz serviços operados e viabiliza políticas de acesso no banco. Exige atenção às fronteiras entre código público, código servidor e operações privilegiadas. Processamento assíncrono será modelado no banco, sem depender de uma requisição aberta.

### B. Loja Next.js com API independente

Separa os ciclos de implantação e facilita atender múltiplos aplicativos, mas adiciona hospedagem, autenticação entre serviços e contratos de API. Não oferece benefício imediato proporcional para esta boutique.

A pessoa solicitante escolheu A na conversa e delegou a execução técnica.

## 4. Arquitetura proposta

- Next.js App Router, React, TypeScript estrito, Tailwind CSS e Motion, em versões estáveis compatíveis verificadas na implementação.
- Zod nos contratos de entrada e saída relevantes. Valores monetários em centavos inteiros; moeda BRL; timestamps UTC; períodos apresentados e filtrados em America/Belem por padrão, configurável pela proprietária.
- Supabase PostgreSQL com migrations versionadas, índices, constraints, RLS e funções transacionais. Auth por e-mail/senha exclusivamente para administradores. Storage com uploads privados e publicação controlada.
- Server Components para leitura e SEO; componentes cliente para interações; Server Actions ou Route Handlers para mutações com validação, autenticação e autorização. Credenciais administrativas somente em módulos de servidor.
- Serviços de domínio para catálogo, conteúdo, estoque, mídia, interesses, analytics, usuários e integrações. Interface e fornecedores não devem concentrar regras de negócio.
- Outbox transacional para entregas de integração, consumida por executor autenticado acionável por scheduler e por comando local. Nenhuma tarefa dependerá de timers em processo ou continuação sem garantia após a resposta HTTP.
- Vitest e testes reais de banco/RLS para domínio e integridade; Playwright para fluxos de navegador. Scripts de verificação, configuração e execução documentados.

Organização indicativa: `src/app`, `src/components`, `src/features`, `src/lib`, `src/server`, `supabase/migrations`, `supabase/seed`, `tests`, `scripts`, `docs`. Os nomes finais de módulos ficam a cargo do implementador.

O caminho de desenvolvimento preferido usa Supabase local com Docker. Se o ambiente não oferecer Docker, a aplicação usará projeto Supabase de desenvolvimento fornecido pela proprietária. Não criar um backend em memória que se apresente como equivalente ao banco real. Documentar verificações bloqueadas por infraestrutura e manter testes unitários independentes disponíveis.

## 5. Identidade, responsividade e acessibilidade

Adotar marfim #F8F5EF, champagne #E9DFCF, bronze #A78360, café #6A4936 e grafite #22201F. Usar títulos serifados editoriais e interface sans-serif, com fontes cuja licença permita o uso. A logomarca original será carregada como arquivo quando fornecida; até lá, usar identificação tipográfica provisória explicitamente documentada, sem fingir reconstrução da marca original.

Fotografia ampla, espaços generosos, hierarquia clara e poucos elementos decorativos. O painel usa os mesmos fundamentos com tabelas e formulários legíveis. No celular, tabelas admitem apresentação em lista ou rolagem contida, sem reduzir áreas de toque ou esconder ações essenciais.

Menus, drawers, diálogos, galeria e seletores precisam de teclado, foco visível, rótulos, Escape e restauração de foco. Feedback com mensagens de erro vinculadas aos campos, estados de carregamento e salvamento. Metas: WCAG 2.2 AA nos fluxos principais, contraste adequado e alvos de toque confortáveis.

Motion terá propósito: feedback de adição à seleção, entrada de drawer/menu e mudanças de mídia. Preferir opacity/transform, transições curtas e interrupção natural. Respeitar reduced-motion; evitar revelações que mantenham conteúdo invisível sem JavaScript. Mobile usa safe areas e viewport dinâmica, sem autoplay obrigatório.

## 6. Rotas e experiência pública

Rotas indicativas: `/`, `/catalogo`, `/produto/[slug]`, `/colecoes`, `/colecoes/[slug]`, `/looks`, `/looks/[slug]`, `/favoritos`, `/minha-selecao`, `/sobre`, `/contato`, `/privacidade`, `/trocas-e-devolucoes`, `/entregas` e `/termos`. Busca pode ser compartilhada pelo header e catálogo. Não criar conta obrigatória para visitantes.

Homepage gerenciada por CMS: barra institucional, header, hero desktop/mobile, categorias, escolhas, editorial, Zion in Motion, Shop the Look, novidades, mais desejados, Instagram editorial e rodapé. A administradora controla publicação e ordem de seções, imagens, textos, destinos e produtos associados.

Catálogo com busca por nome, categoria, cor, coleção e tags; filtros de categoria, cor, tamanho, preço, disponibilidade e novidades; ordenação por recentes, preço, interesse e destaque; paginação. Filtros e ordenação persistem na URL. Campos ordenáveis são allowlisted. Produtos não publicados e rascunhos não aparecem em buscas, páginas públicas, sitemap ou APIs públicas.

Produto: galeria com zoom e vídeos, preço atual/promocional, SKU, descrição, cores, tamanhos, quantidade, medidas, composição, conservação e relacionados. Selecionar cor troca mídias quando houver; escolher uma variação consulta disponibilidade real. Impedir quantidade maior que a disponível e desabilitar variações esgotadas. Mostrar discrepâncias após nova validação do servidor.

Favoritos e carrinho persistem localmente com esquema versionado e leitura defensiva. Não armazenar dados comerciais como fonte de verdade. Ao reabrir ou encaminhar seleção, conciliar disponibilidade, publicação, preço e variantes com o servidor. Itens arquivados, excluídos e inválidos são informados e exigem correção antes de encaminhar.

Shop the Look associa produtos com pontos opcionais na imagem. Cada peça exige escolha válida de tamanho/cor quando aplicável; não selecionar tamanho arbitrário. Adição conjunta informa indisponibilidades e adiciona somente escolhas confirmadas. Os mesmos princípios se aplicam aos CTAs dos vídeos.

Zion in Motion usa vídeos enviados e autorizados, poster, muted, playsInline, loop, Intersection Observer, pausa fora da tela e lazy loading. Autoplay só quando permitido e sem reduced-motion; sempre há controle de reprodução acessível. No mobile, carrossel horizontal com snap. Sem catálogo/mídias, renderizar estados vazios coerentes ou omitir seções editoriais sem material.

## 7. WhatsApp Commerce

Número internacional configurável no painel, validado e nunca fixado no código. Sem número configurado, consulta mostra indisponibilidade de contato com feedback claro; não gera URL fictícia.

Na primeira intenção de compra, pedir nome, permitindo edição e exclusão do nome salvo. Salvar localmente apenas por escolha explícita de lembrar. Nome/telefone não serão enviados como parâmetros livres de analytics. Telefone da visitante é opcional e não necessário para abrir WhatsApp.

O backend recebe IDs de variantes e quantidades, resolve nomes, preços e links canônicos e valida estoque/publicação. Rejeita seleção inválida com detalhes suficientes para correção. Registra intenção com chave de idempotência e snapshot comercial. Retorna mensagem com dados reais e URL `https://wa.me/NUMERO?text=...` codificada corretamente. Mensagem identifica nome informado, peças, variantes, quantidades, valores e total estimado; não presume reserva ou disponibilidade definitiva.

Mensagem individual e mensagem conjunta seguem os modelos fornecidos. Evitar bloqueios de popup usando navegação acionada pela cliente após validação e link de continuação acessível. Para seleções excessivamente longas, preservar todos os itens: mostrar mensagem para copiar e instrução de continuar no WhatsApp, sem truncar silenciosamente.

Estados distintos: `whatsapp_intent_created` (registro de encaminhamento), `whatsapp_click` (ação de abrir link, quando mensurável), `whatsapp_message_received` (somente webhook autenticado de provedor oficial) e venda confirmada manualmente. UI, relatórios e notificações mantêm essas distinções. Sem provedor conectado, mensagem recebida aparece como “Aguardando integração”.

## 8. Autenticação e permissões

`/admin/login`, recuperação e redefinição de senha via Supabase Auth. Sem cadastro público de administradores. Sessões em cookies seguros conforme integração oficial SSR, proteção servidor em layouts/ações/endpoints e políticas no banco. Recuperação depende de SMTP/entrega de e-mail configurados; documentar teste com caixa local quando disponível e SMTP em produção.

Primeira proprietária provisionada por procedimento de bootstrap explícito, executado no servidor por operador autorizado e sem credenciais padrão. O bootstrap não é endpoint público. Configuração de infraestrutura, chaves de deploy e SQL privilegiado não são editáveis no painel.

Proprietária gerencia todos os recursos comerciais e convida funcionários por fluxo autenticado. Permissões de funcionário por área e ação: produtos, estoque, conteúdo e consultas/relatórios. Negação por padrão. Funcionário não altera usuários, permissões, integrações, segredos ou suas próprias permissões. Preservar pelo menos uma proprietária ativa.

Autoridade vem de associações e permissões persistidas no banco, não de dados editáveis pelo usuário nem apenas de claims desatualizadas. Alterações de permissão valem na próxima operação protegida. Operações privilegiadas com chave de serviço verificam novamente ator e permissão no servidor.

Convites, reenvio, desativação e revogação de acesso geram auditoria. Validar origem e CSRF em operações com sessão cookie; validação de callback/redirect; limitação de tentativas em login, recuperação e endpoints suscetíveis a abuso. Não criar credenciais de demonstração válidas em produção.

## 9. Administração

Sidebar responsiva com visão geral, produtos, estoque, categorias/coleções, mídia, conteúdo, looks/vídeos, interesses/vendas, relatórios, equipe, integrações, configurações e histórico.

- `/admin`: estatísticas com períodos hoje, ontem, 7/30 dias, mês e personalizado; gráficos, rankings e alertas reais; zero e estado vazio quando não há eventos.
- `/admin/produtos`: busca, filtros, paginação, criação, edição, duplicação como rascunho, arquivamento, publicação, ordenação, destaques, preços e promoções. Campos essenciais primeiro; SEO, composição, conservação, medidas e tags em seções complementares.
- Produto possui abas de informações, variações/estoque, mídia e desempenho. Desempenho inclui visualizações, visitantes estimados, favoritos mensuráveis, adições, WhatsApp, taxas, origens/UTMs, seleções por cor/tamanho e evolução; comparação de produtos e CSV.
- `/admin/estoque`: quantidades por variante, limite mínimo, ajustes com motivo e histórico. Registro de venda confirmada permite múltiplos itens e baixa atômica. Nunca aceitar estoque negativo.
- `/admin/midia`: biblioteca reutilizável com upload, recorte, rotação, proporção, ordem, substituição, principal e associação por cor; vídeos com capa. Preview antes de publicar.
- `/admin/conteudo`, `/admin/looks`, `/admin/videos`: gestão editorial completa, ordenação e publicação. Preview privado; rascunhos só disponíveis em sessão autorizada. Publicação invalida cache público imediatamente ou em prazo explícito documentado.
- `/admin/interesses` e `/admin/vendas`: consultar interesses separados de vendas confirmadas. Não exibir mensagens enviadas como fato. Confirmar venda exige permissão e ação explícita.
- `/admin/equipe`: convites e permissões somente para proprietária.
- `/admin/configuracoes`: identidade, contato, WhatsApp, links, avisos e informações comerciais.
- `/admin/historico`: filtro por usuário, data, entidade e operação; logs não editáveis pelos administradores comuns.
- `/admin/integracoes/meta`, `/pushcut`, `/analytics`, `/whatsapp`: configuração, teste, status verdadeiro, histórico sanitizado e recursos futuros identificados.

Ações destrutivas exigem confirmação clara. Arquivar é o padrão para produtos referenciados. Exclusão definitiva só para registros que não comprometam histórico; referências comerciais usam snapshot e IDs preservados ou relações apropriadas. Erros de concorrência não são apresentados como salvamento concluído.

## 10. Banco e integridade

Modelos agrupados:

- Acesso: perfis administrativos, associações, funções, permissões e convites.
- Catálogo: produtos, variantes, categorias, coleções, vínculos, tags, medidas, posições e slugs únicos. SKU único onde aplicável, preço não negativo, promoção válida e combinação de variante única.
- Mídia: assets, derivados, metadados verificados, vínculos e ordenação por produto/cor; exclusão respeita reutilização.
- Editorial: seções, banners, documentos institucionais, configurações públicas, looks/itens/pontos e vídeos/vínculos. Blocos possuem schemas conhecidos, sem HTML/scripts arbitrários.
- Comercial: intenções, itens com snapshots, vendas confirmadas, itens e movimentos de estoque com motivos, ator e idempotência.
- Mensuração: sessões consentidas, eventos, atribuição saneada, agregados e alertas de estoque.
- Integração: configurações públicas/privadas separadas, outbox, entregas, tentativas e logs sanitizados.
- Auditoria: operações relevantes, ator, timestamp, entidade, tipo e diferenças permitidas sem segredos.

RLS habilitada em todas as tabelas expostas; visitantes leem exclusivamente conteúdo publicado e configurações allowlisted. Escrita administrativa segue permissões; visitantes não inserem diretamente dados arbitrários em analytics ou interesses. Endpoints de ingestão aplicam schema, limites e política de consentimento.

Vendas e ajustes usam função SQL transacional com bloqueio de linhas e verificação de autorização. Venda multi-item falha por inteiro se algum estoque for insuficiente. Chave única impede dupla baixa por repetição de envio. Idempotência vincula ator, tipo e hash do payload; payload diferente com a mesma chave é rejeitado. Ajustes absolutos usam versão esperada para não sobrescrever trabalho concorrente.

Correção de venda usa movimento reverso explícito e auditado, idempotente, sem apagar o histórico. Limites e arredondamento permanecem em inteiros; snapshots de preços não mudam com edições futuras.

## 11. Uploads e processamento

Proposta técnica: permitir imagens JPEG, PNG e WebP, com detecção pelo conteúdo, limites de dimensões/pixels e 20 MB por original. Bloquear SVG, executáveis e arquivos com tipo divergente. Derivados otimizados, remoção de metadados sensíveis e nomes gerados no servidor; originais privados preservados conforme retenção. Processamento de imagem no servidor, sem confiar apenas em extensão ou MIME enviado.

Vídeos MP4/WebM, limite inicial de 100 MB por arquivo, metadados e formato verificados, poster obrigatório para publicação. Usar upload direto autorizado ao storage para contornar limites do host; só finalizar vínculo após verificação. Otimização/transcodificação de vídeo exige executor com ferramenta apropriada ou fornecedor dedicado; se indisponível, exigir arquivo previamente otimizado e informar limite, sem alegar transcodificação inexistente.

Recorte e enquadramento produzem derivados e preservam referência ao original. Upload sem vínculo é limpo depois do período de tolerância documentado. Não apagar asset usado por conteúdo publicado sem substituição/remoção de vínculos. Objetos públicos são somente derivados aprovados; originais e rascunhos recebem URL assinada temporária e políticas equivalentes às do registro.

## 12. Eventos, analytics e privacidade

Serviço central recebe eventos tipados: navegação, produto, busca, seleção de variante, favoritos, carrinho, look, vídeo, interesse, publicação e transições de estoque. Envelope com ID único, timestamp servidor, versão, IDs comerciais, sessão quando permitida e atribuição reduzida. Não confiar em preço/identidade fornecidos pelo navegador. Consentimento nunca substitui autorização.

Proposta conservadora: analytics comportamental e fornecedores não essenciais só após consentimento. Preferências independentes para analytics e marketing; rejeitar tão fácil quanto aceitar; edição posterior. Carrinho/favoritos estritamente locais funcionam sem consentimento de analytics. Registros transacionais necessários ao interesse solicitado são separados de tracking opcional. Revogação interrompe novos rastreios e limpa identificadores opcionais.

Sessão consentida expira após 30 minutos de inatividade; visitante estimado usa identificador aleatório first-party consentido, sem fingerprinting. Retenção proposta: eventos brutos 90 dias, agregados sem identificadores 13 meses, interesses não convertidos com nome até 90 dias, auditoria comercial 12 meses configuráveis conforme política final. Dados necessários à venda têm retenção definida pela operação e orientação jurídica da proprietária antes da publicação.

Sem consentimento suficiente, exibir cobertura parcial e não apresentar contagens como total absoluto de visitantes. Robôs e tráfego de testes/admin são excluídos quando identificáveis; limites da estimativa ficam visíveis. URLs não preservam queries arbitrárias com possíveis dados pessoais; UTMs e referrers têm allowlist, limites e sanitização.

Definições: page views são eventos válidos; sessões são IDs de sessão distintos; visitantes estimados são IDs consentidos distintos; interesse comercial soma sinais apresentados separadamente. Taxa de WhatsApp por produto = sessões com clique de consulta desse produto / sessões com visualização desse produto no período, com zero seguro. Vendas e faturamento só usam vendas confirmadas. Rankings mostram critério utilizado.

CSV respeita filtros, timezone e permissões, escapa fórmulas perigosas e não inclui identificadores pessoais por padrão. Comparações usam as mesmas definições e períodos.

## 13. Integrações e processamento confiável

### Configuração de segredos

Tokens ficam em tabelas privadas com criptografia de aplicação e chave mestra em variável de ambiente exclusivamente servidor, ou vault equivalente. Painel recebe somente máscaras e status. Não devolver segredos na leitura; permitir substituição/remoção explícitas e rotação. Não registrar URL secreta completa, cookies, tokens ou payloads pessoais nos logs.

### Meta e GA4

Fornecedores desacoplados, desativados até configuração. Carregar scripts somente com configuração válida e consentimento da categoria. Eventos padrão e personalizados conforme semântica dos documentos; sem Purchase após WhatsApp. Event ID compartilhado permite futura deduplicação browser/CAPI. Estrutura CAPI completa com validação, teste, logs e transport configurável, sem envios reais antes da autorização/configuração. Nunca expor token CAPI.

GA4 configurável com Measurement ID validado; consentimento, eventos coerentes e prevenção de duplicação na navegação SPA. Controles de verificação distinguem configuração preenchida de conexão/teste bem-sucedido.

### Pushcut

Implementar contrato conforme documentação oficial verificada durante a implementação. Endpoint HTTPS restrito a formatos/hosts oficiais permitidos do Pushcut, sem redirects e sem destinos fornecidos livremente a uma função genérica de fetch. Proteção SSRF também no teste e reprocessamento. Prioridade e demais campos somente quando suportados pelo provedor/plano.

Eventos habilitáveis, templates de variáveis allowlisted, teste claramente identificado, limites de frequência, modo individual por sessão e modo resumo com intervalo padrão de 15 minutos configurável. Notificação de interesse declara “WhatsApp aberto pelo site — envio não confirmado” somente no evento correspondente de abertura; criação de intenção usa texto que não afirma abertura. Origem nunca inventada.

Outbox e entrega possuem chave de deduplicação, reivindicação atômica por lease, recuperação de execução interrompida, timeout e retry exponencial com jitter e teto de 5 tentativas. Respostas 429 respeitam Retry-After dentro dos limites; erros permanentes não repetem indefinidamente. Reprocessamento requer permissão e fica auditado. Entrega a serviço externo tem garantia at-least-once: timeout após aceite remoto pode gerar repetição se o fornecedor não oferecer idempotência; documentar esse limite sem prometer exactly-once.

Sem scheduler configurado, painel informa processamento pendente; testes e comando local podem executar o mesmo worker. Falha de integração não bloqueia catálogo, carrinho ou registro válido de interesse. Alterar/desativar integração invalida entregas pendentes incompatíveis; jobs não carregam cópias públicas de credenciais.

### WhatsApp Cloud API futura

Adaptador e rota de webhook com verificação de challenge e assinatura HMAC do corpo bruto quando configurados. Sem configuração válida, não aceitar eventos. Deduplicar IDs do provedor. Apenas evento autenticado de mensagem de entrada gera `whatsapp_message_received`; não pressupor correspondência com interesse específico sem identificador verificável. Mídia de mensagens e chatbot não fazem parte deste escopo.

## 14. Segurança, SEO e operação

Schemas e limites no servidor; cookies seguros, CSP e cabeçalhos compatíveis com integrações autorizadas; nenhuma avaliação de scripts vindos do CMS. Rate limiting persistente nas rotas sensíveis e de ingestão, com política explícita de falha. Segredos de deployment permanecem fora do painel comercial e do Git.

SEO com metadata por produto/coleção, canonicals, Open Graph, sitemap de itens publicados e robots. JSON-LD descreve somente preços e disponibilidade reais. Preview/admin excluídos de indexação, com autenticação efetiva. Imagens responsivas e dimensões explícitas, carregamento prioritário apenas no hero relevante, fontes otimizadas e cache invalidado por publicação/estoque conforme necessidade. Confirmação comercial sempre lê estoque atual.

Backups e recuperação: documentar responsabilidade do provedor, configurações exigidas, exportação de banco e backup separado de Storage; backups do banco não substituem backup dos arquivos. Criar procedimento de restauração e validação em ambiente isolado. Metas operacionais propostas: RPO de 24 horas e RTO de 1 dia útil, condicionados ao serviço/plano e procedimento contratados; não afirmar cobertura sem configuração e ensaio.

Documentos jurídicos serão estruturas editáveis com indicação de conteúdo pendente de revisão; não inventar CNPJ, endereço, política comercial, prazo de entrega ou obrigações específicas. Publicação exige informações oficiais, políticas revisadas e contato real.

## 15. Materiais e dados iniciais

Não foram fornecidos logo separado, fotos individuais, vídeos, catálogo real, número de atendimento ou credenciais. Nenhum deles impede construir código, migrations e testes. Impedem validar serviço externo ou publicar catálogo comercial autêntico até fornecimento.

Fixtures e seed demonstrativo ficam em caminho de desenvolvimento explícito, desabilitado por padrão em produção. Demonstração exibe identificação persistente de exemplos. Seed de produção não cria produtos fictícios nem usuários com senha conhecida. Usar assets locais próprios/fornecidos ou placeholders reconhecíveis em testes; não extrair catálogo da imagem de referência nem copiar Instagram.

## 16. Verificação e critérios de aceitação

Executar lint, TypeScript, testes unitários/domínio, build de produção e testes de integração com banco real. Cobrir RLS como visitante, funcionário sem permissão, funcionário autorizado e proprietária. Testar negação de leitura de rascunhos/segredos e tentativa de autoelevação.

Testar atomicidade de venda multi-item, concorrência da última unidade, idempotência, conflito de edição, snapshots de preço, validação de variantes e preço revalidado. Uploads testam MIME falso, dimensões excessivas, limites, recorte, reorder, vínculo de cor e acesso a originais.

Playwright em mobile, tablet e desktop: busca/filtros, produto, favoritos, seleção, quantidades, remoção, nome, mensagem individual/conjunta e codificação de acentos; menu, foco, galeria e vídeos; login/recovery, CRUD, publicação refletida na vitrine, estoque, CMS, permissões, relatórios e auditoria. Testes usam fixtures isoladas e não disparam mensagens a clientes.

Eventos: consentimento negado/aceito/revogado, navegação SPA sem duplicatas indevidas, atribuição, filtros de período e estado vazio. Integrações: servidor HTTP de teste, segredo mascarado, SSRF, timeout, 429, falha permanente, retries, deduplicação, resumo e assinatura inválida. Testes simulados de fornecedor são identificados como tal e não equivalem a integração real validada.

Aceitação final inclui os quinze critérios do documento administrativo, os vinte fluxos de teste do projeto completo e requisitos de loja pública. Relatar separadamente: implementado e verificado; implementado mas dependente de infraestrutura; pendente. Não substituir integração real por mocks em modo normal.

## 17. Ordem de construção e entrega

1. Fundação: projeto, tokens visuais, modelo, migrations, RLS, Auth, domínio e configuração local.
2. Loja: CMS público, homepage, catálogo, produto, busca, coleções e layouts responsivos.
3. Comércio: variantes, favoritos, carrinho, WhatsApp validado e looks.
4. Administração: bootstrap, equipe, CRUD, mídia, estoque transacional, conteúdo e auditoria.
5. Mensuração/integrações: eventos, consentimento, dashboard, relatórios, outbox, fornecedores e webhooks.
6. Refinamento: vídeos, motion, acessibilidade, SEO, performance e testes integrados.
7. Entrega: README, `.env.example`, scripts, migrations, configuração, integrações, deploy, backup, recuperação e checklist de publicação.

Esta sequência organiza dependências, sem reduzir o escopo a uma vitrine. Etapas só podem ser consideradas concluídas com funcionalidades e verificação correspondentes.

## 18. Chamadas técnicas delegadas ao implementador

Ficam a cargo do implementador: versões estáveis compatíveis, bibliotecas auxiliares, nomes finais de módulos e rotas secundárias, índices e detalhes de SQL, componentes acessíveis, curvas/durações de motion, limites ajustados após medição e estrutura dos testes. Qualquer escolha que elimine requisito, crie custo externo obrigatório inesperado ou altere a experiência comercial deve voltar à pessoa solicitante.

Este documento será revisado por um agente independente antes da aprovação. Após aprovação, o próximo artefato será o plano de implementação. Como o diretório ainda não é um repositório Git, o primeiro commit da documentação será feito junto à inicialização autorizada da arquitetura, sem bloquear a revisão do desenho.

## 19. Referência completa de aceitação

Esta seção incorpora os contratos referenciados anteriormente; o plano pode partir deste desenho sem depender dos anexos da conversa. Revisão independente concluída: sua única questão foi a dependência dos anexos para estes contratos, resolvida pela inclusão abaixo. Não restaram perguntas de negócio adicionais produzidas pela revisão.

### Quinze critérios administrativos obrigatórios

1. Proprietária entra com autenticação segura.
2. Cadastra produto completo.
3. Altera nome, descrição, valor, cor e tamanho.
4. Envia e reorganiza fotografias.
5. Publica e despublica produtos.
6. Atualiza estoque por variante.
7. Edita banners e seções da homepage.
8. Visualiza estatísticas reais de tráfego, com limites de mensuração indicados.
9. Identifica produtos mais procurados.
10. Analisa cliques para WhatsApp separadamente de vendas.
11. Configura integrações autorizadas.
12. Consulta histórico de alterações.
13. Executa essas funções pelo celular.
14. Alterações administrativas refletem corretamente na loja pública.
15. Pessoas sem autorização não acessam nem modificam dados administrativos.

### Vinte fluxos de teste obrigatórios

1. Navegação mobile: header, menu, busca, catálogo e retorno sem perda indevida de seleção.
2. Pesquisa de produtos: termos suportados, filtros, paginação e resultado vazio verdadeiro.
3. Seleção de variações: cores, tamanhos e mídias correspondentes.
4. Estoque: disponibilidade por variante, esgotado e concorrência.
5. Adição ao carrinho: seleção válida, persistência e feedback.
6. Alteração de quantidade: inteiros válidos, limites e revalidação.
7. Remoção: item, seleção vazia e total recalculado.
8. Mensagem WhatsApp: nome informado, dados reais de um/vários itens e preço servidor.
9. Link WhatsApp: número internacional, acentos, quebras de linha e codificação correta.
10. Cadastro: criação completa, edição, duplicação, arquivamento, publicação e despublicação.
11. Imagens: envio múltiplo, segurança, recorte, ordem, principal, substituição e publicação.
12. Autenticação: login, sessão, logout e recuperação/redefinição de senha.
13. Restrições: visitante, funcionário autorizado/não autorizado, autoelevação e proprietária.
14. Tracking/consentimento: aceitar, rejeitar, alterar e revogar; ausência de identificadores opcionais quando negado.
15. Eventos: ingestão válida, validação, idempotência, agregação e relatórios reais.
16. Pushcut teste: evento identificado como teste, payload aceito e status coerente.
17. Falhas de webhook: timeout, 429, assinatura inválida, erro permanente e logs sanitizados.
18. Deduplicação de notificações: por sessão/evento, modo resumo, retry e reprocessamento.
19. Vídeos: visibilidade, autoplay permitido/bloqueado, pausa acessível e reduced-motion.
20. Responsividade: loja e administração em celular, tablet e desktop; teclado e acessibilidade.

### Modelos obrigatórios de mensagem

Os campos entre chaves são interpolados exclusivamente com nome efetivamente informado e dados comerciais validados no backend. Formatação monetária pt-BR; preço promocional vigente quando aplicável. Não enviar as chaves literais nem valores de exemplo.

Produto individual:

```text
Olá! Me chamo {nome} e estou entrando em contato através do site da Zion Maison.

Tenho interesse no seguinte produto:

Produto: {produto}
Cor: {cor}
Tamanho: {tamanho}
Quantidade: {quantidade}
Valor exibido: {preço_unitário}

Link do produto: {url_canônica}

Gostaria de confirmar a disponibilidade e saber como posso finalizar minha compra. Obrigada!
```

Carrinho:

```text
Olá! Me chamo {nome} e vim através do site da Zion Maison.

Gostaria de consultar a disponibilidade das seguintes peças:

{para cada item, numerado:
{número}. {produto}
Cor: {cor}
Tamanho: {tamanho}
Quantidade: {quantidade}
Valor unitário: {preço_unitário}
Subtotal estimado: {quantidade × preço_unitário}
Link: {url_canônica}
}

Total estimado: {soma_dos_subtotais}

Gostaria de receber as informações para finalizar meu pedido!
```

A inclusão de preço unitário e subtotal na seleção é decisão técnica para eliminar ambiguidade quando quantidade for maior que um. Na consulta individual, incluir subtotal estimado quando houver mais de uma unidade.

### Contratos de eventos e integrações

Eventos comportamentais internos: `site_visited`, `page_view`, `view_item`/`product_viewed` (um evento canônico com adaptador, sem dupla contagem), `search`, `select_item`, `select_variant`, `add_to_cart`/`product_added_to_cart`, `remove_from_cart`, `view_cart`, `cart_started`, `add_to_wishlist`, `remove_from_wishlist`, `shop_the_look_click` e `video_product_click`.

Eventos de contato: `product_inquiry`, `cart_inquiry`, `whatsapp_intent_created`, `whatsapp_click` e `whatsapp_message_received`. Eventos comerciais/operacionais: `sale_confirmed`, `sale_reversed`, `stock_adjusted`, `product_low_stock`, `product_out_of_stock` e `new_product_published`. Transições para estoque baixo/esgotado geram alerta uma vez por transição, com rearmamento após reposição.

Adapter Meta: `PageView`, `ViewContent`, `Search`, `AddToCart`, `AddToWishlist`; `Contact` ou `Lead` para contato/intenção conforme a ação; `InitiateCheckout` somente no passo semanticamente correspondente ao início do encaminhamento comercial, nunca na mera abertura do carrinho. Personalizados: `WhatsAppClick`, `WhatsAppProductInquiry`, `WhatsAppCartInquiry`, `ShopTheLookClick`, `VideoProductClick`. `Purchase` só se uma futura configuração autorizada enviar venda realmente confirmada, nunca por clique.

Parâmetros comerciais allowlisted: `content_ids`, `content_name`, `content_type`, `value`, `currency=BRL`, `category`, `selected_size` e `selected_color`. Não usar nome/telefone/e-mail da cliente como parâmetros livres. IDs e valores resolvidos no servidor para eventos comerciais. Incluir `event_id` na infraestrutura compartilhada com CAPI.

GA4 usa `page_view`, `view_item`, `search`, `add_to_cart`, `remove_from_cart`, `view_cart`, `select_item`, `add_to_wishlist` e eventos customizados de WhatsApp/look/vídeo, com transporte sujeito a consentimento e configuração.

UTMs suportadas: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`. Origem desconhecida permanece desconhecida; não atribuir Instagram sem evidência. Dashboard inclui sessões, visitantes estimados, page views, visualizações de produto, rankings por visualização/interesse, favoritos mensuráveis, carrinhos iniciados, cliques/intenções WhatsApp, taxas e estoque ativo/baixo/esgotado. Desempenho por produto inclui também cores/tamanhos selecionados, UTMs, origens e evolução histórica.

Pushcut consome eventos individualmente habilitados, incluindo nova sessão, interesse, abertura WhatsApp, mensagem recebida autenticada, estoque baixo/esgotado e publicação. Nova sessão não equivale a troca de página. Templates de teste são explicitamente marcados. Nenhuma configuração ativa envio real sem endpoint autorizado.
