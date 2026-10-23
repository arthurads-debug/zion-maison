# Homologação após conectar serviços reais

Esta lista está pendente porque ainda não existe projeto Supabase da loja. Execute em desenvolvimento, com catálogo de teste identificado. Não use dados pessoais reais desnecessários. Registre data, ambiente, resultado e referência técnica sanitizada.

## Infraestrutura e acesso

- [ ] Aplicar as oito migrations e conferir buckets privado/público.
- [ ] Criar primeira proprietária pelo bootstrap; confirmar que a repetição é recusada.
- [ ] Login, logout, convite e recuperação em navegador e celular; testar link expirado e abertura do e-mail em outro aparelho.
- [ ] Anônimo não lê rascunhos, originais, interesses, relatórios, equipe ou integrações.
- [ ] Funcionário sem permissão recebe 403 também por requisição direta; perfil desativado perde acesso.
- [ ] Última proprietária continua protegida e senha/token não aparece em logs.

## Catálogo, mídias e venda

- [ ] Criar categoria, coleção, produto, variações e estoque; salvar/editar/reabrir com persistência.
- [ ] Enviar imagem real, girar/recortar, verificar dimensões, galeria por cor, derivados e original privado.
- [ ] Enviar vídeo real compatível e capa; rejeitar arquivo falso, tipo divergente e excesso de limites.
- [ ] Referência em uso impede apagar mídia; mídia livre remove objetos; falha temporária mostra pendência e retentativa conclui a limpeza.
- [ ] Prévia e publicação tornam o produto visível; rascunho e arquivamento retiram da loja.
- [ ] Busca instantânea, filtros de cor/tamanho/preço/categoria/coleção, paginação e ordenação usam dados reais.
- [ ] Favoritos e seleção persistem; variação indisponível não entra; preço antigo é reconciliado antes da mensagem.
- [ ] Nome, acentos, itens e links completos chegam ao WhatsApp correto; testar fallback de mensagem longa.
- [ ] Interesse não altera estoque. Venda confirmada baixa uma vez; estorno repõe uma vez.
- [ ] Dois operadores tentam vender a última unidade simultaneamente em conexões reais: somente um conclui. Testes PGlite locais cobrem idempotência e conflitos de versão, não esse ensaio distribuído.

## Conteúdo e relatórios

- [ ] Alterar banner desktop/celular, ordem da homepage, páginas, configurações, look e vídeo; conferir reflexo público.
- [ ] Sem consentimento não há SDKs, eventos comportamentais ou identificadores opcionais.
- [ ] Consentir, revogar em outra aba, reconsentir e recarregar; verificar rede, cookies e identificação local.
- [ ] Eventos reais populam dashboard; contato com vários produtos conta um clique global e associa os produtos corretos.
- [ ] Períodos, ranking, origens, CSV e totais de venda conferem com dados de teste conhecidos.
- [ ] Worker transforma eventos antigos em arquivo diário e remove dados pessoais conforme retenção; repetir não duplica agregados.

## Provedores e lançamento

- [ ] GA4/Meta verificados nas ferramentas oficiais, sem `Purchase` fictício.
- [ ] Pushcut entrega teste, evento e resumo; respeita limite; recupera intervalos após pausa; falhas/retries aparecem corretamente.
- [ ] Se API oficial WhatsApp for ativada, verificar assinatura, duplicação e recebimento real. Sem ela, não anunciar detecção de mensagens recebidas.
- [ ] Cron autenticado ativo e monitorado; requisição sem segredo é recusada.
- [ ] Backup separado de banco/arquivos/segredos e restauração ensaiada.
- [ ] Domínio, HTTPS, redirects, SMTP, WhatsApp, logo, fotos, preços e políticas comerciais finais conferidos.
- [ ] Revisão visual em desktop, tablet e aparelhos móveis reais, teclado e leitor de tela; verificar vídeo e WhatsApp no iOS/Android.

Publicação comercial depende de concluir os itens aplicáveis. A aplicação entregue não foi publicada nem conectada a contas externas.
