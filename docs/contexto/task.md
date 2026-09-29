# Task — Assistente EaD SENAI

## Como usar este arquivo

Trabalhar uma tarefa por vez, na ordem listada. Cada tarefa é pequena o suficiente para caber numa única conversa com o agente. Ao concluir uma tarefa, marque-a e, se ela envolveu uma decisão importante (mudar uma regra, descartar uma abordagem, corrigir uma divergência), registre isso em `memory.md` antes de passar para a próxima.

## Fila atual

1. **[ ] Resolver a divergência sobre a guarda do texto das mensagens.** O `docs/plans/PLANO_ACAO_JORNADA_TUTOR_PRIORIDADES.md` registra que o README, em um ponto, diz que a guarda pode ser desativada e, em outro, que o texto não é guardado por padrão em instalações novas. Conferir o comportamento real em `content/storage.js` e `content/communications.js`, corrigir a documentação (README e `PRIVACIDADE.md`) para bater com o código, e registrar a decisão final em `memory.md`.

2. **[ ] Preparar o roteiro de homologação autenticada.** Nenhuma versão pode ser classificada como validada em Moodle real sem esta etapa (ver `VALIDACAO.md` e o plano da jornada). Definir um curso e um aluno de teste em cada ambiente (SENAI e FIEG), listar os cenários mínimos já descritos na matriz de verificação do plano (curso sem análise, correção com feedback sem nota, CSV com CMID incorreto, UC com encerramento confirmado, etc.) e produzir um checklist executável, sem ainda rodar a homologação.

3. **[ ] Executar a homologação nos dois ambientes.** Depende da tarefa anterior. Rodar o checklist em `ead.senai.br` e `ead.fieg.com.br` com curso e aluno de teste, capturar evidência de cada cenário, e gerar um relatório em `docs/reports/` no mesmo padrão dos relatórios de versão anteriores (`RELATORIO_ENTREGA_...`).

4. **[ ] Revisar a cobertura de teste do recurso "Arquivo SAP" fora dos casos simulados.** O `VALIDACAO.md` registra que a página real de um recurso SAP específico pode ter formato distinto dos casos de teste simulados. Depois da homologação (tarefa 3), conferir se surgiu algum formato de página não coberto e, se sim, criar um teste novo em `tests/` para esse caso antes de considerar o recurso maduro.

5. **[ ] Avaliar necessidade de um terceiro ambiente Moodle ou novo tipo de recurso.** Só avançar aqui se houver decisão institucional explícita — não implementar por antecipação. Se confirmado, tratar como mudança de escopo: atualizar `manifest.json` (host_permissions e content_scripts), `prd.md`, `architecture.md` e registrar a decisão em `memory.md` antes de tocar no código.

## Regra para novas tarefas

Ao adicionar uma tarefa nova a esta fila, escrever como uma entrega pequena e verificável (o que muda, como testar que mudou), nunca como um objetivo amplo. Um pedido grande deve ser quebrado em várias linhas aqui antes de virar trabalho.
