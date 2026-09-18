# Revisão visual e funcional da versão 3.7.15

## Áreas ajustadas

| Área | Resultado |
| --- | --- |
| Painel do tutor | Próxima ação em primeiro plano; jornada e histórico recolhíveis; ícones de linha consistentes; rótulos maiores no menu estreito. |
| Central de Gestão | Menu legível em telas largas; ícones SVG consistentes; indicador de dados locais e idade da coleta; cobertura ao lado do mínimo de pendências; foco na seção aberta e anúncio breve dos filtros. |
| Importação e correção | Cinco etapas visíveis; lista de bloqueios com acesso aos campos; associação preserva foco; tabela de revisão vira cartões em telas estreitas. |
| Página do Moodle | Botões do resumo do curso maiores; visão geral e fila apresentadas como cartões em telas pequenas; ação principal de atualização em destaque. |
| Segurança de navegação | A Central somente abre links HTTPS dos ambientes `ead.senai.br` e `ead.fieg.com.br`; registros com leitura inconclusiva permanecem na fila. |
| Identidade | Ícone próprio de livro e confirmação em quatro tamanhos; cores alinhadas ao painel. Créditos preservados. |

## Garantias verificadas

- A escala proporcional, a nota zero, a atividade incorreta, o SENAI Play, a associação exata e a conferência posterior ao salvamento continuam cobertas pela suíte.
- A validação estrutural verifica JavaScript, CSS, manifesto, arquivos referenciados e permissões.
- A integridade é reproduzível por `npm run checksums` e `npm run integrity`.

## Limite da validação

Os testes são locais e simulados; não confirmam o resultado de um envio em Moodle autenticado. Antes de usar o lote com alunos reais, instalar em ambiente de homologação, abrir uma atividade de teste em cada Moodle, revisar nota e feedback, salvar e conferir ambos na página do estudante. Também testar 375 px, 430 px, desktop, tema claro e escuro, teclado e zoom de 200%.
