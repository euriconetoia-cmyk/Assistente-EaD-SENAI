# Revisão geral do Assistente EaD SENAI 3.7.12

Data: 16/09/2026. Escopo: código da extensão, interface do painel, resumo do curso, Central de Gestão, importação de notas, downloads para correção, auditoria local e documentação. Revisão estática com testes automatizados; não houve acesso a uma turma Moodle real nesta execução.

## O que o tutor deve ver

| Situação | Informação na interface | Tratamento |
|---|---|---|
| Consulta de um curso | Total de pendências e atividades, ou impossibilidade de confirmar | Estado explícito, sem interpretar ausência de dados como zero |
| Preparação de arquivos | Botão ocupado e, ao fim, início do download ou erro com a atividade afetada | Resumo do curso com mensagem acessível |
| Enunciado não encontrado | Nome e CMID da atividade, com orientação para abrir a página original | Atividade não entra no pacote de IA; o ZIP do resumo não é iniciado |
| Importação de CSV | Associação ao curso/atividade, nota, limite, feedback, ação e divergência após salvar | Conferência do tutor antes e depois do envio |
| Auditoria local | Histórico, pasta escolhida e exportação de evidências | Dados individuais apenas após escolha explícita |

Detalhes internos, como seletores HTML, nomes de funções, pilhas de erros e tokens de sessão, não devem ser mostrados ao tutor. Mensagens operacionais precisam identificar a atividade e a ação necessária.

## Download de correções e enunciado

Antes desta revisão, o botão **Baixar atividades** da página do curso baixava apenas os arquivos dos alunos. O botão **Baixar pacote para correção com IA** criava um arquivo de enunciado, mas aceitava um texto substituto quando não encontrava a descrição. Isso permitia enviar à IA um pacote aparentemente completo sem o contexto da tarefa.

Agora o primeiro ZIP organiza cada atividade em uma pasta identificada pelo CMID, com `enunciado_da_atividade.txt`, `dados_da_atividade.txt` (URL de origem) e arquivos dos alunos. Ambos os fluxos interrompem ou excluem explicitamente uma atividade sem enunciado e explicam isso na interface. A cópia é texto extraído da descrição acessível da atividade, limitada a 50 mil caracteres. Imagens, vídeos, fórmulas desenhadas e anexos citados no enunciado não são automaticamente convertidos para texto: o tutor deve conferir a página original antes de usar IA.

## Pontos observados no restante do projeto

| Prioridade | Ponto | Próximo passo sugerido |
|---|---|---|
| Alta | A extração depende do HTML da instalação Moodle. Um tema que mova o enunciado ou use somente anexo pode deixar a tarefa sem texto. | Testar em uma atividade real de cada ambiente; considerar anexo do enunciado e indicador de texto parcial. |
| Alta | O botão do resumo mantém limite de 50 MB e 200 arquivos; o fluxo para IA divide pacotes maiores, mas limita a 30 atividades por lote. | Unificar o caminho de download ou oferecer seleção por atividade e explicar os limites antes de baixar. |
| Alta | Sucesso de envio de nota deve depender da releitura do valor no Moodle, especialmente quando o feedback foi salvo mas a nota não. O código já dispõe de verificação e aviso específicos. | Homologar com uma nota e um feedback reais; guardar a evidência de conferência sem expor notas desnecessariamente. |
| Média | O painel principal descrevia o pacote como um ZIP único mesmo quando o código o divide. | Texto ajustado para explicar a divisão em partes. |
| Média | Downloads contêm trabalhos e nomes de alunos, portanto exigem guarda local adequada. | Reforçar orientação de armazenamento e exclusão segura após o uso. |
| Média | O coletor de enunciado usa `textContent` como alternativa a `innerText`. O resultado pode perder formatação que tenha sentido acadêmico. | Avaliar exportação de HTML sanitizado ou anexos, com amostras reais de tarefas. |

## Validação e limites

Executar `npm test`, `npm run validate` e conferir os arquivos do instalador. Um teste automatizado verifica enunciado presente, pasta/CMID e falha explícita quando ausente. A execução em Moodle autenticado e a conferência visual do ZIP baixado precisam ser realizadas com uma turma de homologação. A revisão não garante que cada tema Moodle forneça o enunciado no seletor atual.

Créditos do projeto mantidos em `CREDITOS.md` e na interface.
