# Guia da operação

## Catálogo e estoque

Cadastre categorias/coleções antes dos produtos. No produto, preencha nome, slug, descrição, preço em reais, composição, cuidados, medidas, SEO e tags. Crie variações por cor e tamanho; SKU é opcional. A biblioteca fornece imagens verificadas, associação por cor e ordenação da galeria. Use a prévia antes de publicar.

A publicação exige mídia e variação ativa. Um produto sem estoque continua disponível para consulta quando publicado, mas não pode entrar na seleção com quantidade indisponível. Arquivar retira da loja sem apagar o histórico. Não publique peças ou preços de demonstração.

O estoque inicial e os ajustes usam movimentos com motivo e controle de versão. A venda confirmada é uma ação administrativa explícita: baixa estoque em transação e guarda os preços daquele momento. Repetir o mesmo envio não duplica a baixa. O estorno gera o movimento inverso e só pode ocorrer uma vez. Se alguém alterar o estoque durante sua edição, atualize a tela antes de tentar novamente.

## Seleção e WhatsApp

A cliente escolhe a variação e a quantidade, reúne interesses e informa o nome antes de preparar a mensagem. A API consulta produtos, preços e estoque atuais; valores enviados pelo navegador não são autoridade. O registro de interesse **não reserva estoque**. A mensagem leva produtos, cor, tamanho, quantidade, preço e links.

O botão abre o link oficial `wa.me`. Mensagens muito longas têm opção de copiar o texto completo e abrir o canal, sem truncar itens silenciosamente. A seleção só é limpa por ação da cliente. Favoritos e seleção ficam neste navegador; o nome só é lembrado se ela escolher.

Abrir o link não confirma que a mensagem foi enviada, recebida ou que houve venda. Métricas e notificações distinguem interesse, clique e venda manual. Não há pagamento, checkout, cálculo automático de frete ou confirmação automática de compra.

## Mídias e conteúdo

Use a biblioteca para enviar imagens JPEG/PNG/WebP até 20 MB; o servidor inspeciona os bytes, aplica recorte/rotação, remove metadados e gera WebPs responsivos. Originais são privados, com download temporário autenticado. Uma nova edição cria outro ativo, preservando o original. Não envie SVG como imagem de catálogo.

Vídeos MP4 H.264 ou WebM compatível têm limite de 100 MB, cinco minutos e 3840 pixels por dimensão (até 8,29 megapixels). O servidor mede fluxo, dimensões e duração; não realiza transcodificação. Envie vídeo já otimizado e selecione imagem de capa. Teste reprodução nos aparelhos do público antes de publicar.

No CMS, edite banner, imagens desktop/celular, textos, seções, páginas institucionais, Instagram editorial, looks e vídeos. Publicação e ordem pertencem ao conteúdo. A ordem dos blocos principais da homepage é alterada em Configurações; a ordem dos editoriais internos fica no CMS. Novidades usam data de criação; mais procuradas usam pontuação de eventos consentidos. Sem eventos, a ordenação tem desempate estável; não exibe contagens inventadas.

O Instagram é curadoria de imagens e links cadastrados, sem integração automática com uma conta. Looks relacionam produtos reais. Fotos de produtos e o logotipo original ainda precisam ser fornecidos pela loja; a referência visual anexada não foi tratada como catálogo vendável.

## Equipe

A proprietária convida funcionários e atribui permissões. Desativar um perfil bloqueia novas operações mesmo quando a sessão de Auth ainda existe. Funcionários não podem elevar a própria função. A última proprietária ativa não pode ser desativada. Use recuperação de senha e convites por e-mail; não compartilhe uma conta entre funcionários.

## Métricas e privacidade

A seleção usa armazenamento essencial. Estatísticas e identificadores opcionais só são criados com consentimento. Marketing tem preferência própria. O rodapé permite revogar ou alterar preferências, inclusive refletindo a alteração em outras abas.

Relatórios detalhados usam eventos retidos por 90 dias: sessões, visitantes estimados, páginas, produtos, favoritos, seleção e cliques. Taxas usam sessões como denominador; bloqueadores e recusa de consentimento afetam a cobertura. Visitantes são estimativas por navegador, não identificação de pessoas. O arquivo de totais diários preserva 13 meses sem identificadores e é apresentado separadamente. Exporte CSV com filtros de período e produto quando necessário.

## Integrações

Tudo começa desativado. Salvar uma configuração não comprova entrega no provedor. Segredos são criptografados no banco e nunca retornam completos na API de leitura.

- **GA4:** informe Measurement ID `G-...`; o SDK só é carregado com estatísticas autorizadas. Valide eventos no ambiente de testes do Google.
- **Meta Pixel:** informe Pixel ID numérico; carregamento depende do consentimento de marketing. Eventos de WhatsApp são personalizados. Nunca são enviados como `Purchase` apenas por clicar no link.
- **Meta CAPI:** há um adaptador opt-in no servidor, com ID de evento para deduplicação, sem despacho automático. Exige integração adicional autorizada, versão Graph suportada, token, consentimento e homologação. Configurar Pixel no painel não ativa CAPI.
- **Pushcut:** informe a URL secreta exata `https://api.pushcut.io/SEGREDO/notifications/NOME`. O servidor restringe host, protocolo, formato e redirects. Selecione eventos, modo individual/resumo, intervalo e limite por hora. Execute teste explícito, confira HTTP/logs e o dispositivo. O worker precisa estar agendado.
- **WhatsApp Business Platform:** o atendimento normal usa `wa.me` e dispensa API. Existe webhook futuro em `/api/webhooks/whatsapp`, condicionado a `WHATSAPP_VERIFY_TOKEN` e `WHATSAPP_APP_SECRET`. Apenas mensagens recebidas em payload assinado geram o evento de recebimento; o texto privado não é armazenado. A integração oficial, sua conta empresarial, permissões e assinatura de webhooks ainda precisam ser configuradas e homologadas. Não há automação de respostas ou envio de templates.

Antes de ativar provedores, revise as finalidades e publique os textos reais de privacidade, termos, entrega, trocas e identificação comercial.
