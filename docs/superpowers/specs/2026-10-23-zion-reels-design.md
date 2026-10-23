# Zion in Motion — Reels verticais

Solicitação: área na homepage com vídeos em looping no formato Instagram Reels, 1080 × 1920 px. A proporção visual é 9:16 e deve ser preservada em telas menores, sem exigir largura física de 1080 px no navegador.

Decisão de implementação dentro da autonomia já concedida: aproveitar o conteúdo `video` publicado do CMS e exibir uma faixa horizontal com navegação por setas e deslize. Cada vídeo repete seu próprio conteúdo; a faixa não se move sozinha enquanto a pessoa lê ou interage. Um feed vertical ocuparia excessivamente a homepage; um iframe Instagram acrescentaria dependência de terceiros e rastreamento à apresentação dos arquivos da marca.

Reprodução silenciosa, inline e automática somente quando o cartão está visível. Pausar ao sair da área visível ou ocultar a aba. Respeitar movimento reduzido e a pausa escolhida pela pessoa, com controle de reprodução acessível. Navegação da faixa respeita movimento reduzido. Sem reprodução automática de áudio.

A área fica visível com uma mensagem editorial de “em breve” quando não existem vídeos publicados. Não fabricar vídeos comerciais. A publicação continua exigindo arquivo e capa, já previstos no painel; adicionar orientação de exportação vertical. Não alterar banco ou retomar nesta tarefa a conexão Supabase que ficou incompleta.

Verificação: homepage vazia, proporção medida, atributos de loop/silêncio/inline, reprodução real de fixture isolado, pausa, navegação horizontal, ausência de overflow e movimento reduzido. Verificar desktop e viewport móvel; aparelhos físicos continuam necessários para homologar Safari/iOS e política de autoplay do dispositivo.
