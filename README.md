# Assistente EaD SENAI 3.7.1

Extensão Chrome Manifest V3 para acompanhamento da tutoria nos ambientes Moodle autorizados do SENAI e da FIEG.

## Créditos

O desenvolvimento, a especificação, a integração e as colaborações técnicas estão registrados em [CREDITOS.md](CREDITOS.md). Este arquivo integra todas as versões e atualizações distribuídas do projeto.

## Recursos

- Painel isolado por Shadow DOM, responsivo, acessível e com temas claro, escuro e do sistema.
- Acompanhamento de alunos, atividades, notas, pendências, histórico e fechamento de UC.
- Importação contextual com prévia, validação de notas e confirmação em duas etapas.
- Correção em lote transacional, retomável após suspensão do service worker e bloqueada quando houver correspondência incompleta.
- Conferência pós-salvamento que relê nota e feedback no Moodle e apresenta divergências por aluno.
- Associação de atividades somente por CMID ou nome normalizado exato. Sugestões aproximadas nunca são salvas automaticamente.
- Exportações CSV protegidas contra fórmulas de planilha.
- Retenção local configurável e conteúdo de mensagens não armazenado por padrão.
- Central de Gestão em página própria, com dez áreas, filtros globais, calendário, fila de trabalho, histórico e relatórios CSV, JSON e PDF.
- Menu lateral compacto, expansível e responsivo na Central de Gestão.
- Auditoria Local em linha do tempo, com filtros por período, resultado, tipo de ação e pesquisa.
- Escolha segura de uma pasta para salvar evidências, com autorização explícita do Chrome e fallback em ZIP.
- Pacote de auditoria com relatório HTML, CSV, JSON, manifesto e hashes SHA-256.
- Pacote único para correção com IA, contendo enunciado, critérios disponíveis, nota máxima, manifesto e os ZIPs originais das entregas.

## Instalação para homologação

1. Abra `chrome://extensions`.
2. Ative o modo do desenvolvedor.
3. Clique em **Carregar sem compactação**.
4. Selecione esta pasta.
5. Confira se a versão exibida é `3.7.1`.
6. Valide primeiro em curso de homologação, com uma atividade e um aluno de teste.

## Operações que alteram o Moodle

O painel começa em **Modo de consulta**. Importações e lotes mostram prévia, deixam sobrescrita desativada e exigem confirmação explícita. O processo automático registra a fase antes do envio e só considera sucesso quando o Moodle apresenta confirmação verificável. Resultado sem confirmação fica como erro para revisão manual.

## Desempenho

Varreduras automáticas de curso e categoria ficam desativadas por padrão. Quando habilitadas em Diagnóstico, usam limites, cache e concorrência reduzida. A análise normal também respeita limites configuráveis de atividades, participantes, intervalo e tempo máximo.

## Privacidade

Consulte [PRIVACIDADE.md](PRIVACIDADE.md). Os dados acadêmicos ficam no armazenamento local do navegador pelo período configurado. Senhas e tokens não são coletados. O texto de mensagens não é guardado por padrão.

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
