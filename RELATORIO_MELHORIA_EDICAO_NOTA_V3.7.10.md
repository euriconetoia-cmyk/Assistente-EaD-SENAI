# Relatório da melhoria de edição de nota da versão 3.7.10

## Alteração visual

A coluna Nota da conferência agora apresenta um campo editável permanente para cada aluno. O tutor pode corrigir o valor e selecionar Aplicar sem abrir a edição completa da linha.

O campo mostra a nota máxima confirmada para a atividade. Quando o limite ainda não estiver disponível, a interface informa claramente que ele não foi confirmado.

## Validações

- Aceita vírgula ou ponto como separador decimal.
- Apresenta o valor no padrão brasileiro com duas casas.
- Impede nota negativa, texto não numérico e valor acima da nota máxima confirmada.
- Transforma nota zero em nota em branco, desde que exista feedback.
- Mantém a edição completa da linha para alterações no feedback.
- Desmarca a autorização anterior sempre que a nota for modificada.

## Acessibilidade

Cada campo possui rótulo associado, descrição do limite, mensagem de erro com função de alerta, botão com nome acessível e realce de foco para navegação pelo teclado.

## Resultado

Foram aprovados 72 testes automatizados. A auditoria estrutural confirmou 55 arquivos e 23 referências do manifesto sem falhas.
