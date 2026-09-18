# Relatório de correção do Assistente EaD SENAI 3.7.2

## Erro analisado

O lote localizava a atividade e a tabela do Moodle, mas bloqueava alunos posicionados depois dos primeiros 100 participantes com a mensagem “aluno não encontrado na página atual”.

## Causa

A versão 3.7.1 havia limitado a tela automatizada de avaliação rápida e a conferência posterior a 100 participantes. Em turmas maiores, os demais alunos ficavam em outra página e não podiam ser reconciliados.

## Correção

- A tela de lançamento solicita até 500 participantes por página.
- A conferência pós-salvamento utiliza a mesma cobertura.
- O filtro permanece configurado como “todos”.
- A correspondência por identificador ou nome exato continua obrigatória.
- Nenhuma regra de nota, feedback ou sobrescrita foi flexibilizada.

## Validação

- 63 testes automatizados aprovados.
- Teste específico confirma `perpage=500` nas duas etapas.
- Nenhuma nova permissão foi adicionada.
- Créditos de Eurico Cirilo preservados.
