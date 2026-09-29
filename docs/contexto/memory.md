# Memory — Assistente EaD SENAI

## Formato de registro

Cada entrada tem data, a decisão tomada e o porquê, em duas ou três linhas. Registrar também o que foi tentado e descartado, não só o que ficou. Quando um erro voltar pela segunda vez, ele merece uma linha aqui. Uma vez por mês, ler o arquivo inteiro e apagar o que já não vale — contexto errado é pior que contexto nenhum.

## Histórico

### 2026-09-28 — Criação dos seis arquivos de contexto

Decisão: organizar `prd.md`, `architecture.md`, `rules.md`, `design.md`, `task.md` e este `memory.md` em `docs/contexto/`, a partir do estado real do repositório na versão 3.7.16 (README, CHANGELOG, manifest, CSS e planos/relatórios existentes), em vez de descrever um projeto genérico. Porquê: o projeto já tinha quase um ano de decisões espalhadas em `docs/reports/` e `docs/plans/`, sem um ponto único que um agente de IA lesse antes de propor mudança — o risco era reconstruir arquitetura ou regras que já existiam.

Decisão confirmada (não nova, só registrada): manter a stack sem framework, sem bundler e sem dependências de produção — JavaScript e CSS direto, Manifest V3, Node só para testes e validação local. Porquê: é assim que o projeto já funciona desde antes desta data; qualquer proposta de introduzir framework ou bundler deve vir como decisão nova, com uma entrada própria aqui, não como reorganização silenciosa.

### Pendências conhecidas nesta data (não resolvidas, só registradas)

- Divergência entre README e comportamento real sobre a guarda padrão do texto das mensagens (ver `task.md`, item 1) — ainda não investigada a fundo, só documentada no plano da jornada de 16/09/2026.
- Homologação autenticada em Moodle real (SENAI e FIEG) continua pendente desde pelo menos a versão 3.7.14; nenhuma versão até 3.7.16 foi validada com curso e aluno reais, só com testes simulados.
