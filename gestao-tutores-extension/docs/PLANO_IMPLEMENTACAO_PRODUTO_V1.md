# Plano de Implementação e Melhoria do Produto v1.0

## 1. Objetivo

Transformar o módulo Gestão de Tutores de uma solução beta em um produto confiável para gestão da tutoria nos ambientes Moodle SENAI/FIEG.

O produto final deverá consolidar cursos, tutores, estudantes, modalidades e estrutura institucional, medir qualidade da coleta, apoiar análise de carga e permitir decisões rastreáveis sem inventar informações que o Moodle não forneça.

## 2. Princípios do produto

1. Nenhum KPI deve ser apresentado como definitivo quando a coleta estiver incompleta.
2. Todo indicador deve ser rastreável até cursos e registros Moodle que o originaram.
3. Curso Moodle, curso institucional, turma e Unidade Curricular devem ser tratados como entidades diferentes.
4. Alunos únicos e vínculos aluno x curso devem permanecer separados.
5. Papéis de tutor, gestão, monitoria, presencial e administração não devem ser tratados como equivalentes.
6. Dados não confirmados devem ser sinalizados como não identificados ou pendentes de validação.
7. A extensão deve utilizar somente dados que o usuário autenticado já consegue visualizar.
8. Devem ser armazenados apenas os dados necessários para a finalidade da ferramenta.
9. Moodle Goiás e Moodle CTM GO devem possuir adaptadores e snapshots independentes.
10. Toda alteração em parsers, regras e métricas deve possuir testes automatizados.

## 3. Estado atual

A linha de desenvolvimento v0.3 está na branch `agent/gestao-tutores-v3`.

Ela já possui:

- coleta de cursos e participantes;
- paginação de participantes;
- identificação de papéis configuráveis;
- deduplicação por ID Moodle;
- snapshots separados por ambiente;
- dashboard executiva;
- visão por tutor;
- visão de cursos Moodle;
- indicadores de qualidade;
- mediana, quartis e classificação estatística de carga;
- configurações centralizadas;
- testes básicos do núcleo.

Ainda existem dois bloqueadores P0 já registrados:

- Issue #2: restaurar a estrutura completa e reproduzível da branch `main`;
- Issue #4: definir o mapeamento entre Curso Moodle, Turma e Unidade Curricular.

## 4. Roadmap de versões

| Versão | Foco | Saída esperada |
|---|---|---|
| v0.3 | Fundamentos | Coleta e dashboard gerencial inicial |
| v0.5 Beta | Confiabilidade | Coleta completa, adaptadores e testes com HTML real |
| v0.6 | Modelo institucional | Curso, turma, UC e modalidade normalizados |
| v0.7 | Inteligência gerencial | Carga, complexidade, recomendações e comparações |
| v0.8 Beta ampla | Operação | Histórico, relatórios, desempenho e testes com usuários |
| v0.9 RC | Estabilização | Correções, documentação e critérios de produção |
| v1.0 | Produto final | Versão reproduzível, instalável e validada |

## 5. Arquitetura alvo

```text
Moodle autenticado
       |
       v
Adaptador do ambiente
       |
       v
Descoberta de cursos
       |
       v
Coleta de participantes e metadados
       |
       v
Validação de completude
       |
       v
Normalização institucional
       |
       v
Armazenamento local versionado
       |
       +-----------------------+
       |                       |
       v                       v
Motor de métricas       Motor de qualidade
       |                       |
       +-----------+-----------+
                   |
                   v
          Dashboard gerencial
                   |
       +-----------+-----------+
       |           |           |
       v           v           v
    Tutores      Cursos     Relatórios
```

Estrutura recomendada:

```text
gestao-tutores-extension/
  manifest.json
  adapters/
    moodle-goias.js
    moodle-ctm.js
  collectors/
    discovery.js
    participants.js
    metadata.js
  domain/
    roles.js
    modality.js
    institutional-map.js
  shared/
    core.js
    defaults.js
    quality.js
  storage/
    snapshots.js
    history.js
    migrations.js
  metrics/
    workload.js
    complexity.js
    quality.js
  dashboard/
  options/
  exporters/
  tests/
    fixtures/
    unit/
    integration/
  docs/
```

## 6. Fase P0. Confiabilidade e modelo de dados

### 6.1 Restaurar a branch principal

Referência: Issue #2.

Objetivo: garantir que a `main` seja uma fonte reproduzível da extensão principal.

Critérios de aceite:

- todos os arquivos referenciados pelo manifesto existem;
- instalação a partir da `main` funciona;
- scripts do `package.json` executam;
- README corresponde à árvore real;
- versão do manifesto e pacote são coerentes.

### 6.2 Definir Curso Moodle, Curso Institucional, Turma e UC

Referência: Issue #4.

Objetivo: impedir que um `courseid` seja tratado automaticamente como turma ou UC.

Modelo desejado:

```text
courseMoodleId
courseMoodleName
shortname
categoria
cursoInstitucional
turma
unidadeCurricular
modalidade
tipoEntidade
confidence
```

Critérios de aceite:

- amostra validada de diferentes modalidades;
- regras documentadas;
- regra automatizada para casos confirmáveis;
- fallback `Curso Moodle` quando não houver evidência suficiente;
- testes para todas as regras de normalização.

### 6.3 Criar adaptadores específicos por Moodle

Objetivo: separar diferenças de HTML e navegação entre Goiás e CTM GO.

Critérios de aceite:

- `moodle-goias.js` e `moodle-ctm.js` independentes;
- descoberta, participantes e metadados expõem contratos comuns;
- alteração em um ambiente não exige alterar o outro;
- cada adaptador possui fixtures próprias.

### 6.4 Criar fixtures anonimizadas e testes de parser

Cenários mínimos:

- curso com 20 alunos;
- curso com 600 alunos;
- participantes paginados;
- curso sem tutor;
- curso com dois tutores;
- Tutor Online;
- Tutor e Coordenação;
- Professor Presencial sem tutoria;
- curso sem modalidade;
- curso sem alunos;
- estudantes repetidos em vários cursos;
- tabela em português e inglês;
- cabeçalhos Papel, Papéis, Role e Roles.

Critérios de aceite:

- parsers executados sobre HTML anonimizado;
- regressões detectadas automaticamente;
- nenhuma alteração no coletor é aceita sem testes correspondentes.

### 6.5 Criar indicador formal de completude

Cada curso deverá possuir:

- `completo`;
- `parcial`;
- `erro`;
- `nao_analisado`.

A coleta global deverá apresentar:

- cursos descobertos;
- cursos processados;
- cursos completos;
- cursos parciais;
- erros;
- cobertura percentual;
- confiabilidade percentual.

Regra: relatórios gerenciais definitivos devem ser bloqueados ou claramente marcados quando houver cobertura incompleta.

## 7. Fase P1. Regras institucionais e configuração

### 7.1 Cadastro de papéis

Criar configuração com grupos distintos:

- Tutoria;
- Gestão;
- Monitoria;
- Professor presencial;
- Administração;
- Estudante.

Cada papel deve possuir atributo `entraNaCargaDeTutoria`.

Critérios de aceite:

- papéis configuráveis sem alterar código;
- papéis mistos sinalizados;
- histórico da regra usada em cada snapshot;
- relatório mostra papéis que originaram o vínculo.

### 7.2 Regras de modalidade

Fontes possíveis:

1. campo próprio do Moodle;
2. categoria;
3. subcategoria;
4. shortname;
5. código institucional;
6. nome do curso;
7. regra manual configurada.

Critérios de aceite:

- regra apresenta origem da classificação;
- confiança da modalidade registrada;
- mapeamento manual persistente;
- nenhum curso é classificado por inferência sem evidência rastreável.

### 7.3 Configuração de exclusões

Permitir excluir da análise gerencial:

- cursos de apoio;
- templates;
- ambientes de teste;
- cursos finalizados, quando aplicável;
- categorias administrativas.

As exclusões devem permanecer visíveis na auditoria.

## 8. Fase P1. Métricas de carga e inteligência gerencial

### 8.1 Separar três dimensões de carga

#### Carga quantitativa

- alunos únicos;
- vínculos aluno x curso;
- cursos Moodle;
- turmas;
- UCs.

#### Complexidade

- cursos institucionais diferentes;
- UCs diferentes;
- modalidades diferentes;
- quantidade de papéis de tutoria;
- dispersão entre turmas.

#### Carga operacional futura

- correções pendentes;
- atividades aguardando avaliação;
- alunos em risco;
- UCs próximas do fechamento;
- acompanhamentos pendentes.

### 8.2 Criar Índice de Carga do Tutor

O ICT deverá ser configurável e explicável.

Requisitos:

- escala 0 a 100;
- pesos configuráveis;
- composição visível;
- comparação por percentis;
- nenhuma classificação usada como norma institucional sem validação formal.

### 8.3 Comparação entre tutores

Permitir selecionar dois ou mais tutores e comparar:

- alunos únicos;
- vínculos;
- cursos;
- turmas;
- UCs;
- modalidades;
- complexidade;
- ICT;
- tendência histórica.

## 9. Fase P1. Dashboard final

### 9.1 Visão Executiva

KPIs obrigatórios:

- tutores ativos;
- cursos Moodle;
- turmas identificadas;
- UCs identificadas;
- alunos únicos;
- vínculos;
- cobertura;
- confiabilidade;
- cursos sem tutor;
- múltiplos tutores;
- modalidade não identificada;
- tutores em carga crítica.

### 9.2 Ações Prioritárias

O painel deve transformar problemas em ações:

- completar coleta;
- revisar cursos sem tutor;
- validar papéis mistos;
- corrigir modalidade;
- investigar outliers;
- corrigir paginação;
- revisar cursos sem estrutura institucional identificada.

### 9.3 Visão por Tutor

Deve mostrar:

- papéis;
- cursos Moodle;
- curso institucional;
- turmas;
- UCs;
- alunos únicos;
- vínculos;
- modalidades;
- carga quantitativa;
- complexidade;
- ICT;
- histórico;
- origem dos dados.

### 9.4 Visão de Cursos

Deve incluir todos os cursos, mesmo sem tutor.

Campos mínimos:

- ID Moodle;
- nome;
- shortname;
- categoria;
- tipo de entidade;
- curso institucional;
- turma;
- UC;
- modalidade;
- tutor;
- alunos;
- confiança;
- completude;
- link Moodle.

### 9.5 Qualidade dos Dados

Indicadores agregados primeiro, detalhes depois.

Evitar listas gigantes de avisos sem agrupamento.

## 10. Fase P1. Histórico e armazenamento

### 10.1 Histórico de snapshots

Manter snapshots por:

- ambiente;
- data;
- versão do schema;
- versão da regra;
- versão da extensão.

### 10.2 Tendências

Exibir por tutor:

- crescimento ou redução de alunos;
- novos cursos;
- cursos encerrados;
- mudança de modalidade;
- mudança de ICT.

### 10.3 Retenção

Configuração recomendada:

- último snapshot sempre disponível;
- histórico por período configurável;
- botão para limpar histórico;
- migração de schema controlada.

## 11. Fase P1. Exportações e relatórios

Criar saídas separadas:

1. Relatório Executivo.
2. Relatório de Tutores.
3. Relatório de Cursos e Turmas.
4. Matriz Tutor x Curso.
5. Relatório de Qualidade.
6. Histórico de Carga.

Formatos:

- CSV;
- Excel;
- PDF executivo posteriormente.

Todos os relatórios devem incluir:

- ambiente;
- data da coleta;
- cobertura;
- confiança;
- versão do produto;
- aviso quando os dados forem parciais.

## 12. Fase P1. Privacidade, segurança e LGPD

Requisitos:

- não armazenar senha ou token;
- não enviar dados para serviços externos;
- armazenar aluno somente por ID técnico quando nome/e-mail não forem necessários;
- minimizar permissões da extensão;
- manter snapshots por host;
- permitir exclusão local dos dados;
- registrar quais dados são armazenados e por quê;
- proteger exportações contra fórmulas de planilha;
- definir política de retenção.

## 13. Fase P2. Desempenho e robustez

### 13.1 Fila de coleta

Implementar:

- concorrência configurável;
- retry com limite;
- timeout;
- cancelamento;
- progresso;
- retomada de coleta interrompida.

### 13.2 Coleta incremental

Não reler tudo quando não for necessário.

Usar:

- cache por curso;
- data da última leitura;
- invalidação controlada;
- atualização manual completa.

### 13.3 Observabilidade local

Registrar:

- tempo total;
- tempo por curso;
- erros por endpoint;
- quantidade de retries;
- páginas analisadas;
- versão do adaptador.

## 14. Fase P2. Integração ao Assistente EaD SENAI

Pré-condições:

- Issue #2 resolvida;
- testes da Gestão de Tutores aprovados;
- validação nos dois Moodles;
- modelo institucional estabilizado.

Menu alvo:

```text
Hoje
Cursos
Tutores
Alunos
Atividades
Notas
Fechamento
Gestão de Tutores
Diagnóstico
```

A integração deve reutilizar infraestrutura da extensão principal sem duplicar coletores e armazenamento.

## 15. Fase P2. Produto, documentação e release

Documentos obrigatórios:

- Manual do Usuário;
- Guia de Instalação;
- Guia de Validação;
- Arquitetura Técnica;
- Modelo de Dados;
- Política de Privacidade Local;
- Changelog.

Pacote final:

`Assistente-EaD-SENAI-v4.0.0.zip` ou versão institucional definida no momento da integração.

## 16. Critérios de aceite para v1.0

A versão final somente deverá ser considerada pronta quando:

1. cobertura de cursos for próxima de 100% no escopo definido;
2. nenhuma paginação permanecer silenciosamente incompleta;
3. papéis forem reconhecidos e auditáveis;
4. alunos únicos forem conferidos por amostragem;
5. Curso, Turma e UC estiverem normalizados quando houver evidência;
6. modalidade tiver regra rastreável e alto índice de identificação;
7. coleta parcial estiver claramente bloqueada ou sinalizada;
8. testes unitários e de integração estiverem aprovados;
9. testes reais forem concluídos no Moodle Goiás e CTM GO;
10. dashboard responder às perguntas de gestão sem interpretação manual adicional;
11. exportações reproduzirem os mesmos números da dashboard;
12. armazenamento respeitar minimização de dados;
13. instalação a partir do repositório for reproduzível;
14. documentação estiver atualizada;
15. cada KPI puder ser rastreado até a fonte Moodle correspondente.

## 17. Sequência recomendada de implementação

### Sprint 1

- resolver integridade da `main`;
- criar fixtures e testes de parser;
- separar adaptadores Goiás e CTM;
- formalizar completude da coleta.

### Sprint 2

- levantar e implementar Curso, Turma e UC;
- ampliar regras de modalidade;
- consolidar cadastro de papéis;
- criar exclusões configuráveis.

### Sprint 3

- refatorar métricas de carga;
- criar complexidade;
- criar primeira versão do ICT;
- implementar comparação entre tutores.

### Sprint 4

- concluir dashboard executiva;
- concluir visão por tutor;
- concluir visão de cursos;
- melhorar qualidade e ações prioritárias.

### Sprint 5

- histórico de snapshots;
- tendências;
- relatórios e exportações;
- controles de retenção e privacidade.

### Sprint 6

- desempenho;
- coleta incremental;
- retry, cancelamento e retomada;
- observabilidade local.

### Sprint 7

- beta ampla com usuários;
- correções de compatibilidade;
- testes nos dois Moodles;
- documentação.

### Sprint 8

- release candidate;
- auditoria final de KPIs;
- integração com Assistente EaD;
- pacote de produção.

## 18. Ordem de prioridade

### P0. Bloqueadores

- integridade da `main`;
- modelo Curso/Turma/UC;
- adaptadores por Moodle;
- fixtures e testes de parser;
- completude e paginação.

### P1. Produto gerencial

- papéis institucionais;
- modalidade;
- métricas de carga;
- ICT;
- dashboard final;
- histórico;
- relatórios;
- privacidade.

### P2. Escala e produção

- desempenho;
- coleta incremental;
- observabilidade;
- integração com extensão principal;
- documentação e release.

## 19. Regra de desenvolvimento

Cada issue deverá informar:

- problema;
- objetivo;
- escopo;
- fora de escopo;
- critérios de aceite;
- testes necessários;
- impacto nos dados;
- dependências.

Nenhuma funcionalidade de gestão deve ser considerada concluída apenas porque aparece visualmente na dashboard. A conclusão exige confiabilidade, rastreabilidade e teste.