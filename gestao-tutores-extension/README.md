# Gestão de Tutores Moodle SENAI

Versão independente de validação do módulo de Gestão de Tutores do Assistente EaD SENAI.

## Objetivo

Coletar, usando somente a sessão Moodle já autenticada, informações disponíveis sobre cursos, participantes e papéis para montar uma visão consolidada por tutor.

A versão de validação foi mantida em uma pasta independente para não alterar a extensão principal.

## Ambientes suportados

- https://ead.fieg.com.br
- https://ead.senai.br

## O que já funciona

- Descoberta de cursos a partir da página atual, Meus cursos e índice de cursos.
- Leitura da página de participantes de cada curso.
- Identificação de tutores por padrões de papel configuráveis.
- Identificação de estudantes.
- Deduplicação de alunos por ID Moodle.
- Inferência conservadora de modalidade.
- Cache local do último snapshot.
- Dashboard geral.
- Lista por tutor.
- Detalhamento das turmas de cada tutor.
- Matrículas e alunos únicos.
- Quantidade de turmas e cursos por tutor.
- Média de alunos por turma.
- Carga relativa baixa, média ou alta em comparação com a média do recorte.
- Distribuição por modalidade.
- Diagnósticos de qualidade da coleta.
- Exportação CSV.
- Configuração do limite de cursos e dos nomes dos papéis.

## Instalação para validação

1. Baixe ou clone a branch `agent/gestao-tutores-mvp`.
2. Localize a pasta `gestao-tutores-extension`.
3. Abra `chrome://extensions` ou `edge://extensions`.
4. Ative o modo do desenvolvedor.
5. Clique em `Carregar sem compactação`.
6. Selecione somente a pasta `gestao-tutores-extension`.
7. Mantenha o Moodle aberto e autenticado.
8. Atualize a página do Moodle após instalar a extensão.

## Configuração recomendada antes da primeira coleta

1. Abra os detalhes da extensão no navegador.
2. Acesse `Opções da extensão`.
3. Confira quais termos identificam o papel de tutor no seu Moodle.
4. Por padrão são aceitos termos como `tutor`, `tutor ead`, `professor tutor` e `docente tutor`.
5. Ajuste o limite de cursos se necessário.

A configuração é importante porque os nomes dos papéis podem variar entre ambientes e não devem ser presumidos como regra institucional.

## Como validar

1. Abra uma página do Moodle em que seu usuário tenha acesso às turmas.
2. Clique no botão flutuante `Gestão de Tutores` ou no ícone da extensão.
3. Na dashboard, clique em `Atualizar do Moodle`.
4. Aguarde o processamento dos cursos encontrados.
5. Confira os cards gerais.
6. Compare pelo menos três tutores com o Moodle.
7. Abra `Detalhes` de cada tutor e confira as turmas.
8. Verifique a diferença entre matrículas e alunos únicos.
9. Confira os diagnósticos apresentados.
10. Exporte o CSV e compare a amostra com os dados do Moodle.

## O que precisa ser conferido no primeiro teste real

### Descoberta de cursos

A extensão deve encontrar as turmas que o usuário realmente consegue visualizar. Se o Moodle privilegiado não apresentar todos os cursos em `/my/` ou `/course/index.php`, a estratégia de descoberta precisará ser adaptada para a categoria ou relatório administrativo utilizado no ambiente.

### Papel de tutor

A página de participantes precisa expor o papel do usuário de alguma forma. Se o papel aparecer com outro nome, ajuste nas opções da extensão.

### Alunos

Quando a coluna de papéis é identificada, a confiança da leitura é maior. Quando ela não é encontrada, a extensão usa uma classificação conservadora e registra diagnóstico para conferência.

### Paginação

A coleta solicita até 5000 participantes por página. Se o Moodle ainda apresentar paginação, a dashboard registra um aviso e os números devem ser considerados parciais até implementarmos a paginação específica daquele ambiente.

### Modalidade

A modalidade é inferida pelo nome e caminho de categoria do curso. Quando não houver evidência suficiente, aparece `Não identificada`.

## Segurança

- Não captura senha.
- Não lê credenciais.
- Não envia dados para serviços externos.
- Usa somente páginas que o usuário autenticado já consegue acessar.
- Armazena o snapshot localmente no navegador.
- Não altera notas, cursos, participantes ou configurações do Moodle.
- Não envia mensagens.

## Estrutura

```text
gestao-tutores-extension/
  manifest.json
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
```

## Próxima evolução após a validação

Depois do primeiro teste real, os seletores e regras de descoberta deverão ser adaptados ao HTML efetivamente retornado pelos Moodles. Somente depois dessa validação o módulo deverá ser integrado ao Assistente EaD SENAI principal.
