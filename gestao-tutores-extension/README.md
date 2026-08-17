# Gestão de Tutores Moodle SENAI v0.3

Módulo independente de validação gerencial para consolidar cursos Moodle, tutores, papéis, estudantes e indicadores de carga nos ambientes SENAI/FIEG.

## Objetivo

A versão 0.3 prioriza confiabilidade dos dados antes de ampliar funcionalidades. O módulo não assume que cada curso Moodle corresponde automaticamente a uma turma institucional ou a uma UC. Por isso, a interface utiliza o termo `Curso Moodle` até que exista uma regra institucional confiável de mapeamento.

Também diferencia:

- `Alunos únicos`: pessoas deduplicadas por ID Moodle.
- `Vínculos aluno x curso`: soma dos estudantes encontrados em cada curso Moodle. Esse número não deve ser interpretado como quantidade de pessoas.

## Ambientes suportados

- `https://ead.fieg.com.br`, identificado como Moodle Goiás.
- `https://ead.senai.br`, identificado como Moodle CTM GO.

## Principais melhorias da v0.3

### Coleta

- Limite padrão aumentado de 80 para 500 cursos.
- Descoberta pela página atual, Meus cursos, índice de cursos e navegação por categorias.
- Processamento concorrente configurável, com padrão de quatro cursos simultâneos.
- Paginação real da página de participantes.
- Reconhecimento ampliado de cabeçalhos como Papel, Papéis, Role, Roles, Função e Funções.
- Identificação separada de papéis de tutor, estudante, equipe e gestão.
- Registro de tutor com papel misto de gestão para validação gerencial.
- Estudantes armazenados somente por ID técnico no snapshot.
- Snapshots separados por host Moodle.
- Regras de modalidade configuráveis.

### Dashboard

A interface foi separada em quatro visões.

#### Visão Executiva

Apresenta KPIs da base completa:

- Tutores identificados.
- Cursos processados sobre cursos descobertos.
- Alunos únicos.
- Vínculos aluno x curso.
- Cobertura da coleta.
- Percentual de cursos com tutor.
- Percentual de cursos com modalidade identificada.
- Percentual de cursos com leitura de alta confiança.

Também mostra situação da base, ações prioritárias, mediana de carga, média, maior e menor carga e quantidade de outliers críticos.

#### Tutores

Apresenta lista por tutor com:

- Papéis encontrados.
- Cursos Moodle vinculados.
- Vínculos aluno x curso.
- Alunos únicos.
- Modalidades.
- Média por curso.
- Classificação comparativa de carga.
- Indicação de papel misto de gestão.

#### Cursos Moodle

Apresenta todos os cursos processados, inclusive aqueles sem tutor, com:

- Nome e shortname quando disponível.
- Tutor ou tutores.
- Vínculos de estudantes.
- Modalidade.
- Categoria.
- Confiança da leitura.
- Páginas de participantes lidas.
- Quantidade de alertas.
- Link direto ao Moodle.

#### Qualidade dos Dados

Agrupa os problemas em indicadores e tabela de auditoria:

- Cursos sem tutor.
- Cursos com múltiplos tutores.
- Modalidade não identificada.
- Confiança abaixo de alta.
- Paginação incompleta.
- Cursos sem estudantes identificados.
- Erros de leitura.

## Classificação de carga

A classificação não é norma institucional. Ela é um indicador analítico interno.

A v0.3 deixa de depender apenas da média e passa a utilizar quartis, mediana e intervalo interquartil quando existem dados suficientes.

As classificações são:

- Baixa.
- Regular.
- Alta.
- Crítica.

Carga crítica indica um valor acima do limite superior da distribuição, funcionando como sinal de concentração que precisa ser analisado. Não significa automaticamente sobrecarga institucional.

## Segurança e privacidade

- Não captura senha ou token.
- Usa somente a sessão Moodle já autenticada.
- Não altera cursos, participantes, notas ou configurações.
- Não envia dados para serviços externos.
- Limita acesso aos dois hosts Moodle configurados.
- Armazena estudantes somente por identificador técnico para deduplicação.
- Mantém nome, e-mail e papéis somente dos tutores reconhecidos.
- Protege exportações CSV contra conteúdo iniciado como fórmula de planilha.

## Configuração

Em `Opções da extensão` é possível ajustar:

- Máximo de cursos por coleta.
- Máximo de categorias percorridas.
- Máximo de páginas de participantes por curso.
- Quantidade de cursos processados simultaneamente.
- Papéis de tutor.
- Papéis de estudante.
- Papéis de gestão.
- Papéis de equipe.
- Regras de modalidade.

Formato das regras de modalidade:

```text
Técnico=curso técnico|técnico em|tec.
Qualificação=qualificação profissional|qualificação|qua.
Pós-graduação=mba|pós-graduação|especialização
```

## Instalação para validação

1. Baixe ou clone a branch de desenvolvimento.
2. Abra `chrome://extensions` ou `edge://extensions`.
3. Ative o Modo do desenvolvedor.
4. Clique em `Carregar sem compactação`.
5. Selecione somente a pasta `gestao-tutores-extension`.
6. Mantenha o Moodle autenticado aberto.
7. Atualize a página do Moodle.
8. Abra a Gestão de Tutores e execute `Atualizar todos os cursos`.

## Critérios para confiar na análise

Antes de usar os dados para redistribuição de carga, verifique pelo menos:

- Cobertura da coleta em 100 por cento.
- Ausência de paginação incompleta.
- Papéis de tutor validados.
- Percentual aceitável de cursos com modalidade identificada.
- Cursos com papel misto de gestão revisados.
- Cursos com múltiplos tutores conferidos.

A dashboard apresenta uma Situação da Base justamente para impedir que uma coleta parcial seja interpretada como relatório definitivo.

## Testes

Dentro da pasta do módulo:

```bash
npm run check:syntax
npm test
```

Os testes atuais cobrem normalização, papéis, modalidade, mediana, classificação de outlier e segurança de CSV.

## Estrutura

```text
gestao-tutores-extension/
  manifest.json
  package.json
  shared/
    core.js
    defaults.js
  background/
    service-worker.js
  content/
    collector.js
    launcher.js
  dashboard/
    index.html
    styles.css
    app.js
  options/
    index.html
    options.js
  tests/
    core.test.js
```

## Limites ainda conhecidos

- O mapeamento entre Curso Moodle, turma institucional e UC ainda precisa de regra institucional baseada no ambiente real.
- A descoberta completa depende das páginas e categorias que o perfil autenticado consegue visualizar.
- A modalidade continua sendo uma inferência configurável quando o Moodle não fornece campo explícito.
- Papéis personalizados de cada ambiente precisam ser conferidos nas opções.

Esses limites são exibidos como qualidade dos dados em vez de serem ocultados por aproximações silenciosas.
