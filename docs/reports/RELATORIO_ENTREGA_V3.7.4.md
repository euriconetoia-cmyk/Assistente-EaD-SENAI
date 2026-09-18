# Relatório de entrega do Assistente EaD SENAI 3.7.4

## Interpretação da pontuação

A extensão consulta a nota máxima na página da atividade, no campo de avaliação rápida e nos dados já reconhecidos pela análise local. Valores coincidentes aumentam a confiança da leitura. Valores divergentes são registrados como conflito.

Cada atividade passa a incluir `criterios_de_pontuacao.txt`, informando à IA:

- a nota máxima confirmada;
- a escala permitida;
- a proibição de ultrapassar o limite;
- a regra de manter nota zero em branco;
- a regra específica para SENAI Play.

## Validação antes do lançamento

O CSV de retorno deve preservar ambiente, curso ID, curso, CMID, atividade, tipo de atividade, nota máxima, status e fonte. Antes de preencher o Moodle, a extensão compara a nota máxima do CSV com o valor atual da atividade. Divergências, conflitos e ausência de escala bloqueiam o lançamento de notas.

## Validação técnica

- 65 testes automatizados aprovados.
- 23 referências e arquivos estruturais verificados.
- Nenhuma nova permissão adicionada.
- Créditos de Eurico Cirilo preservados.
