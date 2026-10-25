# Publicação e continuidade

## Ambientes

Mantenha Supabase e variáveis separados para desenvolvimento, preview e produção. Use Node.js 22 ou superior. O comando de build é `pnpm build` (Webpack); `pnpm start` serve o resultado. O build não depende de um catálogo preenchido.

Na Vercel, importe o repositório como Next.js e configure as variáveis de `.env.example`. Use o domínio final HTTPS em `NEXT_PUBLIC_SITE_URL`; esse valor também valida a origem de mutações. Cadastre o mesmo domínio nas URLs de Auth e atualize templates/SMTP. Faça novo deploy após alterar variáveis públicas.

Migrations são uma etapa explícita, anterior ao deploy que as usa. Não são executadas automaticamente durante o build. Faça backup e valide em desenvolvimento primeiro. Mudanças futuras devem usar migrations adicionais compatíveis com a versão anterior durante a transição.

## Worker e retenção

`vercel.json` agenda `/api/jobs` diariamente às 06h UTC, compatível com o plano Hobby atual. Configure `CRON_SECRET`; a rota exige `Authorization: Bearer SEGREDO`. Notificações, resumos e limpeza seguem essa frequência; para operação comercial com processamento próximo do tempo real, configure um agendador seguro mais frequente ou um plano compatível antes de ativar os provedores. O horário no Hobby pode variar dentro da hora; veja [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Alternativamente, um agendador seguro pode executar `pnpm worker` com as variáveis do ambiente. Não use duas agendas sem necessidade. O banco suporta disputa por jobs, mas não há benefício em execuções excessivas. Cada rodada reivindica até 20 trabalhos e pode durar até 300 segundos. Acompanhe filas quando o volume crescer.

O worker processa notificações e limpeza de mídias, cria resumos pendentes e executa retenção. Tentativas têm lease de dez minutos, token de posse, limite de cinco e recuo com jitter; falhas definitivas aparecem no painel e permitem nova tentativa. Resumos recuperam até 96 intervalos fechados por rodada desde o cursor. A recuperação de intervalos depende dos eventos ainda retidos. Entregas externas são **pelo menos uma vez**: uma interrupção após o provedor aceitar e antes de gravar sucesso pode causar repetição.

Eventos brutos e interesses com nome são retidos por aproximadamente 90 dias. Antes de excluir eventos, o job salva totais diários sem identificadores; esses totais ficam por 13 meses. Não permitem recalcular visitantes únicos, atribuição ou desempenho por produto. O dashboard distingue o arquivo agregado do detalhamento recente. Históricos de vendas, movimentos e auditoria não são excluídos automaticamente: a proprietária precisa definir a retenção comercial aplicável antes do lançamento.

Jobs concluídos ou com falha são limpos após 90 dias; pendentes não são descartados pela retenção. Revise falhas regularmente. A exclusão de mídia é persistente e tenta remover original e derivados; referências em uso impedem a exclusão. Uploads interrompidos antes da criação do registro podem deixar objetos órfãos: audite periodicamente os buckets, compare com `media_assets` e preserve um prazo de segurança antes de remover qualquer órfão. Não há coletor automático para uploads abandonados.

## Backups

Defina periodicidade e RPO/RTO conforme a operação. Verifique o backup/PITR disponível no plano; um backup do Postgres não inclui os bytes dos objetos do Storage. Mantenha cópia separada dos buckets `originals` e `published`, do banco, das migrations e dos segredos em cofre. Fonte: [backups do Supabase](https://supabase.com/docs/guides/platform/backups).

Teste restauração em um projeto separado: restaure esquema e dados, copie os arquivos, reconfigure URLs e chaves, valide Auth, permissões, catálogo, imagem, venda e worker. Não considere backup verificado sem esse ensaio. Registre data, duração e resultado.

## Recuperação

- Falha de deploy: promova a versão anterior do aplicativo; não reverta o banco apagando dados. Avalie compatibilidade de esquema.
- Falha de provedor: mantenha o catálogo disponível, consulte logs sanitizados e retome os jobs pelo painel após corrigir a causa.
- Credencial exposta: substitua no provedor e no ambiente, invalide sessões quando aplicável e verifique acessos. Não publique a credencial no relatório.
- Troca da chave de criptografia: reconfigure os segredos no painel com a nova chave. Apenas substituir a variável torna os segredos antigos ilegíveis.
- Estoque divergente: use ajuste com motivo e versão atual; não edite SQL diretamente nem apague movimentos para esconder divergências.

Monitore erros da aplicação, falhas do cron, tamanho das filas, crescimento do banco/Storage e execução da retenção. Os logs devem guardar códigos e referências técnicas, sem nomes, mensagens privadas, tokens ou senhas.
