# Revisão de duplicações e organização do repositório

Versão analisada: 3.7.15. Revisão de código e arquivos locais, sem sessão Moodle autenticada.

## Mudanças aplicadas

- Retirados quatro atalhos da área “Próximas ações” que repetiam “Atualizar” do cabeçalho e “Correções”, “Alunos” e “Auditoria” do menu lateral. A fila priorizada e seus botões próprios foram mantidos.
- Movidos para `docs/reports`, `docs/specs` e `docs/plans` os arquivos históricos de entrega e planejamento. O conteúdo foi preservado, e a referência ativa em `VALIDACAO.md` foi atualizada.
- Mantidos na raiz o README, CHANGELOG, CREDITOS, PRIVACIDADE, VALIDACAO, manifesto e checksums. Criado `docs/README.md` para orientar a leitura dos documentos históricos.
- Criados comandos para gerar e conferir hashes e uma rotina do GitHub Actions para executar testes, validação estrutural e integridade.

## Repetições analisadas e preservadas

| Interface | Motivo para manter | Ajuste futuro indicado |
| --- | --- | --- |
| “Importar notas” na página do curso e “Lançar tudo” no painel | O primeiro abre importação contextual na atividade; o segundo processa e verifica um lote. | Dar nomes que indiquem claramente atividade atual e lote completo, depois de testar com tutores. |
| Relatório da UC e pacote da Auditoria Local | Fontes e escopos diferentes, incluindo opção explícita de dados individuais. | Mostrar na interface o escopo e o conteúdo antes da exportação. |
| Lista CSV por atividade e pacote mestre de correção | A lista apoia trabalho manual; o pacote mestre inclui enunciados e entregas. | Diferenciar os nomes e explicar qual usar em cada situação. |
| Menu do painel e Central de Gestão | Ações por curso e análises agregadas de múltiplas turmas. | Link entre as áreas e linguagem consistente, preservando permissões e escopos. |

## Limites desta entrega

Não foram alterados algoritmo de notas, escala proporcional, associação de aluno, critérios para confirmação no Moodle, configuração de privacidade ou exportação de evidências. Relatórios históricos podem mencionar botões removidos em versões posteriores e devem ser interpretados pela data indicada. A homologação visual no Moodle continua necessária.
