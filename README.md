# Assistente EaD SENAI 3.6.3

Extensão Chrome Manifest V3 para acompanhamento da tutoria nos ambientes Moodle autorizados do SENAI e da FIEG.

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
- Pacote único para correção com IA, contendo enunciado, critérios disponíveis, nota máxima, manifesto e os ZIPs originais das entregas.

## Instalação para homologação

1. Abra `chrome://extensions`.
2. Ative o modo do desenvolvedor.
3. Clique em **Carregar sem compactação**.
4. Selecione esta pasta.
5. Confira se a versão exibida é `3.6.3`.
6. Valide primeiro em curso de homologação, com uma atividade e um aluno de teste.

## Operações que alteram o Moodle

O painel começa em **Modo de consulta**. Importações e lotes mostram prévia, deixam sobrescrita desativada e exigem confirmação explícita. O processo automático registra a fase antes do envio e só considera sucesso quando o Moodle apresenta confirmação verificável. Resultado sem confirmação fica como erro para revisão manual.

## Desempenho

Varreduras automáticas de curso e categoria ficam desativadas por padrão. Quando habilitadas em Diagnóstico, usam limites, cache e concorrência reduzida. A análise normal também respeita limites configuráveis de atividades, participantes, intervalo e tempo máximo.

## Privacidade

Consulte [PRIVACIDADE.md](PRIVACIDADE.md). Os dados acadêmicos ficam no armazenamento local do navegador pelo período configurado. Senhas e tokens não são coletados. O texto de mensagens não é guardado por padrão.

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
- `tests/`: testes unitários, integração simulada e verificações estruturais.
- `scripts/validate-extension.js`: auditoria automática do pacote.
