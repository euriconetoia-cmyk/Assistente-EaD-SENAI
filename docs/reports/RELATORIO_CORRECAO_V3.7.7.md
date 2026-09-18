# Relatório de correção do Assistente EaD SENAI 3.7.7

## Problema corrigido

Alunos posicionados fora da primeira página da avaliação rápida eram classificados como não encontrados. A extensão dependia de `page=0` e presumia que `perpage=500` seria respeitado pelo Moodle.

## Nova arquitetura

Antes de preencher qualquer campo, a extensão consulta a paginação da atividade, normaliza os filtros e constrói um mapa dos alunos encontrados. Os registros são agrupados pela página real e recebem o identificador interno do Moodle quando disponível.

Somente depois que todos os alunos possuem correspondência única começa o salvamento. Cada página é preenchida, salva e relida antes do avanço para a próxima.

## Diagnóstico

O relatório de conferência registra a quantidade de páginas consultadas e de alunos reconhecidos. Alunos ausentes após a varredura completa continuam bloqueados, evitando associação incorreta.

## Proteções preservadas

- Associação ambígua bloqueada.
- Atividade e curso validados.
- Notas negativas e não numéricas bloqueadas.
- Limite conhecido da atividade respeitado.
- Nota zero e atividade incorreta mantidas somente com feedback.
- Confirmação explícita do tutor antes do salvamento.
- Conferência posterior em cada página alterada.

## Créditos

Desenvolvimento, especificação e integração: By Eurico Cirilo.
