# Validação da versão 3.7.15, homologação

Data: 17/09/2026

- A conversão proporcional foi testada com escalas de 30 e 50 pontos, notas brasileiras com duas casas, CSV anterior, zero, atividade incorreta, SENAI Play e limite de 100.
- O estado verde exige todas as leituras concluídas, sem pendências, erros ou atividade não verificada. Avisos inconclusivos não recebem check de conclusão.
- 94 testes automatizados passaram; o validador conferiu 25 referências e 67 arquivos, sem falhas estruturais.

## Validação anterior do recurso SAP na mesma versão

Data: 17/09/2026

- O recurso `SAP 01` (CMID 336353) do tipo Arquivo foi vinculado somente à tarefa `Envio da SAP 01` (CMID 335663) quando pertence à mesma seção da UC.
- Testes cobrem PDF direto, arquivo DOCX referenciado em página HTML, rejeição de redirecionamento externo e montagem do ZIP com o recurso SAP e os envios.
- 88 testes automatizados passaram; o validador conferiu 25 referências e 66 arquivos, sem falhas estruturais.
- O enunciado textual e os anexos da tarefa continuam no pacote, quando encontrados. Arquivos associados por nome exigem conferência do tutor.
- Teste autenticado nos dois ambientes Moodle continua pendente. A página real do recurso SAP específico pode apresentar um formato distinto dos casos simulados.

## Validação anterior da jornada na mesma versão

Data: 16/09/2026

- 84 testes automatizados aprovados, 0 falhas.
- 24 referências do manifesto e 63 arquivos de código e documentação conferidos pelo validador.
- Sintaxe JavaScript, chaves CSS e `git diff --check` sem falhas.
- Nova ordenação testada para lançamento não verificado, fechamento com pendências, prazo conhecido, sucesso posterior e confirmação manual.
- Preservadas as barreiras de prévia, associação de atividade, nota máxima e releitura de nota e feedback do importador.
- Não foi possível executar login e conferir alunos, notas e feedbacks em turmas reais. Validar a jornada e o lote em curso de homologação nos dois ambientes antes de usar com turmas em produção.

## Histórico da validação da versão 3.7.14

Data: 16/09/2026

## Resultado automatizado

- 79 testes automatizados aprovados.
- 0 testes reprovados.
- 60 arquivos verificados pela auditoria estrutural.
- 23 referências do manifesto confirmadas.
- 0 falhas de sintaxe JavaScript.
- 0 desequilíbrios de estrutura CSS.
- 0 violações críticas, altas ou médias identificadas na varredura local.

## Novas verificações da versão 3.7.14

- Ajuste da mesma versão remove o botão de download e a segunda implementação de ZIP do resumo do curso.
- O botão do painel continua disponível e os testes de enunciados e anexos foram preservados.
- Os cinco controles marcados na tela possuem os mesmos valores iniciais exibidos e aplicados pelas rotinas automáticas.
- A abertura automática do painel permanece desativada.
- Preferências anteriormente salvas como desativadas são preservadas.
- O texto de comunicação é salvo com o novo padrão e deixa de ser salvo quando a opção é desativada.

## Verificações preservadas da versão 3.7.13

- Arquivo anexado pelo professor entra no pacote da atividade.
- Envio de aluno com nome igual ao do anexo não entra na coleta do enunciado.
- A tela de avaliação serve de fonte secundária para o texto do enunciado.
- Quando o enunciado não está acessível, os envios continuam disponíveis com aviso explícito, sem supor conteúdo inexistente.
- O limite de anexos é 25 MB por atividade; endereços fora do ambiente Moodle são recusados.
- A validação não incluiu login em Moodle real; a identificação de materiais específicos exige homologação.

## Verificações preservadas da versão 3.7.11

- Interface Moodle em português usa vírgula como separador quando os campos vazios não oferecem uma amostra confiável.
- Cada nota autorizada é procurada novamente no aluno correspondente antes do envio.
- O campo de nota precisa estar habilitado, nomeado e contido no formulário submetido.
- O valor precisa constar no `FormData` e ser numericamente equivalente ao valor autorizado.
- O envio é bloqueado antes de alcançar o Moodle quando qualquer uma dessas verificações falha.
- A conferência individual ignora campos de nota ocultos ou desabilitados.
- Feedback confirmado com nota divergente recebe mensagem específica e não é classificado como sucesso.

- Campo de nota editável diretamente na conferência.
- Validação do limite máximo antes de aplicar a edição.
- Erro apresentado junto ao campo, sem perder o restante da conferência.
- Confirmação de envio desmarcada após alteração.
- Navegação por teclado, rótulo acessível e foco visível.

- Notas exibidas no padrão `0,00` a `100,00` quando a escala da atividade for 100.
- Ponto e vírgula aceitos como separador decimal na entrada.
- Comparação numérica independente da formatação visual.
- Conversão para o formato reconhecido pela página do Moodle no envio.

- Conferência pela tabela de avaliação rápida preservada.
- Conferência pela ficha individual quando a tabela não reaparece.
- Releitura de nota e feedback antes da classificação final.

1. Menu lateral compacto, expansão e estado ativo.
2. Preferência do menu armazenada localmente.
3. Créditos visíveis na Central de Gestão.
4. Auditoria Local com filtros e linha do tempo.
5. Eventos minimizados sem persistência padrão de nomes, notas ou feedbacks.
6. Migração dos históricos anteriores.
7. Escolha de pasta por `showDirectoryPicker()`.
8. Referência da pasta armazenada no IndexedDB.
9. Verificação de autorização por `queryPermission()` e `requestPermission()`.
10. Neutralização de nomes de pastas e arquivos.
11. Fallback por download em ZIP.
12. Relatório HTML, histórico CSV e auditoria JSON.
13. Manifesto dos arquivos e hashes SHA-256.
14. Confirmação específica para incluir dados acadêmicos individuais.
15. Contraste WCAG AA das combinações principais.
16. Tema claro e escuro no dashboard, painel e importador.
17. Registro de eventos de análise, importação, conferência e exportação.
18. Preservação das permissões mínimas e da CSP.
19. Reconhecimento ampliado da nota máxima nos formatos reais do Moodle.
20. Compatibilidade segura com CSV legado quando a página confirma a escala.
21. Exibição da nota máxima, origem e estado na conferência anterior ao salvamento.
22. Ausência de escala tratada como aviso, com restauração do envio operacional.
23. Descoberta paginada sem alteração prévia de notas.
24. Salvamento e conferência transacionais por página.
25. Recuperação do identificador do aluno por múltiplas fontes do Moodle.

## Cobertura de regressão preservada

1. Parser de CSV com delimitadores, aspas e quebras de linha.
2. Rejeição de notas negativas, não numéricas e registros duplicados.
3. Associação exata por CMID ou nome completo da atividade.
4. Neutralização de fórmulas de planilha.
5. Restrição de URLs e hosts de automação.
6. Ciclo transacional de preparação, envio, confirmação e fechamento.
7. Conferência anterior e posterior ao salvamento.
8. Edição individual de nota e feedback.
9. Invalidação da confirmação após edição.
10. Distinção entre divergência e campo não verificável.
11. Validação da identidade interna em mensagens da extensão.
12. Identificação da UC atual e vigências em sobreposição.
13. Inventário acima de 96 cursos com paginação.
14. Atualização de pendências sem cache antigo.
15. Pacote independente por atividade para correção com IA.
16. Enunciado, critérios e dados da atividade no pacote para IA.
17. Mensagem acadêmica editável e encaminhada pelo AVA.
18. Ausência de integração com WhatsApp.
19. Exportações CSV, JSON e impressão para PDF.
20. Presença de `CREDITOS.md` e crédito “By Eurico Cirilo”.

## Auditoria de segurança

- Manifest V3 preservado.
- Permissões limitadas a `storage` e `alarms`.
- Hosts limitados a `ead.senai.br` e `ead.fieg.com.br`.
- CSP: `script-src 'self'; object-src 'self'`.
- Nenhum `eval`, `new Function` ou carregamento de script remoto.
- Nenhuma URL HTTP de produção.
- Nenhuma chave, senha ou token incorporado ao código.
- Remetentes validados em todos os manipuladores de mensagens.
- Conteúdo acadêmico escapado antes da geração de HTML.
- Fórmulas de planilha neutralizadas nas exportações CSV.
- Acesso à pasta dependente de escolha e autorização do usuário.

## Auditoria visual

O relatório [AUDITORIA_VISUAL_V3.7.0.md](docs/reports/AUDITORIA_VISUAL_V3.7.0.md) registra tokens, contrastes, responsividade, foco, tema escuro e estados acessíveis.

## Comandos executados

```bash
node --test tests/*.test.js
node scripts/validate-extension.js
```

## Limite da validação local

O comportamento que gravaria notas foi validado por integração simulada, sem alterar dados acadêmicos reais. O seletor nativo de pasta, o NVDA, o zoom de 200% e a renderização dentro dos temas reais do Moodle ainda devem ser verificados no Chrome do Windows e em curso de homologação.

A versão somente deverá ser usada em produção após essa homologação operacional.
