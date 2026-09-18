# Análise de simplificação do Assistente EaD SENAI

Data: 16/09/2026. Versão mantida em 3.7.14.

## Ajuste aplicado

O botão “Baixar atividades” foi retirado da faixa de pendências da página do curso. Sua implementação criava um segundo ZIP com limites e formato diferentes do pacote de correção com IA. O gerador, as rotinas auxiliares, os estados e estilos que existiam só para esse botão foram removidos. A faixa mantém a quantidade de pendências, “Importar notas” e a atualização da contagem. O download de correções permanece em Painel do Assistente, Correções, “Baixar pacote para correção com IA”. Esse pacote inclui envios e contexto de cada atividade quando acessível, inclusive arquivos anexados pelo professor.

## Outras oportunidades de unificação

| Prioridade | Situação encontrada | Simplificação sugerida | Cuidado antes de alterar |
|---|---|---|---|
| Alta | O resumo do curso oferece “Importar notas”; o painel oferece “Lançar tudo”; cada cartão de atividade também traz “Importar notas”. | Explicitar quando usar importação por atividade e importação em lote, com nomes e orientação consistentes. Considerar remover apenas o atalho geral do resumo. | Preservar o vínculo exato da atividade e a conferência antes do envio. |
| Alta | O resumo do curso consulta contagens próprias, enquanto o painel usa a análise salva. Os dois números podem ter horários e escopos diferentes. | Exibir origem e horário da leitura no resumo e oferecer atualização coordenada no painel. | Não substituir valor confirmado por zero inferido nem disparar consultas duplicadas. |
| Média | “Exportar evidências” aparece na visão geral e em Auditoria do painel; a Central de Gestão também gera um pacote de auditoria. | Adotar uma entrada principal de exportação e diferenciar claramente relatório do curso e auditoria local. | Os pacotes têm fontes e dados diferentes; não combinar dados individuais sem a confirmação existente. |
| Média | O painel de curso tem oito áreas e a Central de Gestão tem dez, com visões de risco, histórico e atividades em comum. | Definir o painel como local de ação por curso e a Central como análise de várias turmas. Usar nomes e links de navegação consistentes. | Preservar funcionalidades específicas de cada escopo e os filtros do dashboard. |
| Média | O importador contextual concentra coleta, badges, CSV, avaliação e inventário de cursos em um arquivo com mais de 3.700 linhas. | Separar os módulos por responsabilidade e manter o núcleo de validação compartilhado. | Fazer extração gradual com testes de integração para curso, categoria, importação e lote. |
| Média | O pacote mestre de correção divide volumes acima de 450 MB, mas aceita até 30 atividades por chamada. | Seleção por atividade ou processamento paginado no próprio painel. | Controlar memória, múltiplos downloads e atividades cujo enunciado só esteja em arquivo. |
| Média | Varreduras automáticas de curso e categoria ficaram habilitadas por padrão nesta versão. | Tornar visível quando uma leitura está em andamento, quantas páginas consultará e como pausá-la. | Preservar cache e concorrência controlada para turmas extensas. |

## Validação e alcance

Os testes automatizados e a validação estrutural verificam a remoção do download duplicado e a permanência do botão de pacote com IA. Não houve acesso autenticado ao Moodle nem teste visual em uma turma real nesta revisão. Os créditos permanecem em `CREDITOS.md` e na interface. Nenhuma das demais unificações sugeridas foi executada neste ajuste.
