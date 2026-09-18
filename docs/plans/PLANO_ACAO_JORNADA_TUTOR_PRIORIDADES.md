# Plano de ação: jornada do tutor e fila de prioridades

Data: 16/09/2026. Base de trabalho: versão local 3.7.14. Proposta de versão de homologação: 3.7.15, após a execução e validação deste plano.

## 1. Objetivo e limite desta etapa

Oferecer, na entrada do painel do curso, uma jornada clara de análise, correção, acompanhamento individual, conferência no Moodle e exportação de evidências. Mostrar até três próximas ações com justificativa, data e vínculo com a origem, além do acesso à fila completa. A primeira implementação está na versão local 3.7.15 para homologação; a conferência autenticada em turmas Moodle reais permanece pendente.

A implementação deve reutilizar a análise salva, a lista `snapshot.tasks`, as áreas Correções, Notas, Alunos, Fechamento e Auditoria, o importador e a exportação existentes. Não criar um segundo motor de importação, download, envio de mensagens ou auditoria. A Central de Gestão mantém o papel de análise entre cursos; o painel mantém as ações do curso atual.

## 2. Estado atual observado

| Recurso existente | Onde está | Aproveitamento previsto |
| --- | --- | --- |
| Prioridades e fila de tarefas | `content/ui.js`, Visão geral; `content/rules.js`, `buildTaskQueue` | Exibir ações com motivo, origem e estado de confirmação em um único lugar. |
| Dados e histórico individual | `content/ui.js`, Alunos; armazenamento local | Abrir a ficha do aluno a partir da fila, com motivos e ações registradas. |
| Mensagem automática editável | Ficha do aluno em `content/ui.js` | Manter revisão pelo tutor antes de abrir a conversa no Moodle; distinguir abertura de envio confirmado. |
| Pacote de correção e lançamento | `content/batch-grading.js` e `content/importer/` | Criar atalhos para as funções existentes, sem alterar as barreiras de prévia e confirmação. |
| Auditoria e exportação | `content/ui.js`, `dashboard/dashboard.js`, `dashboard/audit-export.js` | Encaminhar para a exportação apropriada; exigir escolha explícita para dados individuais. |

Antes de iniciar a implementação, conferir a divergência documental: o README informa em um ponto que guardar mensagens pode ser desativado e, em outro, que seu texto não é guardado por padrão. Validar o padrão real no código e harmonizar a documentação.

## 3. Regras da fila

Cada item precisa de `id` estável, curso e UC, tipo, justificativa legível, fonte, data da leitura, prazo quando confirmado, destino da ação e estado. Nunca inferir zero ou concluir uma ação a partir de fonte ausente. Deduplicar o mesmo aluno ou atividade quando houver mais de um caminho para a mesma providência. Uma ação concluída localmente deve continuar rastreável no histórico; sua pendência acadêmica só desaparece depois de nova leitura verificável do Moodle.

| Ordem | Condição | Comportamento esperado |
| --- | --- | --- |
| 1. Verificar lançamento | Nota ou feedback esperado não foi confirmado após salvamento, ou houve divergência | Destacar conferência por aluno e atividade. Estado `Não verificado` ou `Divergente`, sem sucesso presumido. |
| 2. Fechamento | UC com data de encerramento reconhecida dentro do prazo de alerta e pendências confirmadas | Exibir prazo e ação de fechamento. Sem data confirmada, não criar urgência temporal. |
| 3. Corrigir entregas | Envio aguardando avaliação, identificado por leitura confiável | Abrir Correções ou a atividade original, com contagem qualificada por fonte. |
| 4. Acompanhar aluno | Falta de entrega ou outro fator reconhecido pelas regras de risco | Abrir a ficha, expor motivo e permitir contato e registro; contato não resolve falta de entrega. |
| 5. Conferir leitura | Falha, cobertura incompleta ou fonte contraditória | Pedir análise completa ou conferência manual; separar do rótulo de pendência confirmada. |
| 6. Arquivar | Ações e evidências disponíveis após o trabalho | Direcionar à Auditoria local; a exportação não altera o estado acadêmico. |

Dentro de cada grupo, usar prazo confirmado mais próximo; depois gravidade existente e ordem estável. Em caso de fechamento imediato com notas ainda não confirmadas, a conferência do lançamento continua no topo. Se dados do curso e da faixa contextual tiverem escopo ou horário diferente, mostrar isso claramente e atualizar uma fonte antes de ordenar a fila. A fila não deve incentivar contato com aluno por uma avaliação ainda pendente do tutor.

## 4. Percurso de uso

1. **Analisar.** Identificar curso e UC, executar ou reutilizar análise recente e mostrar hora, escopo e qualidade da leitura. Sem curso detectado, orientar a abrir um curso sem mostrar números simulados.
2. **Corrigir.** Se houver entregas aguardando avaliação, levar a Correções e ao pacote existente. Conferir presença de enunciado ou anexo e, se faltar, exigir conferência da atividade no Moodle.
3. **Acompanhar.** Se houver alunos com motivos confirmados de atenção, levar à ficha com entregas, nota reconhecida, mensagem editável e registro de contato. Diferenciar “conversa aberta” de “mensagem enviada”.
4. **Revisar e lançar.** Levar ao importador atual; preservar associação exata de curso, atividade e aluno, nota máxima, edição de nota e feedback e prévia obrigatória antes de salvar.
5. **Confirmar.** Relê nota e feedback realmente gravados no Moodle. Resultado parcial, erro ou leitura inconclusiva fica visível por aluno; nenhum botão da jornada converte esse estado em sucesso.
6. **Arquivar.** Encaminhar para a Auditoria local do curso ou da Central, informar o tipo de pacote, permitir escolher pasta quando suportado e oferecer ZIP como alternativa. Inclusão de dados acadêmicos individuais exige a escolha já existente.

O percurso é uma orientação, não um bloqueio artificial: o tutor pode abrir qualquer área do menu a qualquer momento. A interface destaca somente uma próxima ação principal e até três pendências na entrada, com acesso à fila completa.

## 5. Execução por etapas e critérios de passagem

| Etapa | Entrega | Critério para avançar |
| --- | --- | --- |
| A. Inventário e cenários | Mapear fonte de cada tarefa, estado pós-envio, detalhes do aluno, ações e auditoria; registrar exemplos de dados completos, parciais e ausentes | Cada rótulo proposto tem fonte conhecida ou fica explicitamente `Verificar`. |
| B. Contrato da fila | Consolidar prioridades e desempates em função testável, com identificadores estáveis e evidências de origem | Casos de prazo, empate, falha, duplicidade e curso divergente passam em testes de comportamento. |
| C. Interface de teste | Acrescentar “Minha jornada” à Visão geral do curso, até três ações e links para funções existentes; manter menu e ficha do aluno | Navegação por teclado, 320 px e painel amplo sem corte, conteúdo legível em tema claro e escuro. |
| D. Integração segura | Refletir resultados confirmados da análise e conferência sem pular etapas por clique, contato registrado ou importação incompleta | Nota e feedback ausentes ou divergentes continuam destacados; dados de cursos não se misturam. |
| E. Validação técnica | Executar `npm test`, `npm run validate`, checar CSP, manifesto, permissões, créditos, documentação e pacote instalável | Nenhum teste existente falha; novos testes cobrem as regras relevantes sem alterar as proteções do importador. |
| F. Homologação no AVA | Testar em curso e aluno de teste nos dois ambientes autorizados, com captura de resultado e evidência | Confrontar tela e Moodle para sucesso, falha de leitura, aluno sem entrega, nota sem feedback e feedback sem nota. Falta de acesso autenticado impede alegar esta etapa como aprovada. |

## 6. Matriz mínima de verificação

| Cenário | Resultado esperado |
| --- | --- |
| Curso sem análise ou UC não identificada | Orientação de leitura e configuração; sem contagens inventadas ou prioridade por prazo. |
| Análise parcial, atividade desconhecida ou falha de rede | `Verificar` com origem e caminho para repetição ou consulta manual. |
| Correção salva com feedback, mas sem nota esperada | Tarefa de conferência no topo; nunca concluída. |
| Contato iniciado ou texto copiado, sem confirmação de envio | Registro do evento real, sem indicação de mensagem enviada. |
| Contato registrado e falta de entrega ainda presente | Aluno permanece em atenção após atualização, com histórico preservado. |
| CSV associado a curso ou CMID incorreto, nota acima da máxima ou nome não reconhecido | Importador bloqueia ou solicita resolução; jornada não contorna o bloqueio. |
| UC com encerramento confirmado e pendências, outras sem data | Só a primeira usa urgência por prazo. |
| Sem dados individuais e exportação padrão | Exporta metadados conforme configuração atual; dados acadêmicos individuais somente após escolha explícita. |
| Troca de curso, recarga do painel ou análise mais recente | Nenhum atalho mantém contexto do curso anterior; tarefas são recalculadas a partir da fonte correta. |

## 7. Entrega, riscos e decisão

Gerar uma instalação de homologação separada da versão estável e um relatório com evidências dos testes e limitações. Preservar `CREDITOS.md` e o crédito exibido no painel. Não publicar no GitHub nem classificar a versão como validada em Moodle real sem executar as etapas correspondentes. Se a jornada não for útil nos testes, remover a nova camada de navegação mantendo intactos o importador, os registros locais e o fluxo de correção.

Critério final: o tutor identifica o que fazer primeiro, entende por que a tarefa apareceu e chega ao recurso correto; nenhum aluno ou lançamento é declarado resolvido sem a fonte de confirmação necessária.

## Acompanhamento da execução em 16/09/2026

Etapas A a E: implementadas e verificadas localmente com 84 testes e validação estrutural. Etapa F: pendente de acesso autenticado e comparação da tela com o Moodle de Goiás e CTM GO. O resultado automático é mantido separado da declaração manual do tutor; uma mensagem preparada não equivale a mensagem enviada e um registro de contato não remove pendências acadêmicas.
