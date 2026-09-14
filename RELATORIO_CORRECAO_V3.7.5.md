# Relatório de correção do Assistente EaD SENAI 3.7.5

## Erro analisado

O importador bloqueava lotes com notas quando o CSV não repetia a coluna de nota máxima e o tema do Moodle apresentava a escala em um formato não reconhecido.

## Correção

- Leitura de `max`, `data-maxgrade`, `aria-valuemax` e dados equivalentes do campo de nota.
- Leitura de cabeçalhos, rótulos, títulos e textos de acessibilidade.
- Reconhecimento de escalas em português e inglês.
- Compatibilidade com CSVs anteriores quando o Moodle confirma a nota máxima na página atual.
- Bloqueio preservado quando a escala não puder ser confirmada por nenhuma fonte.

## Segurança acadêmica

A alteração não presume uma escala. A nota somente é liberada quando o CSV declara um limite coerente ou quando a própria página atual do Moodle fornece uma nota máxima válida. Divergências continuam bloqueando o lançamento.

## Créditos

Desenvolvimento, especificação e integração: By Eurico Cirilo.
