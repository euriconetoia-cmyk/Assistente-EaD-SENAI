# Relatório de correção da versão 3.7.9

## Objetivo

Padronizar a leitura, a apresentação, a conferência e o envio das notas no formato brasileiro, evitando diferenças causadas por vírgula, ponto ou quantidade de casas decimais.

## Regra aplicada

As notas são tratadas internamente como números. Na conferência, são apresentadas com vírgula e duas casas decimais, como `60,00`, `85,50` e `100,00`. No momento do envio, o valor é convertido para o separador decimal identificado na página do Moodle.

A extensão não força todas as atividades para 100 pontos. A nota máxima confirmada pelo Moodle continua sendo respeitada. Quando a atividade valer 50 pontos, por exemplo, a conferência apresentará `50,00` como nota máxima.

## Nota zero

Foi mantida a regra definida para o projeto: nota zero não é lançada automaticamente. O campo de nota permanece em branco e somente o feedback explicativo é enviado.

## Validação

Foram aprovados 71 testes automatizados. A estrutura possui 53 arquivos e 23 referências do manifesto verificadas, sem falhas estruturais ou novas permissões.
