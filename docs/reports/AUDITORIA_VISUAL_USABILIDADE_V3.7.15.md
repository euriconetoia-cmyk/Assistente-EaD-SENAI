# Auditoria visual e de usabilidade — Assistente EaD SENAI 3.7.15

## Escopo e evidências

Revisão estática do painel no Moodle (`content/ui.js`, `content/styles.css`), faixa de pendências e importador (`content/importer/contextual-importer.*`), correção em lote (`content/batch-grading.js`) e Central de Gestão (`dashboard/index.html`, `dashboard/dashboard.js`, `dashboard/dashboard.css`). Foram considerados os fluxos do tutor, os estados de leitura, a auditoria local e os testes de interface existentes. As recomendações de hierarquia, formulários, navegação e acessibilidade seguem a skill instalada `ui-ux-pro-max`.

Esta revisão **não** equivale a um teste de uso em sessão autenticada do Moodle nem a uma auditoria automática de WCAG em todas as telas. Mudanças que dependem do tema e do HTML real do Moodle exigem validação no ambiente de homologação.

## O que já funciona bem

- O painel possui menu lateral recolhível, jornada do tutor, próxima ação, estados de leitura parcial e separação entre correção, acompanhamento e auditoria.
- O dashboard dispõe de filtros globais, acesso rápido à fila, tema escuro, link para pular ao conteúdo e menu lateral com nomes acessíveis.
- A correção em lote exige associação e conferência, permite editar notas, informa nota máxima e relê dados após o envio.
- O código prevê foco visível, redução de movimento, aviso de dados indisponíveis e distinção entre pendência confirmada e leitura não verificada.
- A auditoria oferece histórico, filtros, escolha de pasta e alternativa de download ZIP.

## Achados priorizados

| Prioridade | Local | Evidência observada | Mudança proposta | Como validar |
| --- | --- | --- | --- | --- |
| P0 | Dashboard | `dashboard/index.html` mostra “Moodle conectado” de forma fixa; em `dashboard/dashboard.js`, “Atualizar no Moodle” abre `/my/` em outra aba. | Trocar por “Dados locais · última coleta em …”; renomear botão para “Abrir Moodle para atualizar”. Mostrar “Leitura parcial” quando aplicável. | Sem dados, offline e com dados antigos, a tela nunca afirma conexão ou atualização que não confirmou. |
| P0 | Correção em lote | O fluxo inteiro ocupa um modal longo: opções, importação, associação, tabela de seis colunas, confirmação, envio e verificação (`content/batch-grading.js`). | Dividir visualmente em cinco etapas com progresso persistente: carregar, associar, revisar, salvar e verificar. Manter intactas as barreiras de validação e a edição de nota. | Tutor identifica a etapa, a ação seguinte e os erros sem percorrer o modal inteiro; o resultado distingue nota verificada, apenas feedback e não verificado. |
| P0 | Leitura e pendências | O dashboard soma pendências e inicializa contador do menu em `0` (`dashboard/dashboard.js`), enquanto o inventário pode ser parcial. | Exibir total confirmado e cobertura da leitura próximos um do outro; estado desconhecido não deve virar “tudo certo”. Contador do menu deve indicar parcialidade quando houver. | Com uma UC sem leitura concluída, o usuário vê o número confirmado e o aviso de cobertura na mesma região. |
| P1 | Painel inicial | “Minha jornada”, três prioridades, ações rápidas, quatro cartões, situação, atividade recente e fila completa convivem na mesma tela (`content/ui.js`). | Deixar no topo uma única ação principal, até três pendências e três indicadores; recolher jornada explicativa, detalhamento e histórico. Evitar repetir links “Correções”, “Alunos” e “Auditoria” se já estão no menu. | Em largura de 430 px, a primeira tela mostra o estado da UC e a ação seguinte sem rolagem extensa. |
| P1 | Navegação do dashboard | Dez destinos são representados por glifos no menu compacto, padrão em `dashboard/index.html`; rótulos aparecem só após expansão/tooltip. | Abrir o menu com rótulos em telas largas, manter estado escolhido pelo usuário e reduzir destinos de uso raro sob “Gestão”. Usar ícones SVG consistentes com o painel. | Usuário novo identifica “Fila”, “Auditoria” e “Relatórios” sem passar o mouse. Teclado e leitor de tela continuam funcionando. |
| P1 | Listagens no Moodle | Tabela de cursos exige pelo menos 980 px (`contextual-importer.css`); tabelas do painel têm 560 px e texto de 12 px (`content/styles.css`). | Em telas estreitas, usar cartões com curso, estado e ação, ou manter coluna de identidade e ação visível durante rolagem. Aumentar texto essencial e respeitar zoom de 200%. | Nome do curso, pendência e ação permanecem identificáveis em 375 px e em zoom de 200%. |
| P1 | Importação e conferência | A tabela de revisão inclui nota, nota máxima, feedback e ação prevista em seis colunas; feedback completo disputa espaço com valores críticos. | Apresentar uma linha resumida por aluno com nota / nota máxima / estado; abrir feedback e edição em detalhe. Resumo fixo com total de alunos, notas, feedbacks, divergências e bloqueios. | É possível comparar nota e escala e editar uma linha sem perder aluno ou atividade de vista. |
| P1 | Mensagens de erro | `#mat-batch-log` usa uma região de status para o lote; erros de vinculação e de campo aparecem em lugares diferentes. | Inserir resumo de erros no início da etapa, com links para arquivo, aluno ou nota problemática; manter descrição junto ao campo e foco no primeiro bloqueio. | Ao carregar CSV inválido, um usuário com teclado identifica a causa e chega ao campo correspondente. |
| P2 | Interações compactas | Botão “Importar notas” na faixa do curso tem `min-height: 30px` e fonte de 12 px; há também 11 px em metadados (`contextual-importer.css`, `content/styles.css`). | Alvos de toque de 40–44 px nas ações principais; aumentar rótulos essenciais a 14 px ou mais e reservar 11–12 px para metadados secundários. | Controles podem ser acionados em tela sensível ao toque; contraste e leitura passam por avaliação visual nos dois temas. |
| P2 | Anúncios e foco | A Central tem `aria-live="polite"` em `#view-root` inteiro; a busca e os filtros reconstroem a região (`dashboard/index.html`, `dashboard/dashboard.js`). | Anunciar somente uma frase com contagem de resultados, não toda a página. Ao mudar de área, focar o título da nova área; ao filtrar, preservar foco no campo. | Leitor de tela não recita listas inteiras após digitar cada caractere; foco não desaparece. |
| P2 | Consistência visual | Painel, importador e dashboard usam folhas próprias, com alguns tokens compartilhados e valores pontuais diferentes. | Consolidar escala de espaço, tipografia, raio, cores de estado e componentes de aviso/botão, preservando o isolamento do Shadow DOM. | Os mesmos estados e ações usam rótulos, cores e espaçamentos equivalentes nas três superfícies e no tema escuro. |
| P2 | Auditoria | Há escolha de pasta, ZIP, relatórios e exportações em áreas diferentes do dashboard. | Colocar uma ação primária “Exportar evidências” na Auditoria e descrever conteúdo, período e pasta escolhida; manter relatórios gerais separados. | Usuário sabe o que será salvo e onde, inclusive quando o navegador não permite escolher pasta. |

## Proposta de organização visual

**Painel no Moodle:** cabeçalho do curso e estado da coleta; menu lateral com Hoje, Alunos, Correções, Notas e Auditoria; no Hoje, próxima ação e resumo curto; Curso, Fechamento e Diagnóstico em “Mais”. Em tela estreita, barra inferior com os destinos principais e um menu “Mais”.

**Correção:** etapas visíveis no alto, cabeçalho com curso e atividade, resumo do lote, lista de estudantes, detalhe do estudante com nota e feedback editáveis, ação de confirmação e tela final com três resultados distintos: confirmado no Moodle, somente feedback confirmado, não verificado. Erros abrem diretamente a linha correspondente.

**Central de Gestão:** rótulos visíveis no menu quando houver largura, barra de filtros compacta com indicador da quantidade de resultados e data da coleta, painéis de indicadores com fonte e cobertura, fila e histórico sem números falsamente conclusivos.

## Plano de execução sugerido

1. **Corrigir textos de estado e indicadores.** Resolver conexão, coleta, parcialidade e contador antes de alterar a aparência: são sinais que orientam decisões acadêmicas.
2. **Redesenhar o fluxo de correção em lote.** Fazer protótipo com dados fictícios e validar com tutor; implementar etapas mantendo a lógica de validação e salvamento atual.
3. **Enxugar a tela inicial e melhorar a navegação.** Priorizar a ação seguinte e diminuir repetição. Definir comportamento em desktop, 430 px e 375 px.
4. **Uniformizar tabelas, tipos e controles.** Revisar zoom, teclado, toque, tema escuro e mensagens de erro.
5. **Validar com tarefas reais.** Localizar uma pendência, baixar o enunciado, importar CSV, corrigir uma nota, confirmar a gravação e exportar evidências. Conferir em dois ambientes Moodle, estados sem dados e leitura parcial.

## Critérios de aceite antes da próxima versão

- Nenhuma mensagem apresenta conexão, atualização, ausência de pendências ou nota confirmada sem evidência correspondente.
- Um tutor conclui as tarefas de correção e conferência sem perder o contexto do aluno, da atividade ou da nota máxima.
- Navegação por teclado e leitor de tela preserva foco e anuncia alterações curtas e úteis.
- Interface é legível e operável em 375 px, 430 px, desktop, zoom de 200% e tema claro/escuro.
- Testes de regressão continuam cobrindo associação de CSV, escala de notas, notas vazias, sobrescrita, confirmação no Moodle, coleta de enunciados e exportação da auditoria.

Esta auditoria propõe mudanças; nenhuma interface ou lógica operacional foi alterada por este documento.
