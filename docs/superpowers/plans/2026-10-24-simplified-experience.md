# Zion Maison — experiência simplificada

**Objetivo:** permitir que a proprietária cuide da loja sem conhecer termos técnicos, com prévia fiel e imediata dos produtos, e elevar a leitura e o movimento da vitrine.

**Decisões autorizadas:** início focado em tarefas; navegação secundária agrupada; cadastro guiado por informações, fotos, opções e publicação; prévia persistente no desktop e acessível no celular; detalhes avançados recolhidos. Lora e Manrope locais com licenças OFL. Movimento de entrada e feedback por transform/opacity, respeitando redução de movimento.

**Arquitetura:** preservar API, permissões, transações de estoque e mídia verificada. Reutilizar o cartão público na prévia sem efeitos comerciais. Relatórios continuam na rota própria. Não inserir mercadorias fictícias no banco.

- [x] Escrever e executar testes de prévia reativa, segurança da prévia e navegação simplificada.
- [x] Implementar início, navegação agrupada e cadastro guiado com gerador de combinações sem duplicação.
- [x] Implementar fontes locais, legibilidade, hierarquia e motion progressivo na vitrine.
- [x] Verificar testes, tipagem, lint, produção, desktop e celular; documentar operação.

**Validação:** 44 testes de lógica/banco e 38 testes E2E aprovados; regressões adicionais de foco móvel e prévia integralmente visível também verificadas. Lint sem avisos, tipagem e build de produção concluídos. Smoke da instância final: loja/catálogo 200, rotas de teste 404, job sem credencial 401, painel sem autenticação redirecionado. Capturas em desktop, tablet e celular; sessão real de proprietária e navegação para novo produto verificadas sem gravar mercadoria.
