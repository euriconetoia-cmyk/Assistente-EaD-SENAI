# Roteiro de homologação autenticada

## Pré-requisitos

- Usar exclusivamente curso, atividades e aluno de homologação.
- Registrar ambiente, curso, CMID, horário, navegador e versão da extensão.
- Não usar uma turma produtiva e não enviar nota, feedback ou mensagem sem confirmação explícita do responsável.

## Executar em `ead.senai.br` e `ead.fieg.com.br`

| Cenário | Ação | Resultado esperado |
| --- | --- | --- |
| Abertura | Abrir uma UC sem clicar em Atualizar | Não há leitura remota automática; a interface indica dados locais ou solicita atualização. |
| Atualização | Clicar em Atualizar uma única vez | A faixa mostra progresso e o escopo do curso; não há mais de duas requisições simultâneas. |
| Cancelamento | Atualizar uma UC com várias páginas e cancelar com fila pendente | Itens ainda na fila são cancelados; dados anteriores permanecem; resultado fica parcial. |
| Pendências | Abrir atividade com envios pendentes e atualizar | A contagem vem de `requiregrading`; atividade e total correspondem ao Moodle. |
| Zero inconclusivo | Consultar atividade cujo resumo informa zero | A extensão exibe Conferir, não um check verde, quando não houver confirmação suficiente. |
| Sessão | Expirar a sessão e acionar uma atualização | A extensão informa sessão expirada; não interpreta a tela de login como dado acadêmico. |
| CSV seguro | Importar CSV com CMID incorreto ou nome divergente | O lote é bloqueado antes do preenchimento. |
| Conferência | Usar CSV válido em atividade de teste | Prévia exige confirmação; nota e feedback são relidos no Moodle antes de sucesso. |
| Divergência | Alterar um valor no Moodle antes da conferência pós-lote | A extensão informa divergência ou campo não verificável, nunca sucesso falso. |
| Arquivos | Gerar pacote de uma atividade com arquivo do aluno | Download preserva o arquivo e não aceita redirecionamento para login ou host externo. |
| Navegação | Abrir curso, categoria, Meus cursos e correção rápida | Somente o inicializador da rota corrente é executado; não há interfaces duplicadas. |

## Evidências mínimas

- Captura de tela da tela antes e depois de cada cenário.
- Exportação local de auditoria, quando aplicável.
- Registro de requisições do DevTools para o cenário Atualização, com contagem máxima simultânea de duas.
- Relato de qualquer diferença de tema Moodle, rota ou seletor não coberta.

## Critério de aceite

O ambiente só é aprovado se todos os cenários concluírem sem alteração indevida de dados acadêmicos e sem leitura automática inesperada. Qualquer falha, divergência de nota, atividade, CMID, aluno ou sessão deve reprovar o cenário e gerar correção com teste automatizado antes de novo aceite.
