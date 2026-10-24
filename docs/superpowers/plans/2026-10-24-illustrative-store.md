# Vitrine ilustrativa editável

**Pedido:** montar a loja com imagens e exemplos completos, editáveis posteriormente.

**Decisões:** sete imagens editoriais geradas para a marca; seis peças ilustrativas, quatro categorias, duas coleções, banner, história, editorial, looks, Instagram e exemplos de vídeos verticais derivados das imagens. Tudo cadastrado nas estruturas existentes do painel. Produtos marcados pela tag `ilustrativo`, sem estoque fictício e sem gerar interesses de compra. Um controle simples na publicação permite converter uma peça de exemplo em produto real depois de trocar os dados.

**Execução:** importar mídia pelo mesmo processamento/verificação da biblioteca; adicionar registros com identificadores estáveis, sem substituir conteúdo preexistente. Preservar o ativo já existente. Scripts só acrescentam itens ausentes; reexecução não desfaz edição da cliente. Manter cópias otimizadas dos assets no projeto. Testes isolados não dependem dos dados reais da loja.

- [x] Preparar imagens e vídeos ilustrativos e cadastrar mídia verificada.
- [x] Verificar identificação, bloqueio de compra e conversão de exemplo em produto real.
- [x] Cadastrar catálogo e seções editáveis sem alterar itens existentes.
- [x] Verificar loja preenchida em desktop e celular, painel, testes e produção.

**Validação:** 47 testes de lógica/PostgreSQL e 40 testes de navegador aprovados, lint sem avisos e build de produção concluído. Importação reexecutada sem novas inserções (0 produtos, 0 conteúdos). Verificação da loja preenchida em 1440×1000 e 390×844: dez URLs públicas acessíveis, todas as imagens carregadas, três Reels 1080×1920 com reprodução/looping, sem transbordamento horizontal. Produto de exemplo sem compra, sem JSON-LD de oferta e com noindex. Migração aplicada e guarda de intenção/venda testada no Supabase com rollback; nenhum interesse/venda de teste permaneceu no banco. Revisão independente: dois achados corrigidos (fluxo SQL real e retomada de importação), sem pendências na segunda revisão.
