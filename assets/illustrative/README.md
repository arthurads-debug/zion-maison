# Coleção ilustrativa Zion Maison

Sete imagens originais geradas por IA para a apresentação solicitada da loja. As roupas, modelos e preços não representam um catálogo comercial real. Os três MP4s são movimentos editoriais de oito segundos sobre essas imagens, em 1080 × 1920, H.264, sem áudio, próprios para looping.

- `images/`: cópias WebP otimizadas, preservadas no projeto.
- `videos/`: exemplos verticais editáveis pela biblioteca.
- `sources.json`: identificação da geração e dimensões.
- `published.json`: IDs e URLs públicas da mídia/catálogo no Supabase; sem credenciais.
- `originals/`: cópias locais dos PNGs gerados, ignoradas pelo Git. A biblioteca também preserva os originais enviados de forma privada.

A importação não ocorre automaticamente ao iniciar a loja. O comando explícito é `pnpm seed:illustrative`, com `.env.local` configurado. Ele usa o processamento normal de imagens/vídeos, preserva o ativo preexistente, acrescenta apenas registros ausentes e não desfaz as edições da cliente. Importações de produto interrompidas só são retomadas enquanto mantêm o marcador interno, versão zero e status de rascunho.

Para editar, abra Produtos, Conteúdo da loja, Categorias e coleções, Looks ou Vídeos da loja. Para tornar uma peça comercial, troque imagens, dados e valores, desmarque **Produto ilustrativo** na etapa Publicação e registre o estoque real. Até isso acontecer, a interface e os próprios RPCs de intenção/venda bloqueiam a compra do exemplo.
