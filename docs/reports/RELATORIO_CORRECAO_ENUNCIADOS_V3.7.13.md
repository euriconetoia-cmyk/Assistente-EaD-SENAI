# Correção da coleta de enunciados, versão 3.7.13

Data: 16/09/2026.

## Erro observado

A versão 3.7.12 recusava o pacote da atividade Envio da SAP 01, CMID 335663, quando não encontrava texto na descrição da página. O Moodle permite anexar arquivos à tarefa além do texto da descrição. Portanto, ausência de texto no seletor da extensão não demonstra ausência de enunciado.

## Ajuste

O pacote para correção agora busca texto também na tela de avaliação e identifica anexos da própria atividade no HTML autenticado. Anexos do professor são salvos na pasta `anexos_do_enunciado`. Arquivos da área de envio de alunos não são aceitos como enunciado, mesmo com nomes iguais. Cada pasta conserva entregas, CMID, link da atividade e o estado da coleta.

Se não houver descrição em texto, um aviso indica se existe material em anexo. Se nenhum material for encontrado, os arquivos dos alunos continuam disponíveis e o pacote identifica claramente a falta do enunciado. A IA não deve atribuir nota sem verificar o arquivo da atividade e os critérios. Falhas ao baixar anexos também são registradas no pacote.

Somente vínculos no próprio Moodle e associados à descrição ou à área de anexos da tarefa entram na coleta. Referências em outros pontos do curso com nomes parecidos continuam exigindo conferência do tutor. São aceitos até 15 vínculos por tarefa e até 25 MB de anexos por atividade.

## Verificação

O teste automatizado cobre um anexo da atividade e um envio de aluno com o mesmo nome, além da leitura secundária na tela de avaliação. O comportamento específico do CMID 335663 precisa ser conferido na sessão autenticada do Moodle após instalar a versão 3.7.13. A captura do erro não contém o HTML nem o arquivo da tarefa, portanto não confirma em qual área o Moodle disponibiliza o enunciado nesse caso.

Referência: [documentação da atividade Assignment no Moodle](https://docs.moodle.org/502/en/Assignment_activity).
