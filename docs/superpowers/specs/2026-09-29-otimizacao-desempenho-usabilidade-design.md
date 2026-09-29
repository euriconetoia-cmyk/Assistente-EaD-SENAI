# Especificação: Otimização incremental de desempenho e usabilidade

## Contexto e objetivo

O Assistente EaD SENAI precisa reduzir leituras redundantes do Moodle, tempo de carregamento e trabalho contínuo de CPU sem reduzir a segurança da correção, a conferência posterior ao lançamento ou a auditoria local.

A implementação segue o relatório de otimização de 29/09/2026 e preserva Manifest V3, JavaScript nativo, armazenamento local, domínios autorizados e permissões atuais.

## Decisões aprovadas

1. Não haverá reescrita completa nem inclusão de framework, bundler ou dependência de produção.
2. A extensão deixará de iniciar varreduras extensas somente por abrir uma página.
3. Dados locais recentes serão exibidos imediatamente com horário, escopo, cobertura e estado de confirmação.
4. A leitura detalhada será acionada pelo tutor e limitada inicialmente à UC, curso ou atividade escolhida.
5. Gravações de notas e feedback permanecem transacionais, retomáveis e obrigatoriamente conferidas no Moodle.
6. Nenhum estado parcial, erro de leitura ou fonte contraditória será apresentado como zero pendências ou sucesso.

## Arquitetura de requisições

Será criado um RequestBroker interno como porta comum de leitura HTML do Moodle.

### Responsabilidades

- Canonicalizar a chave da leitura por host, rota, parâmetros relevantes, curso, CMID e página.
- Reutilizar uma promessa já em andamento para chamadas equivalentes.
- Manter cache em memória por aba com TTL explícito.
- Aplicar concorrência global máxima de duas leituras interativas.
- Priorizar atividade aberta, correção em lote e conferência pós-salvamento.
- Permitir cancelar tarefas de baixa prioridade que ainda não começaram.
- Registrar telemetria local mínima: origem, tipo de leitura, duração, bytes, resultado, cache hit, deduplicação e cancelamento.
- Não persistir conteúdo acadêmico adicional somente para telemetria.

### TTL inicial

| Recurso | TTL |
| --- | --- |
| Estrutura do curso | 15 minutos |
| Pendências da atividade | 10 minutos |
| Linhas requiregrading | 5 minutos |
| Participantes e livro de notas | 15 minutos |
| Recursos SAP da UC | 30 minutos |

A atualização forçada invalida apenas o escopo solicitado.

## Novo comportamento de coleta

### Curso

Ao abrir a página, a extensão apresenta o snapshot local disponível e não inicia leitura extensa. O tutor pode escolher:

- Conferir pendências da UC ativa.
- Atualizar o curso inteiro.
- Atualizar alunos e notas.
- Atualizar uma atividade específica.

A UC ativa é o escopo padrão. Curso inteiro é ação explícita.

### Categoria e Meus cursos

Ao abrir, as telas mostram inventário ou último resultado local. Nenhuma varredura de todos os cursos começa automaticamente.

Uma ação explícita permite escolher UCs vigentes ou todos os cursos. A fila é cancelável e informa quantidade concluída, pendente, parcial e com erro.

### Pendências

A tela de avaliação com `status=requiregrading` é a fonte autoritativa para contagem detalhada e para os arquivos do pacote de correção. A extensão não deve consultar primeiro um resumo e depois abrir uma segunda leitura independente para confirmar o mesmo resultado.

Paginação só ocorre quando a tela indicar que é necessária. Cobertura incompleta permanece em estado Verificar.

## Desempenho de interface e armazenamento

- Substituir o polling de contexto a cada 1,8 segundos por detecção de mudança de URL, observação restrita e pausa com aba oculta.
- Restringir MutationObservers ao contêiner necessário e desconectá-los quando a rota mudar.
- Mover a limpeza de retenção para rotina diária via alarms, sem `get(null)` em cada inicialização.
- Evitar ler e regravar toda a auditoria ou histórico quando apenas um evento muda.
- Separar o importador contextual em scripts por rota: bootstrap compartilhado, curso, categoria, meus cursos e avaliação rápida.
- Manter a ordem explícita de dependências no manifest e ampliar o teste estrutural.

## Usabilidade e navegação

A interface deve usar os tokens já definidos em `docs/contexto/design.md`.

Em todas as superfícies:

- Cabeçalho com origem, horário e escopo da leitura.
- Uma ação principal visível: Atualizar UC, Atualizar curso ou Conferir atividade.
- Estados inequívocos: Dados salvos, Atualizando, Parcial, Verificar, Erro e Confirmado.
- Ações extensas exibem fila, progresso, cancelamento e resultado resumido.
- Em telas estreitas, curso, pendência e ação permanecem visíveis sem tabela horizontal obrigatória.
- Tema claro, escuro, foco visível, teclado e redução de movimento permanecem funcionais.

## Entregas em etapas

1. Telemetria local de requisições e testes de linha de base.
2. Desativação padrão dos scans automáticos extensos e nova navegação por escopo.
3. RequestBroker, cache compartilhado, deduplicação, fila e cancelamento.
4. Uso unificado de requiregrading e reaproveitamento de dados no pacote de correção.
5. Redução de polling, otimização de storage e divisão dos scripts por rota.
6. Revisão visual, testes automatizados, validação estrutural, checksums e homologação autenticada.

## Critérios de aceite

- Abrir curso, categoria ou Meus cursos sem pedir atualização não gera varredura de pendências.
- Chamadas equivalentes compartilham a mesma requisição em andamento ou o resultado dentro do TTL.
- Uma atualização de UC consulta uma atividade no máximo uma vez por ciclo, salvo paginação comprovada.
- Ações de correção e conferência têm prioridade sobre leituras gerais.
- Cancelar uma fila impede chamadas ainda não iniciadas.
- A ausência de pendências só aparece como confirmada quando houver evidência suficiente; demais casos mostram Verificar ou Parcial.
- Lançamento em lote e releitura pós-salvamento continuam íntegros.
- Testes cobrem cache, TTL, deduplicação, invalidação, cancelamento, prioridade, paginação e regressões de requiregrading.
- A interface é revisada em 375px, 430px, desktop, zoom de 200%, tema claro e escuro.
- Antes de release: `npm test`, `npm run validate`, `npm run checksums` e `npm run integrity` devem passar.
- A versão somente será declarada homologada após validação autenticada no Moodle SENAI e FIEG com curso e aluno de teste.

## Fora de escopo

- Novo domínio Moodle, novas permissões ou integração externa.
- Alteração das regras de associação exata por CMID ou nome normalizado.
- Remoção da confirmação em duas etapas ou da releitura após gravação.
