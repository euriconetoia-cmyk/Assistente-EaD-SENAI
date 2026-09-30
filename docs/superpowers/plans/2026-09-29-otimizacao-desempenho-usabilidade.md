# Otimização de desempenho, confiabilidade e usabilidade — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduzir leituras repetidas e concorrência desnecessária no Moodle, tornar a atualização deliberada e rastreável e melhorar a navegação sem perder nenhuma garantia acadêmica de confirmação.

**Architecture:** Introduzir um `RequestBroker` local, compartilhado por todos os content scripts, com chave canônica, deduplicação de requisições em voo, cache por aba com TTL, fila global de no máximo duas leituras e cancelamento por escopo. A abertura de páginas passa a mostrar dados armazenados e uma ação de atualização explícita. O painel, os badges e o dashboard exibem escopo, horário e cobertura, enquanto as consultas de pendências usam `requiregrading` como fonte única.

**Tech Stack:** JavaScript vanilla em Content Scripts MV3, Chrome Storage/Alarms, CSS existente, `node:test`, GitHub Actions. Sem framework, bundler ou nova dependência.

**Spec:** `docs/superpowers/specs/2026-09-29-otimizacao-desempenho-usabilidade-design.md`

## Global Constraints

- Manter Manifest V3, hosts atuais, permissões atuais e nenhum serviço externo.
- Não alterar nota, status, mensagem ou progresso sem a releitura de confirmação já exigida pelo projeto.
- Associar sempre curso, atividade e CMID exatos. Falhas de leitura devem permanecer como pendentes, nunca como concluídas.
- Não colocar conteúdo acadêmico, nomes, textos de alunos ou credenciais na telemetria.
- Preservar o carregamento por scripts globais e a ordem de `manifest.json`.
- Cada alteração deve atualizar os testes afetados, `docs/contexto/task.md`, `docs/contexto/memory.md` quando houver decisão relevante e `CHECKSUMS.sha256`.
- Executar `npm test`, `npm run validate` e `npm run integrity` antes de declarar cada etapa concluída.
- A homologação autenticada em `ead.senai.br` e `ead.fieg.com.br` é obrigatória para aceite final, mas depende de acesso fornecido pelo responsável.

## Review Focus

- Nenhuma rota dispara varredura remota apenas por abrir a página.
- O limite de duas requisições inclui coletores, badges, importador, fluxo em lote e atualização manual.
- Chaves de cache isolam host, rota, parâmetros, curso, CMID e página.
- Um resultado zero de pendências não faz consulta redundante em outra tela.
- Cancelamento interrompe itens na fila, informa cobertura parcial e não altera dados acadêmicos.
- Os fluxos de correção e lote continuam revalidando o Moodle antes de confirmar sucesso.

---

## Task 1: Criar o broker de requisições e sua base de testes

**Files:**

- Create: `content/request-broker.js`
- Modify: `manifest.json`
- Create: `tests/request-broker.test.js`
- Modify: `tests/content-scripts.test.js`
- Modify: `docs/contexto/task.md`
- Modify: `docs/contexto/memory.md`
- Modify: `CHECKSUMS.sha256`

- [x] **Step 1: escrever testes unitários isolados para o contrato do broker.**

  Em `tests/request-broker.test.js`, carregar `content/namespace.js` e `content/request-broker.js` em `vm`, injetando um `fetch` controlado. Cobrir:

  - normalização estável da chave, inclusive ordenação de parâmetros de URL;
  - duas chamadas idênticas simultâneas compartilhando a mesma Promise;
  - reutilização de cache antes do TTL e nova leitura após expirá-lo;
  - execução máxima de duas leituras simultâneas;
  - prioridade `interactive` à frente de `background` na fila ainda não iniciada;
  - cancelamento de itens enfileirados por `scopeId`;
  - timeout e falha que não ficam em cache.

  Rodar `node --test tests/request-broker.test.js` e confirmar falha inicial por módulo ausente.

- [x] **Step 2: implementar `MAT.requestBroker` sem dependências.**

  Criar `content/request-broker.js` expondo, no namespace existente:

  ```js
  MAT.requestBroker = {
    fetchDocument({ url, cacheKey, ttlMs, priority, scopeId, timeoutMs, force }),
    cancelScope(scopeId),
    invalidate(predicate),
    getStatus(scopeId),
    getMetrics(),
  };
  ```

  Regras de implementação:

  - `cacheKey` é derivada quando omitida de host, pathname, query ordenada e identificadores explícitos; nunca incluir tokens sensíveis.
  - manter `inFlight: Map`, `cache: Map` e fila em memória da aba;
  - limitar leituras de rede a 2, com prioridades `interactive > normal > background` e ordem FIFO dentro da mesma prioridade;
  - retornar `{ document, url, fetchedAt, source, durationMs }`, onde `source` é `network`, `cache` ou `shared`;
  - usar `AbortController` apenas para timeout/cancelamento de itens ainda não iniciados; não transformar uma leitura já concluída em sucesso acadêmico;
  - registrar somente contadores e duração agregada em memória, sem corpo de resposta ou dados de pessoas.

- [x] **Step 3: inserir o módulo na ordem correta.**

  Adicionar `content/request-broker.js` em `manifest.json` após `content/namespace.js` e antes de `content/collectors.js`. Atualizar `tests/content-scripts.test.js` para proteger essa ordem.

- [x] **Step 4: validar e registrar a decisão.**

  Executar `node --test tests/request-broker.test.js tests/content-scripts.test.js`, depois a suíte completa, validação e integridade. Registrar em `memory.md` a decisão de que duas leituras é o teto global e não por componente. Marcar esta etapa no backlog sem remover as prioridades existentes.

- [x] **Step 5: criar commit.**

  ```bash
  git add content/request-broker.js manifest.json tests/request-broker.test.js tests/content-scripts.test.js docs/contexto/task.md docs/contexto/memory.md CHECKSUMS.sha256
  git commit -m "feat: adicionar broker global de requisições"
  ```

## Task 2: Tornar as varreduras explicitamente acionadas e seguras

**Files:**

- Modify: `content/storage.js`
- Modify: `content/importer/contextual-importer.js`
- Modify: `content/main.js`
- Modify: `tests/storage.test.js`
- Modify: `tests/importer-ui.test.js`
- Modify: `tests/main-coverage.test.js`
- Modify: `docs/contexto/task.md`
- Modify: `CHECKSUMS.sha256`

- [x] **Step 1: especificar em testes os novos padrões de navegação.**

  Atualizar `tests/storage.test.js` para exigir `automaticCourseScan: false` e `automaticCategoryScan: false`. Em `tests/importer-ui.test.js`, testar que a instalação em curso, categoria e `/my/` renderiza apenas dados locais/cached e não chama `scanCoursePendingCorrections`, `scanCategoryPendingCorrections` ou `scanMyCoursesDashboard` sem clique explícito. Em `tests/main-coverage.test.js`, cobrir que uma abertura não chama `collectSnapshot` automaticamente.

  Rodar os três arquivos e confirmar que falham contra os comportamentos atuais.

- [x] **Step 2: alterar defaults e separar renderização de atualização.**

  Em `content/storage.js`, mudar somente os defaults das duas varreduras automáticas para `false`, mantendo as chaves para migração de perfis já existentes.

  Em `contextual-importer.js`:

  - em curso, categoria e `/my/`, renderizar cache/snapshot disponível com timestamp e cobertura;
  - preservar botões de atualização, mas fazer deles o único ponto que agenda leitura remota;
  - criar escopos por ação, por exemplo `course:<courseId>`, `category:<categoryId>` e `my-courses`, para uso posterior no cancelamento;
  - classificar atualizações iniciadas pelo usuário como `interactive`; qualquer atualização de manutenção restante deve ser `background`.

  Em `main.js`, não iniciar análise completa na carga. A primeira leitura deve ocorrer apenas por ação explícita ou por continuidade de uma operação iniciada pelo usuário.

- [x] **Step 3: preservar compatibilidade de configurações antigas.**

  Garantir que valores já gravados pelo usuário prevaleçam sobre os novos defaults e que a interface de configurações explique que atualizações automáticas são opcionais. Não eliminar os campos de configuração nesta etapa.

- [x] **Step 4: validar e criar commit.**

  Rodar os testes focados, `npm test`, `npm run validate` e `npm run integrity`. Verificar manualmente em uma página estática que abrir o painel não inicia request de rede. Atualizar checksums e registrar o avanço em `task.md`.

  ```bash
  git add content/storage.js content/importer/contextual-importer.js content/main.js tests/storage.test.js tests/importer-ui.test.js tests/main-coverage.test.js docs/contexto/task.md CHECKSUMS.sha256
  git commit -m "perf: exigir atualização explícita nas varreduras"
  ```

## Task 3: Integrar coletores e pendências ao broker com escopos mínimos

**Files:**

- Modify: `content/collectors.js`
- Modify: `content/importer/contextual-importer.js`
- Modify: `content/batch-grading.js`
- Modify: `content/assisted-grading.js`
- Modify: `content/settings.js`
- Create: `tests/collection-scope.test.js`
- Modify: `tests/pending-confirmation.test.js`
- Modify: `tests/assisted-grading.test.js`
- Modify: `docs/contexto/memory.md`
- Modify: `CHECKSUMS.sha256`

- [ ] **Step 1: criar testes para escopo e fonte de pendências.**

  Em `tests/collection-scope.test.js`, usar fixtures HTML pequenas para comprovar:

  - o escopo padrão lê apenas a Unidade Curricular ativa e suas atividades visíveis;
  - o escopo `course` só é usado mediante ação explicitamente rotulada;
  - participantes e boletim não são requisitados no escopo padrão;
  - todas as leituras passam por `MAT.requestBroker.fetchDocument`.

  Atualizar `tests/pending-confirmation.test.js` para exigir que o total exibido venha diretamente de `requiregrading` e que zero não faça a sequência duplicada summary → grade pages. Atualizar `tests/assisted-grading.test.js` com releitura obrigatória antes de mensagem/registro de sucesso.

- [ ] **Step 2: dar nome aos escopos de coleta.**

  Em `collectors.js`, introduzir uma opção explícita:

  ```js
  collectSnapshot({
    courseUrl,
    scope: 'active-uc' | 'course' | 'students' | 'grades' | 'single-activity',
    activityCmid,
    signal,
  })
  ```

  O padrão é `active-uc`. Cada escopo deve declarar quais coletores são necessários. Não usar `analysisMode: 'complete'` como atalho para buscar participantes, telas de correção e boletim ao mesmo tempo. Manter os limites existentes como limite adicional e devolver cobertura parcial quando eles forem alcançados.

- [ ] **Step 3: encapsular leituras remotas sem alterar a semântica acadêmica.**

  Substituir os `fetch` de leitura em `collectors.js` e `fetchHtmlDocument` do importador pelo broker, com TTLs aprovados:

  | Tipo | TTL |
  | --- | ---: |
  | Estrutura do curso | 15 min |
  | Pendências de atividade | 10 min |
  | Linhas `requiregrading` | 5 min |
  | Participantes/boletim | 15 min |
  | SAP | 30 min |

  Aplicar chaves que incluam host, curso, CMID e página. Fluxos de envio de nota, comentário e lote não podem utilizar resposta cacheada para confirmar resultado: antes do sucesso, mantêm a releitura de rede com `force: true`.

- [ ] **Step 4: substituir a dupla confirmação de zero.**

  Em `contextual-importer.js`, usar a página/dados de `requiregrading` como total de pendências. Manter páginas de correção como fonte de detalhes somente quando a ação do usuário solicitar detalhes. Remover a confirmação de zero por varredura de até cinco páginas como caminho normal. Erros e páginas ambíguas devem gerar estado “não foi possível confirmar”, não zero.

- [ ] **Step 5: validar e criar commit.**

  Executar testes novos e alterados, a suíte completa, validação e integridade. Revisar requests no DevTools contra uma UC pequena: uma ação padrão não deve buscar participantes/boletim e não deve fazer duas leituras para o mesmo CMID.

  ```bash
  git add content/collectors.js content/importer/contextual-importer.js content/batch-grading.js content/assisted-grading.js content/settings.js tests/collection-scope.test.js tests/pending-confirmation.test.js tests/assisted-grading.test.js docs/contexto/memory.md CHECKSUMS.sha256
  git commit -m "perf: coletar dados Moodle por escopo mínimo"
  ```

## Task 4: Exibir progresso, cobertura e cancelamento sem poluir a navegação

**Files:**

- Modify: `content/ui.js`
- Modify: `content/styles.css`
- Modify: `content/importer/contextual-importer.js`
- Modify: `content/language.js`
- Modify: `dashboard/dashboard.js`
- Modify: `dashboard/dashboard.css`
- Create: `tests/request-status-ui.test.js`
- Modify: `tests/importer-ui.test.js`
- Modify: `tests/dashboard.test.js`
- Modify: `CHECKSUMS.sha256`

- [ ] **Step 1: escrever testes de interface com estados explícitos.**

  Criar `tests/request-status-ui.test.js` para validar o contrato de renderização: `sem dados`, `atualizando`, `atualizado`, `parcial`, `cancelado` e `erro`. Exigir texto com escopo, horário, itens processados/total quando conhecido e uma ação de cancelar apenas enquanto houver fila. Em `tests/importer-ui.test.js`, assegurar um único CTA primário de atualização por contexto e que cada botão possui `aria-label`.

- [ ] **Step 2: criar componentes leves de estado.**

  Em `ui.js`, adicionar helpers puros para montar o cabeçalho de contexto e a faixa de status a partir de `requestBroker.getStatus(scopeId)`. No importador e no dashboard, ligar o botão Cancelar a `MAT.requestBroker.cancelScope(scopeId)`, mantendo na tela dados já confirmados e identificando a cobertura como parcial.

- [ ] **Step 3: aplicar o design system existente.**

  Em `styles.css` e `dashboard.css`:

  - reutilizar tokens de `docs/contexto/design.md`, sem uma segunda paleta;
  - usar verde somente para dados confirmados, âmbar para parcial/atenção, vermelho para erro/bloqueio e azul para informação;
  - em telas até 760 px, converter grades densas em cartões e manter o CTA acima da dobra;
  - garantir foco visível, contraste e ícones com rótulo textual acessível;
  - eliminar textos técnicos “automático”, “scanner” e estados sem explicação.

- [ ] **Step 4: validar visual e criar commit.**

  Rodar testes focados e a suíte completa. Inspecionar manualmente curso, categoria, `/my/` e dashboard em larguras 1280, 840 e 620 px, nos temas claro e escuro. Registrar screenshots de homologação apenas se não contiverem dados de estudantes.

  ```bash
  git add content/ui.js content/styles.css content/importer/contextual-importer.js content/language.js dashboard/dashboard.js dashboard/dashboard.css tests/request-status-ui.test.js tests/importer-ui.test.js tests/dashboard.test.js CHECKSUMS.sha256
  git commit -m "feat: informar escopo e progresso das atualizações"
  ```

## Task 5: Remover trabalho recorrente e custo de armazenamento desnecessário

**Files:**

- Modify: `content/main.js`
- Modify: `content/storage.js`
- Modify: `background/service-worker.js`
- Modify: `manifest.json`
- Create: `tests/runtime-lifecycle.test.js`
- Modify: `tests/storage.test.js`
- Modify: `tests/service-worker.test.js`
- Modify: `docs/contexto/memory.md`
- Modify: `CHECKSUMS.sha256`

- [ ] **Step 1: testar o ciclo de vida esperado.**

  Em `tests/runtime-lifecycle.test.js`, exigir ausência dos intervalos fixos de 1,8 s e 60 s como mecanismo de reanálise. Cobrir pausa de observadores quando a página estiver invisível e disparo por mudança real de rota/elemento de contexto. Em `tests/storage.test.js`, exigir que leitura de snapshot não use `chrome.storage.local.get(null)` para operações comuns e que auditoria/telemetria tenham tamanho limitado.

- [ ] **Step 2: trocar polling por eventos restritos.**

  Em `main.js`, substituir os dois `setInterval` por:

  - `popstate`/mudanças observáveis de URL;
  - um `MutationObserver` limitado ao contêiner Moodle necessário, com debounce;
  - pausa/desconexão em `document.hidden` e reconexão apenas após retorno visível;
  - nenhuma coleta remota como consequência direta do evento.

- [ ] **Step 3: tornar limpeza e armazenamento proporcionais.**

  Em `storage.js`, buscar apenas chaves necessárias, manter índices/resumos para o dashboard e limitar a auditoria/telemetria local a um número definido de eventos sem conteúdo acadêmico. Transferir a limpeza periódica de retenção para um alarme no `service-worker.js` usando a infraestrutura já permitida pelo manifesto; se a permissão `alarms` já existir, reutilizá-la, e se não existir, preferir limpeza oportunista a ampliar permissões.

- [ ] **Step 4: validar e criar commit.**

  Executar testes focados e completos, validação e integridade. Usar DevTools Performance para confirmar que permanecer 60 s em uma página ociosa não provoca nova coleta e que a aba oculta não mantém observador ativo.

  ```bash
  git add content/main.js content/storage.js background/service-worker.js manifest.json tests/runtime-lifecycle.test.js tests/storage.test.js tests/service-worker.test.js docs/contexto/memory.md CHECKSUMS.sha256
  git commit -m "perf: remover polling e leituras amplas de armazenamento"
  ```

## Task 6: Modularizar o importador sem mudar seus contratos públicos

**Files:**

- Create: `content/importer/route-bootstrap.js`
- Create: `content/importer/course-pending.js`
- Create: `content/importer/category-pending.js`
- Create: `content/importer/my-courses.js`
- Create: `content/importer/quick-grading.js`
- Modify: `content/importer/contextual-importer.js`
- Modify: `manifest.json`
- Modify: `tests/content-scripts.test.js`
- Modify: `tests/importer-ui.test.js`
- Modify: `CHECKSUMS.sha256`

- [ ] **Step 1: proteger contratos antes de mover código.**

  Estender `tests/importer-ui.test.js` para executar cada inicializador de rota com DOM mínimo e verificar que somente o inicializador correspondente é chamado. Em `tests/content-scripts.test.js`, testar a sequência dos novos arquivos antes do bootstrap e a existência dos mesmos nomes públicos usados pelo código atual.

- [ ] **Step 2: extrair módulos por rota.**

  Mover funções sem alteração semântica:

  - curso/atividade para `course-pending.js`;
  - categoria para `category-pending.js`;
  - `/my/` para `my-courses.js`;
  - correção rápida para `quick-grading.js`.

  Cada módulo registra funções sob `MAT.importer`. `route-bootstrap.js` deve decidir a rota uma única vez e montar somente o módulo aplicável. `contextual-importer.js` permanece temporariamente como fachada de compatibilidade ou é reduzido a helpers compartilhados, sem conter inicializadores de todas as rotas.

- [ ] **Step 3: atualizar manifesto e remover duplicação.**

  Carregar helpers compartilhados antes dos módulos de rota e `route-bootstrap.js` por último. Confirmar que uma URL de curso não registra observador de categoria nem constrói dashboard `/my/`. Remover apenas funções comprovadamente sem referências por `rg` e pelos testes.

- [ ] **Step 4: validar e criar commit.**

  Rodar testes do importador, testes completos, validação e integridade. Abrir todas as quatro rotas alvo e verificar no DevTools que somente os listeners da rota ativa foram adicionados.

  ```bash
  git add content/importer manifest.json tests/content-scripts.test.js tests/importer-ui.test.js CHECKSUMS.sha256
  git commit -m "refactor: separar importador por contexto Moodle"
  ```

## Task 7: Fechamento, controle de regressão e homologação

**Files:**

- Modify: `docs/contexto/task.md`
- Modify: `docs/contexto/memory.md`
- Create: `docs/homologacao/2026-09-29-otimizacao-desempenho-usabilidade.md`
- Modify: `CHANGELOG.md`
- Modify: `package.json` somente se um script de teste já existente puder ser agregado sem dependências
- Modify: `CHECKSUMS.sha256`

- [ ] **Step 1: criar checklist executável de homologação.**

  Criar documento com casos para `ead.senai.br` e `ead.fieg.com.br`: página de curso, categoria, `/my/`, atividade com pendências, atividade sem pendências, atualização cancelada, correção individual, lote, erro de rede, telas 1280/840/620 e temas claro/escuro. Para cada caso registrar ação, requests esperadas, resultado esperado e evidência.

- [ ] **Step 2: medir antes e depois de modo reproduzível.**

  Em ambiente autenticado de homologação, usar DevTools Network e Performance para registrar, por fluxo, número de requests, requisições simultâneas, requests duplicadas, duração total e escopo/cobertura. Critérios mínimos:

  - no máximo 2 leituras em paralelo;
  - ao abrir a página, 0 leituras remotas iniciadas pela extensão;
  - atualização padrão não lê participantes/boletim;
  - nenhuma chave idêntica cria duplicação durante a mesma janela;
  - correções continuam confirmadas pelo Moodle após a escrita.

- [ ] **Step 3: executar validação automatizada final.**

  Executar, em checkout limpo:

  ```bash
  npm test
  npm run validate
  npm run integrity
  git diff --check
  ```

  Corrigir qualquer falha antes de prosseguir. Conferir que `CHECKSUMS.sha256` foi regenerado somente pelo script oficial do projeto e cobre todos os arquivos alterados.

- [ ] **Step 4: atualizar rastreabilidade e solicitar revisão.**

  Marcar tarefas concluídas em `task.md`, registrar decisões finais em `memory.md`, detalhar o impacto em `CHANGELOG.md` e abrir a revisão. Não afirmar homologação concluída sem evidência dos dois hosts autenticados.

- [ ] **Step 5: criar commit de fechamento.**

  ```bash
  git add docs/contexto/task.md docs/contexto/memory.md docs/homologacao/2026-09-29-otimizacao-desempenho-usabilidade.md CHANGELOG.md package.json CHECKSUMS.sha256
  git commit -m "docs: registrar validação da otimização"
  ```
