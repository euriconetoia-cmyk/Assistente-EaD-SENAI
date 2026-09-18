# Relatório de correção do Assistente EaD SENAI 3.7.6

## Objetivo

Restaurar o fluxo de envio de correções que funcionava antes da validação obrigatória da nota máxima.

## Comportamento restaurado

A ausência da nota máxima no CSV ou na página do Moodle não bloqueia o lote. A extensão apresenta avisos na conferência e exige a confirmação normal do tutor antes do salvamento.

## Proteções mantidas

- Notas negativas e não numéricas continuam bloqueadas.
- Notas acima da escala reconhecida continuam bloqueadas.
- Divergência confirmada entre a escala do CSV e a escala do Moodle continua bloqueada.
- Nota zero continua sendo convertida em feedback sem lançamento automático da nota.
- Atividade incorreta continua recebendo somente feedback.
- SENAI Play continua usando a nota máxima apenas quando houver escala confirmada.

## Créditos

Desenvolvimento, especificação e integração: By Eurico Cirilo.
