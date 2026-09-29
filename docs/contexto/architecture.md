# Architecture — Assistente EaD SENAI

## Visão geral da stack

O projeto é uma extensão de navegador Chrome construída sobre Manifest V3, sem framework de front-end e sem processo de build: os arquivos JavaScript e CSS rodam diretamente como content scripts e como service worker, na sintaxe que o Chrome aceita nativamente. Não há transpilação, empacotador nem dependências de runtime — o `package.json` só declara scripts internos de validação (Node 18 ou superior) e não lista dependências de produção. Isso é uma escolha deliberada, não uma lacuna: qualquer proposta de introduzir bundler, framework de UI ou gerenciador de estado externo muda uma decisão de arquitetura já tomada e deve ser registrada como tal no `memory.md` antes de ser implementada.

## Como o aplicativo flui

A extensão tem três frentes que rodam em contextos separados do Chrome e se comunicam por mensagens e pelo armazenamento local (`chrome.storage`), nunca por rede externa:

O **service worker** (`background/service-worker.js`) é o coordenador transacional: ele processa lotes de lançamento de nota de forma retomável, porque o Chrome pode suspender o service worker a qualquer momento, e o lote precisa continuar de onde parou sem duplicar nem perder um lançamento.

Os **content scripts** injetados nas páginas do Moodle (`ead.senai.br` e `ead.fieg.com.br`) formam o grosso da lógica: leem a página autenticada do tutor, coletam dados de alunos, atividades e notas, aplicam as regras de negócio e desenham o painel isolado por Shadow DOM. Um segundo grupo de content scripts, mais restrito a páginas específicas (`mod/assign/view.php?action=grading`, páginas de curso e a página inicial `/my/`), cuida da importação contextual de notas, que aparece como um botão e um modal na tela de avaliação rápida do Moodle.

A **Central de Gestão** (`dashboard/`) é uma página HTML própria da extensão, acessível a partir do painel, que dá uma visão entre cursos: dez áreas, filtros globais, calendário, fila de trabalho, histórico e exportação de relatórios. Ela roda fora do contexto da página Moodle, mas lê os mesmos dados salvos localmente pelos content scripts.

O fluxo típico de uma correção é: o content script coleta o estado da UC e monta a fila de prioridades (`content/rules.js`) → o tutor abre a atividade e usa a importação contextual ou o pacote de correção assistida por IA → o lote de notas passa pelo service worker, que grava de forma transacional e confirmável → depois do salvamento, a extensão relê o Moodle para conferir o que foi gravado e só then marca a pendência como resolvida → o evento fica registrado na Auditoria Local, exportável em CSV, JSON, PDF ou pacote com hashes de integridade.

## Árvore de pastas

```
Assistente-EaD-SENAI/
├── manifest.json                 # declaração da extensão (MV3), permissões, domínios autorizados
├── background/
│   └── service-worker.js         # coordenador transacional e retomável dos lotes de lançamento
├── content/
│   ├── namespace.js               # espaço de nomes compartilhado entre os content scripts
│   ├── shared-validation.js       # parser, validações, associação exata (CMID/nome), proteção CSV
│   ├── utils.js
│   ├── statement-resources.js     # localização de enunciados e recursos "SAP" na UC
│   ├── language.js
│   ├── storage.js                 # camada sobre chrome.storage
│   ├── adapters.js                # adaptação às diferenças entre os dois Moodles (SENAI/FIEG)
│   ├── collectors.js              # coleta de dados das páginas do Moodle
│   ├── rules.js                   # regras de priorização e montagem da fila de tarefas
│   ├── journey.js                 # lógica da "Minha jornada" (seis etapas)
│   ├── exporters.js
│   ├── assisted-grading.js        # pacote de correção assistida por IA
│   ├── batch-grading.js           # lote de lançamento transacional
│   ├── communications.js          # mensagens ao aluno (abertura de conversa, registro de contato)
│   ├── ui.js / styles.css / page-layout.css   # painel isolado por Shadow DOM
│   ├── main.js                    # ponto de entrada do content script principal
│   └── importer/
│       ├── contextual-importer.js # importação contextual na avaliação rápida
│       ├── contextual-importer.css
│       └── README.md              # regras específicas do importador (formatos, limites)
├── dashboard/
│   ├── index.html / dashboard.css / dashboard.js   # Central de Gestão (página própria)
│   ├── directory-access.js        # autorização e gravação segura na pasta escolhida pelo tutor
│   └── audit-export.js            # relatórios, manifesto, ZIP e hashes SHA-256
├── assets/                        # ícones da extensão
├── scripts/
│   ├── validate-extension.js      # auditoria automática do pacote (npm run validate)
│   └── checksums.js               # geração/verificação de CHECKSUMS.sha256
├── tests/                         # testes unitários e de integração simulada (node --test)
├── docs/
│   ├── README.md                  # índice da documentação
│   ├── specs/                     # especificações e decisões de arquitetura anteriores
│   ├── plans/                     # planos de ação com critérios de aceite
│   ├── reports/                   # relatórios de entrega, auditoria e correção por versão
│   └── contexto/                  # ESTES seis arquivos de contexto para agentes de IA
├── README.md, CHANGELOG.md, CREDITOS.md, PRIVACIDADE.md, VALIDACAO.md, CHECKSUMS.sha256
└── package.json                   # scripts de validação local (test, validate, checksums, integrity)
```

Esta árvore é a que o repositório realmente tem em 28/09/2026, na versão 3.7.16. Se um agente propuser uma estrutura diferente (por exemplo, mover lógica de `content/` para um diretório `src/`, ou introduzir `components/`), isso é uma mudança de arquitetura que precisa de decisão explícita registrada em `memory.md`, não uma reorganização silenciosa.

## Como as partes se conversam

Os content scripts da página principal do Moodle são carregados nesta ordem, declarada no `manifest.json`: `namespace → shared-validation → utils → statement-resources → language → storage → adapters → collectors → rules → journey → exporters → assisted-grading → batch-grading → communications → ui → main`. Essa ordem importa porque scripts depois na lista dependem de globals definidos pelos scripts antes — não é uma lista alfabética, é uma cadeia de dependência implícita via `namespace.js`.

A comunicação entre o painel (content script), o service worker e a Central de Gestão acontece via `chrome.storage` (persistência local) e mensagens do Chrome runtime, nunca por chamada de rede a um servidor próprio — o projeto não tem backend. Toda leitura ou escrita no Moodle usa a sessão autenticada que já existe na aba aberta pelo tutor; a extensão nunca guarda nem transmite credenciais, cookies ou tokens.

A importação contextual (`content/importer/`) é tecnicamente independente da UI principal do painel: carrega só `shared-validation.js` e o seu próprio script, e é injetada apenas nas páginas de avaliação rápida, curso e página inicial — não em todas as páginas do Moodle. Isso existe para manter o custo de carregamento baixo nas páginas onde a importação não é usada.

## Domínios e permissões autorizados

A extensão só roda em `https://ead.senai.br/*` e `https://ead.fieg.com.br/*`, declarados tanto em `host_permissions` quanto nos `content_scripts` do manifesto. As únicas permissões do Chrome usadas são `storage` e `alarms`. Qualquer proposta de novo domínio, nova permissão ou novo host precisa ser tratada como decisão de escopo, não como detalhe de implementação — ver `rules.md`.
