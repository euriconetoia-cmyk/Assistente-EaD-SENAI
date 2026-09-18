# Assistente EaD SENAI 3.7.15

Extensão Chrome Manifest V3 para acompanhamento da tutoria nos ambientes Moodle autorizados do SENAI e da FIEG.

## Créditos

O desenvolvimento, a especificação, a integração e as colaborações técnicas estão registrados em [CREDITOS.md](CREDITOS.md). Este arquivo integra todas as versões e atualizações distribuídas do projeto.

## Recursos

- Painel isolado por Shadow DOM, responsivo, acessível e com temas claro, escuro e do sistema.
- Acompanhamento de alunos, atividades, notas, pendências, histórico e fechamento de UC.
- “Minha jornada” na Visão geral organiza análise, correção, acompanhamento, lançamento, conferência e auditoria, exibindo até três próximas ações e uma fila completa.
- Importação contextual com prévia, validação de notas e confirmação em duas etapas.
- Correção em lote transacional, retomável após suspensão do service worker e bloqueada quando houver correspondência incompleta.
- Conferência pós-salvamento que relê nota e feedback no Moodle e apresenta divergências por aluno.
- Associação de atividades somente por CMID ou nome normalizado exato. Sugestões aproximadas nunca são salvas automaticamente.
- Exportações CSV protegidas contra fórmulas de planilha.
- Retenção local configurável e opção para desativar o armazenamento do texto das mensagens.
- Central de Gestão em página própria, com dez áreas, filtros globais, calendário, fila de trabalho, histórico e relatórios CSV, JSON e PDF.
- Menu lateral compacto, expansível e responsivo na Central de Gestão.
- Ícones consistentes no painel e na Central; menu da Central com nomes visíveis em telas largas e preferência de expansão preservada.
- Situação da coleta visível com fonte local, horário, cobertura e pendências confirmadas, inclusive quando a leitura está parcial ou antiga.
- Preferências iniciais com botão lateral, histórico de mensagens, varreduras automáticas e português ativados; escolhas anteriores salvas pelo usuário continuam prevalecendo.
- Auditoria Local em linha do tempo, com filtros por período, resultado, tipo de ação e pesquisa.
- Escolha segura de uma pasta para salvar evidências, com autorização explícita do Chrome e fallback em ZIP.
- Pacote de auditoria com relatório HTML, CSV, JSON, manifesto e hashes SHA-256.
- Pacote para correção com IA, contendo o texto da tarefa, seus anexos e, quando localizado na mesma UC, o recurso Arquivo “SAP” correspondente, além de critérios, nota máxima, manifesto e ZIPs das entregas.
- O download de correções fica somente na área **Correções** do painel. Os materiais são organizados em pastas separadas para envios dos alunos, anexos da tarefa e arquivos SAP da UC. Um nome correspondente não confirma o conteúdo: abra e confira o enunciado antes de corrigir. A faixa da página do curso mostra pendências, importação contextual e atualização da contagem.
- A revisão do lote mostra as etapas Arquivos, Atividades, Conferência, Salvamento e Verificação; os erros apontam diretamente para a associação que precisa de ajuste.

Na correção por IA, o CSV pode trazer `desempenho_0_100` para cada aluno, deixando `nota` vazia. O importador calcula `desempenho_0_100 ÷ 100 × nota_maxima`, mostra a avaliação e a nota proporcional na conferência e permite editar a nota final antes do envio. A escala máxima deve ser confirmada na atividade ou no manifesto; conflitos e ausência de confirmação impedem a conversão. CSVs anteriores com `nota` preenchida continuam sendo importados sem nova conversão. Nunca preencha os dois campos na mesma linha. Desempenho zero ou atividade incorreta gera somente feedback; SENAI Play validado segue a regra da nota máxima confirmada.

Na página do curso, cada atividade consultada sem correções pendentes recebe um check verde. O resumo da turma fica verde somente quando todas as atividades foram verificadas sem erros. Se alguma leitura estiver inconclusiva, o aviso de conferência permanece em amarelo.

## Instalação para homologação

1. Abra `chrome://extensions`.
2. Ative o modo do desenvolvedor.
3. Clique em **Carregar sem compactação**.
4. Selecione esta pasta.
5. Confira se a versão exibida é `3.7.15`. Como este ajuste mantém o mesmo número de versão, substitua os arquivos da instalação anterior pelo novo pacote, clique em **Recarregar** em `chrome://extensions` e atualize as abas do Moodle.
6. Valide primeiro em curso de homologação, com uma atividade e um aluno de teste.

## Operações que alteram o Moodle

O painel começa em **Modo de consulta**. Importações e lotes mostram prévia, deixam sobrescrita desativada e exigem confirmação explícita. O processo automático registra a fase antes do envio e só considera sucesso quando o Moodle apresenta confirmação verificável. Resultado sem confirmação fica como erro para revisão manual.

Na jornada, a tarefa de conferir um lançamento não desaparece só porque o Moodle aceitou o salvamento. Se nota ou feedback não puderem ser relidos, a atividade permanece em destaque. O tutor pode abrir a atividade e registrar que conferiu manualmente os dois campos; essa declaração fica identificada como manual no histórico. Um contato com aluno registra a providência, mas não confirma entrega nem nota.

## Desempenho

Varreduras automáticas de curso e categoria ficam ativadas por padrão. Usam cache e concorrência reduzida e podem ser desativadas em Diagnóstico. A análise normal respeita limites configuráveis de atividades, participantes, intervalo e tempo máximo.

## Privacidade

Consulte [PRIVACIDADE.md](PRIVACIDADE.md). Os dados acadêmicos ficam no armazenamento local do navegador pelo período configurado. Senhas e tokens não são coletados. Em instalações novas o texto de mensagens é guardado localmente por padrão; essa opção pode ser desativada em Diagnóstico.

## Auditoria Local e pasta de evidências

Abra a Central de Gestão e selecione **Auditoria local** no menu. O histórico cotidiano registra somente metadados e contagens. Para salvar as evidências:

1. Clique em **Escolher pasta**.
2. Autorize a gravação no seletor do Chrome.
3. Ajuste os filtros da linha do tempo.
4. Marque a inclusão de dados acadêmicos individuais somente quando necessária.
5. Clique em **Exportar evidências**.

Se o acesso direto à pasta não estiver disponível ou for negado, use **Baixar ZIP**. A extensão nunca acessa outra pasta sem autorização do usuário.

## Validação local

```bash
npm test
npm run validate
```

## Domínios autorizados

- `https://ead.senai.br/*`
- `https://ead.fieg.com.br/*`

## Estrutura

- `background/service-worker.js`: coordenador transacional e retomável.
- `content/shared-validation.js`: parser, validações, associação exata e proteção CSV.
- `content/importer/`: importação contextual na avaliação rápida.
- `content/ui.js` e `content/styles.css`: painel isolado e sistema visual.
- `dashboard/`: Central de Gestão Moodle em página própria da extensão.
- `dashboard/directory-access.js`: autorização e gravação segura na pasta escolhida.
- `dashboard/audit-export.js`: relatórios, manifesto, ZIP e hashes de integridade.
- `tests/`: testes unitários, integração simulada e verificações estruturais.
- `scripts/validate-extension.js`: auditoria automática do pacote.
- `docs/`: especificações, planos e relatórios anteriores, organizados por finalidade; consulte o [índice](docs/README.md).

## Integridade e colaboração

Após alterar arquivos, execute `npm test`, `npm run validate` e `npm run integrity`. O arquivo `CHECKSUMS.sha256` identifica o conteúdo versionado; ao preparar uma atualização, execute `npm run checksums` e repita a verificação. As contribuições devem manter os créditos em [CREDITOS.md](CREDITOS.md) e descrever alterações em [CHANGELOG.md](CHANGELOG.md). O projeto permanece na versão 3.7.15 nesta reorganização.
