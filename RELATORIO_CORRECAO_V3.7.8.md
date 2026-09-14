# Relatório de correção da versão 3.7.8

## Problema reproduzido

O Moodle confirmava o salvamento das notas e dos feedbacks, mas a conferência final retornava “Tabela de envios do Moodle não encontrada nesta página”. A extensão tratava a ausência da tabela como impossibilidade total de conferir, mesmo quando o lançamento já havia sido aceito pelo Moodle.

## Causa

Depois do envio da avaliação rápida, determinados temas e configurações do Moodle não voltam a apresentar a tabela de correção na rota esperada. A versão anterior possuía somente essa tabela como fonte de releitura dos valores persistidos.

## Correção aplicada

A conferência agora utiliza duas fontes. Primeiro, tenta reler a tabela de avaliação rápida. Quando o aluno ou a tabela não estiver disponível, consulta a ficha individual de avaliação usando o ID do aluno confirmado durante a descoberta paginada. A nota e o feedback são extraídos do formulário individual e comparados com o plano de conferência do CSV.

## Estados preservados

- Salvamento confirmado: o Moodle informou que recebeu e gravou as alterações.
- Conferido: a nota e o feedback relidos coincidem com os valores solicitados.
- Divergente: o valor relido difere do solicitado.
- Não verificável: nenhuma das fontes permitiu reler o campo com segurança.

## Segurança

As consultas utilizam somente a sessão autenticada do Moodle atual, restringem a origem ao ambiente atual e rejeitam redirecionamentos para login ou origem externa. Nenhuma permissão foi adicionada.

## Validação

Foram aprovados 70 testes automatizados, incluindo o novo caminho de contingência. Também foram verificadas sintaxe, estrutura, Manifest V3, CSP, permissões e integridade do pacote.

## Homologação recomendada

Executar inicialmente em uma atividade de teste com um aluno, uma nota e um feedback. Confirmar o resultado diretamente no Moodle e baixar a conferência gerada. Depois, repetir com SAP 01 e SAP 02.
