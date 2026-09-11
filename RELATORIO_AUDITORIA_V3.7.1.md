# Relatório de auditoria — Assistente EaD SENAI 3.7.1

## Escopo

Revisão do pacote para IA, importação de CSV, destino acadêmico, nota máxima, regras especiais de avaliação e conferência posterior ao salvamento.

## Proteções implantadas

- Correspondência exata por ambiente, curso ID e CMID quando esses campos estiverem presentes.
- Bloqueio de CSV destinado a outro curso ou ambiente.
- Compatibilidade assistida para arquivos antigos, com confirmação manual quando não houver identificação completa.
- Nota máxima acompanhada de fonte e nível de confiança; divergências não geram nota automática.
- Nota zero e atividade incorreta resultam em feedback sem lançamento de nota.
- SENAI Play exige validação e usa a nota máxima somente quando houver pontuação confirmada.
- Releitura pós-salvamento compatível com seletores alternativos da tabela de correções do Moodle.

## Validação

- 63 testes automatizados aprovados.
- JavaScript verificado sem falhas de sintaxe.
- Nenhuma permissão nova adicionada ao manifesto.
- Créditos de Eurico Cirilo preservados.

## Homologação recomendada

Testar primeiro em atividades de homologação nos dois ambientes Moodle, cobrindo uma atividade regular, uma entrega incorreta, uma nota calculada como zero e uma atividade SENAI Play pontuada e não pontuada.
