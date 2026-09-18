# Relatório de correção da persistência de notas

Versão: 3.7.11  
Data: 15/09/2026

## Problema analisado

O Moodle podia confirmar o envio do formulário e persistir o feedback, mas deixar a nota vazia. A confirmação geral do Moodle comprova o processamento do formulário, não o sucesso individual de cada campo.

## Causa identificada

Quando todos os campos de nota estavam vazios, a extensão não encontrava um valor de amostra para descobrir o separador decimal da página. O fallback utilizava ponto. Em uma interface Moodle em português, esse valor podia ser interpretado de maneira incompatível, permitindo o salvamento do feedback e o descarte isolado da nota.

A conferência individual também aceitava o primeiro elemento chamado `grade`, inclusive quando fosse um campo oculto ou desabilitado. Isso criava risco de reler um elemento que não representava a nota acadêmica editável.

## Correções aplicadas

1. A convenção decimal passa a considerar o idioma da página quando não há valor de amostra. Páginas em português usam vírgula.
2. Antes de submeter o formulário, cada nota solicitada é novamente associada ao aluno correto.
3. O campo precisa estar habilitado, possuir nome e pertencer ao formulário realmente enviado.
4. A nota precisa existir no `FormData` e ser numericamente equivalente ao valor autorizado.
5. Qualquer inconsistência bloqueia o envio antes de alcançar o Moodle.
6. A releitura individual ignora campos ocultos ou desabilitados.
7. Feedback salvo com nota ausente ou diferente passa a ser informado explicitamente como divergência.
8. A atividade somente recebe resultado de sucesso quando todos os campos solicitados são relidos e confirmados.

## Regras preservadas

- Nota zero permanece em branco e gera somente feedback.
- Ausência de nota não é tratada como zero.
- Notas e feedbacks somente são alterados após conferência e autorização explícitas.
- Curso, atividade, CMID e aluno continuam sujeitos à identificação exata.
- Os créditos de Eurico Cirilo e Julio Alves foram preservados.

## Validação

- 75 testes automatizados aprovados.
- 0 testes reprovados.
- 55 arquivos e 23 referências do manifesto verificados.
- Manifest V3, CSP e permissões mínimas preservados.
- Nenhuma nova permissão adicionada.

## Homologação recomendada

Executar inicialmente uma atividade com dois alunos e notas decimais ou inteiras. Após o lote, confirmar que a tela apresenta a nota esperada, a nota relida e o estado `Confirmado`. Em seguida, abrir diretamente o livro de notas ou a ficha individual do aluno no Moodle. Lotes maiores somente devem ser processados depois dessa homologação no ambiente real.
