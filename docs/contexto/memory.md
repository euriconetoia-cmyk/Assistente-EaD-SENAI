# Memory — Assistente EaD SENAI

## Formato de registro

Cada entrada tem data, a decisão tomada e o porquê, em duas ou três linhas. Registrar também o que foi tentado e descartado, não só o que ficou. Quando um erro voltar pela segunda vez, ele merece uma linha aqui. Uma vez por mês, ler o arquivo inteiro e apagar o que já não vale — contexto errado é pior que contexto nenhum.

## Histórico

### 2026-09-29 — Broker global de leituras Moodle

Decisão: centralizar as leituras HTML futuras em `MAT.requestBroker`, limitado a duas requisições de rede simultâneas em toda a aba, e não por componente. Porquê: coletores, badges e importador concorriam de forma independente e podiam multiplicar as leituras da mesma página.

Decisão: cache e deduplicação permanecem somente em memória da aba, com TTL definido pelo consumidor e sem textos, nomes, credenciais ou HTML persistidos como telemetria. Porquê: reduz custo de rede sem aumentar a retenção de dados acadêmicos.

### 2026-09-29 — Atualização somente por ação explícita

Decisão: desativar os scans automáticos por padrão e não iniciar análise ao abrir o painel, curso, categoria ou Meus cursos. Porquê: a navegação deve mostrar dados locais e deixar clara a ação Atualizar, evitando leituras concorrentes sem intenção do tutor.

### 2026-09-29 — Escopos mínimos e pendências autoritativas

Decisão: a coleta padrão limita-se à UC ativa e não busca participantes, boletim ou linhas detalhadas sem escopo explícito. A consulta de pendências usa `status=requiregrading`; quando zero não pode ser confirmado por essa leitura, o estado apresentado é Verificar. Porquê: reduzir tráfego sem declarar ausência de pendências sem evidência suficiente.

### 2026-09-29 — Inicialização contextual por rota

Decisão: manter o núcleo do importador como compatibilidade transitória, mas declarar no manifesto uma entrada para cada rota Moodle e inicializar apenas o recurso correspondente. Porquê: elimina inicializações concorrentes e deixa a extração futura por módulos verificável sem alterar os contratos de correção, importação ou confirmação acadêmica.

### 2026-09-29 — Pendências no broker global

Decisão: a consulta `status=requiregrading` usa `fetchHtmlDocument` e, portanto, o broker global, com TTL de 10 minutos, escopo da atividade e releitura forçada ao atualizar manualmente. Porquê: essa era a última leitura recorrente de pendências que podia escapar do limite global de duas requisições.

### 2026-09-28 — Criação dos seis arquivos de contexto

Decisão: organizar `prd.md`, `architecture.md`, `rules.md`, `design.md`, `task.md` e este `memory.md` em `docs/contexto/`, a partir do estado real do repositório na versão 3.7.16 (README, CHANGELOG, manifest, CSS e planos/relatórios existentes), em vez de descrever um projeto genérico. Porquê: o projeto já tinha quase um ano de decisões espalhadas em `docs/reports/` e `docs/plans/`, sem um ponto único que um agente de IA lesse antes de propor mudança — o risco era reconstruir arquitetura ou regras que já existiam.

Decisão confirmada (não nova, só registrada): manter a stack sem framework, sem bundler e sem dependências de produção — JavaScript e CSS direto, Manifest V3, Node só para testes e validação local. Porquê: é assim que o projeto já funciona desde antes desta data; qualquer proposta de introduzir framework ou bundler deve vir como decisão nova, com uma entrada própria aqui, não como reorganização silenciosa.

### Pendências conhecidas nesta data (não resolvidas, só registradas)

- Divergência entre README e comportamento real sobre a guarda padrão do texto das mensagens (ver `task.md`, item 1) — ainda não investigada a fundo, só documentada no plano da jornada de 16/09/2026.
- Homologação autenticada em Moodle real (SENAI e FIEG) continua pendente desde pelo menos a versão 3.7.14; nenhuma versão até 3.7.16 foi validada com curso e aluno reais, só com testes simulados.
