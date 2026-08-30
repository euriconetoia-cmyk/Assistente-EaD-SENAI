# Alterações

## 3.7.0

- adota menu híbrido compacto, expansível e responsivo no painel do Moodle e na Central de Gestão;
- unifica cores, tipografia, foco, tabelas e tema escuro entre dashboard, painel e importador;
- remove as abas horizontais do painel e reorganiza a visão geral em quatro indicadores essenciais;
- cria a Central operacional com prioridades, próxima ação, comandos rápidos e cartão consolidado da UC;
- integra atividade recente à Auditoria Local;
- substitui “Verificar” por estados explícitos de disponibilidade e confiabilidade;
- traduz falhas de rede para mensagens compreensíveis e mantém detalhes técnicos no Diagnóstico;
- corrige notificações sobrepostas e estabelece uma única rolagem principal;
- renderiza somente a área ativa do painel para reduzir trabalho desnecessário;
- cria a Auditoria Local em linha do tempo com filtros por período, resultado, tipo e pesquisa;
- registra eventos minimizados de análise, importação, conferência, mensagens, relatórios e exportações;
- permite escolher uma pasta do computador pelo seletor seguro do Chrome;
- mantém a referência da pasta no IndexedDB e verifica a autorização antes de cada gravação;
- preserva o download em ZIP quando o acesso direto à pasta estiver indisponível ou negado;
- exporta relatório HTML, histórico CSV, auditoria JSON, manifesto e hashes SHA-256;
- exige confirmação específica para incluir dados acadêmicos individuais na exportação;
- migra registros do histórico anterior sem apagar os dados da versão 3.6.8;
- mantém permissões mínimas, processamento local, CSP e créditos do projeto.

## 3.6.8

- adiciona o botão “Editar” para cada aluno na conferência anterior ao salvamento;
- permite revisar e alterar individualmente a nota e o feedback importados;
- valida a nota editada e limita o tamanho do feedback;
- invalida a confirmação anterior após uma edição e exige nova conferência;
- mantém a comparação posterior com os valores efetivamente gravados no Moodle.

## 3.6.7

- exibe “By Eurico Cirilo” no rodapé da própria aplicação;
- posiciona o crédito ao lado de “Dados locais”, “Pronto” e da versão instalada;
- mantém o crédito vinculado ao perfil profissional e preservado no arquivo `CREDITOS.md`.

## 3.6.6

- adiciona a exportação local de evidências do histórico em um pacote ZIP;
- inclui relatório HTML, histórico CSV, auditoria JSON e instruções de conferência;
- amplia a retenção local para até 2.000 registros de ação por curso;
- mantém o arquivo `CREDITOS.md` na raiz das versões e atualizações.

## 3.6.5

- remove o botão e a integração direta com o WhatsApp;
- permite editar a mensagem automática antes do envio;
- adiciona o botão “Enviar mensagem” ao lado de “Copiar mensagem”;
- encaminha a mensagem revisada para a mensageria do próprio AVA.

## 3.6.4

- gera um ZIP independente para cada atividade pendente;
- inclui em cada pacote o enunciado, os critérios, os dados da atividade e os envios dos alunos;
- inclui instruções de correção e manifesto específicos da atividade;
- elimina o limite combinado de 100 MB entre várias atividades;
- mantém limite individual de segurança de 500 MB por atividade;
- continua preparando as demais atividades quando uma delas falhar.

## 3.6.3

- remove o limite prático de 96 cursos na visão geral das turmas;
- percorre automaticamente todas as páginas de Meus cursos;
- elimina cursos repetidos pelo identificador do Moodle;
- interrompe a paginação quando não houver próxima página ou novos cursos;
- mantém um limite de segurança de 100 páginas e sinaliza inventário parcial se ele for atingido.
- força uma nova leitura das pendências ao atualizar, sem reutilizar contagens antigas por 15 minutos;
- verifica todas as atividades do curso, removendo o limite anterior de 30 atividades.

## 3.6.2

- adiciona uma etapa obrigatória de conferência antes do salvamento em lote;
- exibe, por atividade e aluno, a nota e o feedback provenientes do CSV;
- mostra as regras de preservação ou sobrescrita dos valores existentes;
- invalida a conferência quando arquivos, atividades ou opções de sobrescrita são alterados;
- mantém a releitura pós-salvamento para confirmar o que foi efetivamente gravado no Moodle.

## 3.6.1

- novo pacote único para correção em lote com inteligência artificial;
- uma pasta por atividade, com enunciado, critérios ou rubrica disponíveis, nota máxima, prazo, CMID e URL;
- inclusão do ZIP original dos envios de cada atividade dentro do pacote consolidado;
- manifesto CSV ampliado com a situação de localização do enunciado e dos critérios;
- avisos explícitos quando o Moodle não fornecer enunciado, rubrica ou nota máxima;
- arquivo LEIA-ME orientando a IA a não inventar dados ausentes;
- limite de 100 MB e validação da assinatura dos ZIPs retornados pelo Moodle.

## 3.6.0

- Central de Gestão Moodle redesenhada como página HTML independente;
- dez áreas: visão geral, turmas e UCs, risco, desempenho, tutores, calendário, fila, ambientes, histórico e relatórios;
- filtros globais compartilhados entre todas as áreas;
- fila de trabalho priorizada por pendências e integridade da leitura;
- histórico local limitado às 24 análises mais recentes;
- exportações de relatório geral, calendário e fila em CSV, backup JSON e impressão otimizada para PDF;
- tema claro e escuro, navegação por teclado e estados explícitos para dados não fornecidos pelo Moodle;
- nenhuma nova permissão e nenhuma persistência nominal de alunos no dashboard agregado.

## 3.5.0

- botão “Mostrar calendário” com turmas e UCs futuras ordenadas pela data de início;
- botão “Abrir dashboard” em página própria da extensão;
- indicadores consolidados de cursos, UCs atuais, futuras, alunos reconhecidos e pendências;
- conclusão de atividades, média das turmas e cobertura da leitura quando as fontes estiverem disponíveis;
- filtros por ambiente, vigência, situação e pesquisa textual;
- exportação do dashboard para CSV;
- impressão otimizada para exportação em PDF;
- dados acadêmicos individuais não são incluídos no dashboard agregado.

## 3.4.0

- nova visão geral das turmas na página inicial do Moodle;
- inventário ampliado pela página “Meus cursos”, com eliminação de duplicidades pelo ID;
- identificação de UC atual e vigências em sobreposição por turma;
- análise gradual de pendências com duas consultas simultâneas;
- tabela geral com período, vigência, pendências e situação da leitura;
- exportação CSV de todas as turmas identificadas;
- indicação explícita quando o inventário ou alguma leitura ficar parcial.

## 3.3.2

- identificação automática da UC atual pela data inicial mais recente dentro do período vigente;
- identificação das demais UCs vigentes em sobreposição, futuras, encerradas ou sem período reconhecido;
- importação abre a visão completa dos participantes para evitar falsos alunos não encontrados;
- conferência relê notas em campos numéricos, listas de escala e células de nota exibidas pelo Moodle.

## 3.3.1

- todos os cartões de UCs exibidos passam a ser analisados;
- todas as tarefas encontradas em cada UC entram na contagem;
- cada cartão mostra a quantidade de pendências de forma textual;
- UCs com pendências recebem borda e destaque vermelho reforçado;
- leitura, conferência e vigência recebem estados explícitos.

## 3.3.0

- nova fase transacional de conferência após o Moodle confirmar o salvamento;
- comparação por aluno entre nota e feedback esperados e os valores relidos no Moodle;
- estados Confirmado, Divergente, Não localizado e Não verificável;
- URL de conferência separada, com todos os participantes, para evitar que alunos recém-corrigidos desapareçam do filtro de pendências;
- painel de conferência no modal, filtro de divergências, atualização do painel do curso, registro resumido no Histórico e relatório CSV detalhado;
- situação do CSV tratada como classificação de relatório, sem simular alteração acadêmica inexistente;
- validação da identidade interna nos manipuladores de mensagens;
- estado transacional migrado para o esquema 3, sem reutilizar lotes incompatíveis de versões anteriores.

## 3.2.4

- confirmação de salvamento processada antes da validação da rota, incluindo o retorno `action=quickgradingresult` do Moodle;
- restauração automática e limitada da tela `action=grading` quando o formulário de opções remover esse parâmetro;
- espera coordenada do recarregamento após habilitar a avaliação rápida, evitando disputa entre navegações;
- teste de integração para redirecionamento, envio, confirmação e encerramento do lote.

## 3.2.3

- compatibilidade com o botão “Salvar” do rodapé fixo da avaliação rápida do Moodle 5;
- envio seguro pelo próprio formulário `action=quickgrade` quando o botão estiver fora do formulário ou for ocultado pelo tema;
- detecção ampliada das confirmações de salvamento e das mensagens de falha do Moodle;
- lote finalizado com erro agora exibe “Corrigir e tentar novamente” e não aparenta conclusão integral.

## 3.2.2

- seleção simultânea de até 30 arquivos CSV no importador de notas;
- compatibilidade com CSV combinado e com vários CSVs individuais;
- CSV individual não precisa conter `cmid` ou `atividade` quando a atividade for reconhecida ou confirmada no modal;
- reconhecimento seguro pelo CMID ou pelo nome completo da atividade presente no nome do arquivo;
- seleção manual da atividade para arquivos que não puderem ser associados com segurança;
- validação de duplicidades entre arquivos diferentes e limite total de 20 MB por lote;
- prévia por arquivo, atividade e quantidade de registros antes da confirmação.

## 3.2.1

- correção da contagem de pendências para não considerar participantes sem envio como trabalhos aguardando avaliação;
- botão “Importar notas” posicionado ao lado de “Baixar atividades” no resumo inicial do curso;
- prévia e cópia da mensagem automática no detalhe do aluno;
- recuperação mais robusta do rascunho em diferentes rotas do mensageiro do Moodle;
- preenchimento do campo de mensagem com eventos nativos e confirmação antes de apagar o rascunho;
- testes de regressão para contagem, importação e mensagens automáticas.

## 3.2.0

- processamento em lote transacional, persistente e retomável;
- bloqueio de notas inválidas, negativas, duplicadas e correspondências incompletas;
- associação exata por CMID ou atividade, sem salvamento por correspondência aproximada;
- sobrescrita desativada por padrão e confirmação em duas etapas;
- verificação explícita da confirmação de salvamento do Moodle;
- painel em Shadow DOM, navegação simplificada, tema escuro, foco e avisos acessíveis;
- varreduras automáticas opt-in, com cache, limites e menor concorrência;
- tratamento explícito de erros do armazenamento, retenção e minimização de dados;
- proteção contra fórmulas em CSV;
- permissões mínimas, CSP explícita, metadados consistentes e documentação de privacidade;
- suíte automatizada de testes e validação do pacote.
