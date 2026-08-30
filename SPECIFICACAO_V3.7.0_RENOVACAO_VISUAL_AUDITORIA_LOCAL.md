# Especificação do Assistente EaD SENAI 3.7.0

## Renovação visual, Auditoria Local e garantia de qualidade

Status: revisão 2 aprovada para implementação

Base técnica auditada: versão 3.7.0 em homologação visual

Responsável pela concepção, especificação e integração: [Eurico Cirilo](https://www.linkedin.com/in/euricocirilo/)

Colaboração técnica registrada: [Julio Alves](https://www.linkedin.com/in/julioall/)

Data da revisão: 30/08/2026

Decisão de versionamento: a implementação continuará identificada como versão 3.7.0. Não deverá haver incremento para 3.7.1 nesta etapa. O pacote público somente poderá ser atualizado depois que a revisão visual estiver integralmente implantada e validada.

## 1. Finalidade

Esta especificação define a evolução completa da interface do Assistente EaD SENAI e a implantação da nova área de Auditoria Local. O documento deverá orientar desenvolvimento, revisão visual, auditoria de código, testes, homologação e publicação da versão 3.7.0.

A atualização deverá preservar todas as funções acadêmicas existentes e tornar a aplicação mais tecnológica, consistente, agradável, acessível e segura.

## 2. Resultado esperado

A versão 3.7.0 deverá entregar:

1. Menu lateral híbrido e compacto no painel principal e na Central de Gestão.
2. Navegação acessível com ícones, descrições e expansão opcional.
3. Sistema visual unificado entre painel, dashboard e importador.
4. Nova página inicial do painel orientada às prioridades do tutor.
5. Fluxo visual em etapas para importação, edição, conferência e salvamento de notas.
6. Auditoria Local em formato de linha do tempo.
7. Escolha segura de uma pasta do computador para salvar evidências.
8. Exportação estruturada de relatórios, histórico e dados técnicos.
9. Tema claro e escuro completos.
10. Auditorias obrigatórias de interface, acessibilidade, segurança, desempenho e código.
11. Migração segura dos dados locais da versão 3.6.8.
12. Preservação obrigatória dos créditos em todas as versões e pacotes.
13. Cabeçalho contextual reduzido no painel principal.
14. Cartão consolidado de situação da UC.
15. Linha do tempo operacional integrada à Auditoria Local.
16. Comando rápido para as ações mais frequentes.
17. Modo foco para correção e conferência em lote.
18. Painel explícito de qualidade e confiabilidade dos dados.

## 3. Estado atual validado

A base 3.6.8 foi examinada antes da elaboração desta especificação.

| Item | Situação atual |
|---|---|
| Arquitetura | Chrome Manifest V3 em JavaScript, HTML e CSS puros |
| Interface injetada | Shadow DOM no painel principal |
| Dashboard | Página HTML local da extensão |
| Armazenamento | `chrome.storage.local` com retenção configurável |
| Permissões | `storage` e `alarms` |
| Ambientes autorizados | `ead.senai.br` e `ead.fieg.com.br` |
| CSP | `script-src 'self'; object-src 'self'` |
| Código remoto | Ausente |
| Exportação de evidências | ZIP com HTML, CSV e JSON já existente |
| Testes atuais | 53 testes aprovados |
| Validação estrutural | 23 referências e 40 arquivos aprovados |
| Créditos | `CREDITOS.md` e rodapé da aplicação |

## 4. Escopo

### 4.1 Dentro do escopo

1. Central de Gestão.
2. Painel lateral do assistente.
3. Visão geral de cursos e turmas.
4. Importação de notas e feedbacks.
5. Conferência anterior e posterior ao salvamento.
6. Histórico de ações.
7. Exportação de evidências.
8. Tema claro e escuro.
9. Acessibilidade.
10. Segurança e privacidade.
11. Testes automatizados e homologação no Moodle.
12. Documentação e publicação.

### 4.2 Fora do escopo da versão 3.7.0

1. Envio de dados para servidor externo.
2. Sincronização em nuvem.
3. Banco de dados remoto.
4. Correção acadêmica automática sem confirmação humana.
5. Salvamento silencioso de notas.
6. Acesso permanente a pastas sem autorização do usuário.
7. Alteração automática do Moodle sem ação do tutor.
8. Atualização automática para instalações feitas em modo de desenvolvedor.

## 5. Princípios obrigatórios

### 5.1 Segurança acadêmica

Nenhuma nota ou feedback poderá ser salvo sem associação confirmada, conferência visível e consentimento explícito do tutor.

### 5.2 Dados verificáveis

Ausência de fonte deverá aparecer como “Não coletado”, “Não verificado” ou “Conferir”. A aplicação nunca deverá converter ausência de informação em zero.

### 5.3 Privacidade por padrão

O histórico local deverá armazenar somente os dados mínimos necessários. Dados individuais, notas e feedbacks completos só poderão ser incluídos em exportação detalhada após confirmação explícita.

### 5.4 Processamento local

Os dados permanecerão no navegador e na pasta escolhida pelo usuário. Nenhuma evidência poderá ser transmitida para serviço externo.

### 5.5 Acessibilidade desde a implementação

Todos os componentes deverão ser criados e testados para teclado, leitores de tela, zoom, alto contraste e redução de movimento.

### 5.6 Preservação dos créditos

O arquivo `CREDITOS.md`, o rodapé visual e as referências de autoria não poderão ser removidos por atualizações, empacotamento ou publicação.

## 6. Arquitetura técnica

### 6.1 Tecnologia

A versão 3.7.0 continuará utilizando JavaScript, HTML e CSS puros. Não será introduzido framework visual nesta etapa.

Motivos:

1. Compatibilidade com a base atual.
2. Menor risco de regressão.
3. Ausência de dependências remotas.
4. Menor tamanho do pacote.
5. Preservação da CSP atual.

### 6.2 Contextos da extensão

| Contexto | Responsabilidade |
|---|---|
| Content script | Leitura controlada do Moodle e painel injetado |
| Shadow DOM | Isolamento visual do painel lateral |
| Dashboard local | Central de Gestão, menu compacto e Auditoria Local |
| Service worker | Operações transacionais, mensagens internas e ciclo de tarefas |
| `chrome.storage.local` | Configurações, snapshots minimizados e histórico operacional |
| IndexedDB da extensão | Referência local da pasta autorizada e metadados de exportação |
| File System Access API | Escrita na pasta escolhida pelo usuário após gesto explícito |

### 6.3 Permissões

Requisito `SEC-001`: a implementação não deverá adicionar permissão de manifesto para acessar arquivos ou pastas.

Requisito `SEC-002`: a escolha de pasta deverá ocorrer por `showDirectoryPicker()` em resposta direta a um clique do usuário.

Requisito `SEC-003`: quando a API não estiver disponível ou a autorização for negada, a aplicação deverá oferecer download convencional do ZIP.

## 7. Sistema visual unificado

### 7.1 Tokens visuais

Os três módulos deverão utilizar os mesmos tokens semânticos.

| Token | Tema claro | Tema escuro | Uso |
|---|---|---|---|
| Primário | `#0B5CAD` | `#2488D4` | Ação principal e item ativo |
| Primário escuro | `#073B70` | `#0A416F` | Cabeçalho e hover |
| Destaque | `#0F9FB5` | `#37BFD0` | Tecnologia e gráficos |
| Fundo | `#F3F6FA` | `#0C1420` | Fundo geral |
| Superfície | `#FFFFFF` | `#121E2C` | Cartões e modais |
| Texto | `#162238` | `#EDF5FC` | Conteúdo principal |
| Texto secundário | `#5B6880` | `#A9B8C9` | Metadados |
| Borda | `#D8E1EC` | `#2A3B4E` | Divisões |
| Sucesso | `#067647` | `#69D5A2` | Confirmação |
| Atenção | `#A15C00` | `#F6C768` | Conferência |
| Erro | `#B42318` | `#FF8D84` | Falha e bloqueio |

### 7.2 Tipografia

Requisito `UI-001`: utilizar a pilha de fontes nativas do sistema.

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

| Elemento | Tamanho mínimo |
|---|---:|
| Texto normal | 14 px |
| Metadado | 12 px |
| Botão | 14 px |
| Subtítulo | 16 px |
| Título de página | 24 px |
| Indicador numérico | 26 px |

### 7.3 Espaçamento e formas

1. Escala de espaçamento: 4, 8, 12, 16, 24 e 32 px.
2. Raio de campos: 8 px.
3. Raio de cartões: 12 a 14 px.
4. Raio de modais: 16 px.
5. Sombra leve somente para separar níveis de superfície.
6. Área clicável preferencial de 44 por 44 px e mínimo absoluto de 32 por 32 px.

### 7.4 Componentes compartilhados

Requisito `UI-002`: criar componentes visuais equivalentes para:

1. Botão principal.
2. Botão secundário.
3. Botão de perigo.
4. Botão somente com ícone.
5. Campo, seleção e área de texto.
6. Cartão.
7. Indicador numérico.
8. Estado de leitura.
9. Aviso.
10. Mensagem de erro.
11. Estado vazio.
12. Carregamento.
13. Tabela.
14. Modal.
15. Linha do tempo.
16. Etapas de processo.

## 8. Menu lateral compacto

### 8.1 Comportamento principal

Requisito `NAV-001`: o painel principal injetado no Moodle e o dashboard deverão iniciar com menu lateral compacto. No painel, a faixa terá de 64 a 72 px. No dashboard, terá de 80 a 88 px.

Requisito `NAV-002`: cada opção deverá possuir ícone local, texto acessível e descrição visual ao passar o mouse ou receber foco.

Requisito `NAV-003`: o menu poderá ser expandido pelo usuário. No painel, a largura expandida deverá respeitar o espaço disponível e não poderá impedir a leitura do conteúdo. No dashboard, deverá ficar entre 248 e 272 px.

Requisito `NAV-004`: a preferência de expansão deverá ser salva localmente.

Requisito `NAV-005`: no painel com largura inferior a 430 px, a navegação deverá se transformar em barra inferior acessível com quatro ações principais e “Mais”. No dashboard abaixo de 840 px, deverá utilizar menu móvel acessível. Não será aceita barra de abas horizontais com conteúdo oculto ou rolagem não sinalizada.

### 8.2 Organização

| Grupo | Itens |
|---|---|
| Trabalho | Visão geral, Alunos, Correções, Notas |
| Gestão | Auditoria, Relatórios, Calendário |
| Mais | Curso e UC, Fechamento, Diagnóstico, Configurações |

### 8.3 Estado ativo

O item ativo deverá apresentar:

1. Cor de texto primária.
2. Fundo de destaque com contraste suficiente.
3. Indicador lateral ou inferior.
4. `aria-current="page"`.
5. Texto acessível mesmo quando o menu estiver recolhido.

### 8.4 Contadores

Somente Correções, Alunos em atenção e Diagnóstico poderão mostrar contadores. Os valores deverão ter rótulo acessível, origem confirmada e não poderão depender apenas da cor. Leituras parciais não poderão gerar badges numéricos como se fossem totais confirmados.

### 8.5 Aplicação obrigatória no painel do Moodle

Requisito `NAV-006`: as abas horizontais “Hoje”, “Alunos”, “Atividades”, “Notas”, “Fechamento” e o seletor “Mais” deverão ser substituídos pelo novo menu híbrido.

Requisito `NAV-007`: o item “Histórico” deverá ser incorporado à área “Auditoria”.

Requisito `NAV-008`: o menu deverá permanecer disponível enquanto o conteúdo rola.

Requisito `NAV-009`: o painel deverá preservar o item ativo, os filtros e a posição de rolagem de cada área durante a sessão.

Requisito `NAV-010`: ícones recolhidos deverão possuir tooltip em foco e passagem do ponteiro, nome acessível e indicação visual inequívoca do item ativo.

## 9. Nova página inicial

### 9.1 Cabeçalho compacto

Requisito `HOME-001`: mostrar curso ou contexto atual, ambiente Moodle, qualidade da leitura, data da última atualização e botão “Atualizar”.

Requisito `HOME-001A`: o cabeçalho do painel deverá utilizar no máximo duas linhas funcionais e ficar preferencialmente entre 108 e 124 px de altura no estado padrão.

Requisito `HOME-001B`: versão e autoria permanecerão no rodapé e na página “Sobre”, preservando “By Eurico Cirilo” e `CREDITOS.md`.

Requisito `HOME-001C`: modo de coleta e opções menos frequentes deverão ficar em menu associado ao botão “Atualizar” ou em Configurações.

### 9.2 Indicadores principais

A primeira dobra do painel deverá mostrar no máximo quatro indicadores:

1. Atividades avaliativas.
2. Entregas realizadas.
3. Correções pendentes confirmadas.
4. Alunos que exigem acompanhamento.

O dashboard completo poderá mostrar até seis indicadores agregados, desde que não duplique os mesmos dados em blocos consecutivos.

### 9.3 Conteúdo operacional

Requisito `HOME-002`: a página deverá destacar, nesta ordem:

1. Três maiores prioridades.
2. Próxima ação recomendada.
3. Cartão consolidado da situação da UC.
4. UCs próximas do fechamento.
5. Atividade recente ligada à Auditoria.
6. Ações rápidas.

Requisito `HOME-003`: nenhum gráfico poderá ser apenas decorativo. Todo gráfico deverá possuir descrição textual, fonte, período e alternativa acessível.

### 9.4 Cartão consolidado da UC

Requisito `HOME-004`: atividades, entregas, correções e pendências relacionadas deverão ser apresentadas em um único cartão consolidado, evitando conjuntos repetidos de cartões.

Requisito `HOME-005`: a grade do painel terá no máximo duas colunas e deverá mudar para uma coluna abaixo de 400 px.

Requisito `HOME-006`: “Verificar” não poderá ser apresentado como valor principal. O sistema deverá usar “Confirmado”, “Leitura parcial”, “Dados indisponíveis”, “Desatualizado” ou “Erro de consulta”.

Requisito `HOME-007`: números anteriores poderão ser exibidos apenas quando identificados como desatualizados e acompanhados da data de coleta.

### 9.5 Linha do tempo operacional

Requisito `HOME-008`: a visão geral deverá mostrar os últimos eventos relevantes, como análise atualizada, pacote exportado, conferência concluída, nota salva e evidência exportada.

Requisito `HOME-009`: cada evento deverá abrir seu registro correspondente na Auditoria quando houver evidência associada.

### 9.6 Comando rápido

Requisito `HOME-010`: deverá existir acesso compacto às ações Atualizar análise, Baixar correções, Importar notas, Conferir alterações, Exportar evidências e Abrir dashboard.

Requisito `HOME-011`: o comando rápido deverá aceitar teclado e pesquisa por nome da ação, sem duplicar permanentemente todos os botões na tela.

### 9.7 Qualidade da leitura

Requisito `HOME-012`: avisos extensos deverão ser substituídos por um resumo de qualidade que diferencie participantes, atividades, entregas e notas.

Requisito `HOME-013`: mensagens técnicas como “Failed to fetch” não poderão aparecer na área operacional. A mensagem original ficará restrita ao Diagnóstico.

Requisito `HOME-014`: falhas recuperáveis deverão oferecer “Tentar novamente” e “Ver detalhes técnicos”.

### 9.8 Modo foco

Requisito `FOCUS-001`: os fluxos de correção e notas deverão oferecer modo foco com atividade atual, aluno atual, nota, feedback, navegação anterior e próxima, conferência e salvamento.

Requisito `FOCUS-002`: sair do modo foco não poderá descartar edições sem confirmação.

Requisito `FOCUS-003`: o modo foco deverá funcionar integralmente por teclado.

### 9.9 Rolagem, notificações e ocupação do espaço

Requisito `LAYOUT-001`: cabeçalho, menu e barra contextual deverão permanecer fixos. Somente o conteúdo principal do painel poderá possuir rolagem vertical.

Requisito `LAYOUT-002`: não poderá haver duas barras verticais concorrentes no painel, exceto uma rolagem interna temporária em tabela ou modal que exija esse comportamento.

Requisito `LAYOUT-003`: notificações não poderão cobrir indicadores, tabelas, campos, barra de ações ou créditos.

Requisito `LAYOUT-004`: confirmações de sucesso serão discretas e temporárias. Erros que exigem decisão permanecerão visíveis até serem resolvidos ou fechados.

Requisito `LAYOUT-005`: ações fixas no rodapé deverão reservar espaço no conteúdo para que a última linha continue acessível.

Requisito `LAYOUT-006`: o painel deverá preservar conteúdo e ações em larguras de 360, 430 e 560 px, com zoom de 200%.

Requisito `LAYOUT-007`: o sistema deverá utilizar carregamento progressivo e esqueletos compactos, evitando saltos bruscos de layout.

## 10. Tabelas

Requisito `TABLE-001`: cabeçalho fixo durante rolagem vertical.

Requisito `TABLE-002`: primeira coluna fixa quando houver rolagem horizontal.

Requisito `TABLE-003`: oferecer seleção de colunas visíveis.

Requisito `TABLE-004`: oferecer ordenação e busca.

Requisito `TABLE-005`: oferecer densidade confortável e compacta.

Requisito `TABLE-006`: usar cartões ou lista resumida em telas pequenas.

Requisito `TABLE-007`: associar corretamente cabeçalhos às células e indicar ordenação por `aria-sort`.

## 11. Fluxo de notas e feedbacks

### 11.1 Etapas

O processo deverá ser apresentado em quatro etapas:

1. Selecionar arquivos.
2. Associar atividades.
3. Conferir e editar.
4. Salvar e verificar.

### 11.2 Conferência editável

Requisito `GRADE-001`: nota e feedback deverão ser editáveis individualmente na etapa de conferência.

Requisito `GRADE-002`: qualquer edição deverá invalidar a confirmação anterior.

Requisito `GRADE-003`: cada linha deverá informar se o campo será preenchido, mantido ou sobrescrito.

Requisito `GRADE-004`: notas negativas, não numéricas ou superiores à nota máxima deverão ser bloqueadas.

Requisito `GRADE-005`: feedback acima do limite aceito deverá ser bloqueado com explicação e foco no campo.

Requisito `GRADE-006`: o salvamento continuará bloqueado até que a conferência seja novamente aceita.

Requisito `GRADE-007`: a verificação posterior deverá distinguir sucesso, divergência, campo não verificável e aluno não localizado.

### 11.3 Resumo obrigatório

Antes do salvamento, a interface deverá exibir:

1. Registros prontos.
2. Registros com aviso.
3. Registros bloqueados.
4. Notas alteradas.
5. Feedbacks alterados.
6. Campos preservados.

## 12. Auditoria Local

### 12.1 Objetivo

A Auditoria Local deverá registrar evidências suficientes para demonstrar o que foi feito pela extensão, quando, em qual contexto e qual foi o resultado, sem criar coleta excessiva de dados pessoais.

### 12.2 Tipos de evento

| Código | Evento |
|---|---|
| `analysis.started` | Atualização iniciada |
| `analysis.completed` | Atualização concluída |
| `analysis.partial` | Atualização concluída parcialmente |
| `package.exported` | Pacote para correção exportado |
| `import.loaded` | Arquivo de notas carregado |
| `import.validated` | Importação validada |
| `review.completed` | Conferência anterior concluída |
| `grade.save.started` | Salvamento iniciado |
| `grade.save.completed` | Salvamento concluído |
| `grade.save.partial` | Salvamento parcialmente concluído |
| `grade.verify.completed` | Verificação posterior concluída |
| `message.opened` | Mensagem preparada no AVA |
| `report.exported` | Relatório exportado |
| `evidence.exported` | Pacote de evidências exportado |
| `error.operational` | Falha operacional tratada |

### 12.3 Esquema do evento

```json
{
  "schemaVersion": 1,
  "eventId": "uuid-local",
  "eventType": "grade.save.completed",
  "createdAt": "2026-08-30T18:42:00.000Z",
  "extensionVersion": "3.7.0",
  "environment": "ead.fieg.com.br",
  "courseId": "34410",
  "courseName": "Curso Técnico",
  "ucName": "Introdução à Indústria 4.0",
  "activityId": "301026",
  "activityName": "Envio Atividade Ética e Moral",
  "result": "success",
  "counts": {
    "processed": 18,
    "confirmed": 17,
    "divergent": 1,
    "failed": 0
  },
  "source": "batch-grading",
  "details": {
    "inventoryPartial": false,
    "message": "Salvamento concluído com uma divergência para conferência."
  }
}
```

### 12.4 Minimização

Requisito `AUD-001`: o histórico padrão não deverá persistir nomes de alunos, notas individuais ou feedbacks completos.

Requisito `AUD-002`: o histórico deverá registrar contagens, identificadores acadêmicos, datas, tipos de ação e resultados.

Requisito `AUD-003`: a exportação detalhada poderá incluir dados individuais disponíveis naquele momento somente após o usuário marcar a opção “Incluir dados acadêmicos individuais”.

Requisito `AUD-004`: antes da exportação detalhada, mostrar aviso de privacidade e confirmar a pasta de destino.

### 12.5 Retenção

1. Padrão: 90 dias.
2. Configurável: 30, 60, 90, 180 ou 365 dias.
3. Limite por curso: 2.000 eventos.
4. Limpeza automática respeitando a configuração.
5. Exportações salvas no computador não serão apagadas pela extensão.

### 12.6 Interface

Requisito `AUD-005`: apresentar os registros em linha do tempo.

Requisito `AUD-006`: permitir filtros por período, ambiente, curso, UC, atividade, tipo de ação e resultado.

Requisito `AUD-007`: permitir pesquisa textual nos campos não sensíveis.

Requisito `AUD-008`: apresentar resumo quantitativo do período filtrado.

Requisito `AUD-009`: mostrar claramente se o registro é integral, parcial ou não verificável.

## 13. Escolha e uso da pasta de evidências

### 13.1 Primeiro uso

1. O usuário clica em “Escolher pasta”.
2. A aplicação explica quais arquivos serão gravados.
3. O Chrome abre o seletor nativo.
4. O usuário escolhe a pasta e confirma.
5. A referência é armazenada no IndexedDB da origem da extensão.
6. A interface mostra somente o nome da pasta, nunca o caminho completo.

### 13.2 Usos posteriores

Requisito `DIR-001`: consultar `queryPermission({mode: 'readwrite'})` antes de escrever.

Requisito `DIR-002`: se necessário, solicitar novamente com `requestPermission({mode: 'readwrite'})` após clique do usuário.

Requisito `DIR-003`: se a autorização estiver negada, oferecer “Escolher outra pasta” e “Baixar ZIP normalmente”.

Requisito `DIR-004`: nunca tentar contornar uma negação de permissão.

### 13.3 Organização das pastas

```text
Pasta escolhida/
  Assistente_EaD_SENAI/
    Evidencias/
      2026/
        08/
          2026-08-30_154200_curso_34410/
            LEIA-ME.txt
            relatorio_evidencias.html
            historico_acoes.csv
            auditoria_completa.json
            manifesto_arquivos.json
            CHECKSUMS.sha256
```

Requisito `DIR-005`: nomes de diretórios e arquivos deverão ser normalizados e não poderão conter sequências de navegação como `../`.

Requisito `DIR-006`: arquivos já existentes não deverão ser sobrescritos silenciosamente. Em conflito, adicionar horário ou sequência ao nome.

### 13.4 Conteúdo do pacote

| Arquivo | Conteúdo |
|---|---|
| `LEIA-ME.txt` | Identificação, período, versão e explicação dos arquivos |
| `relatorio_evidencias.html` | Relatório acessível e preparado para impressão |
| `historico_acoes.csv` | Eventos tabulares com neutralização de fórmulas |
| `auditoria_completa.json` | Estrutura técnica versionada |
| `manifesto_arquivos.json` | Relação, tamanho, tipo e hash dos arquivos |
| `CHECKSUMS.sha256` | Integridade dos arquivos exportados |

### 13.5 PDF

O navegador não permite salvar silenciosamente uma impressão como PDF em uma pasta. Portanto:

1. A versão 3.7.0 deverá incluir relatório HTML preparado para impressão.
2. O botão “Gerar PDF” deverá abrir a janela de impressão para o usuário escolher “Salvar como PDF”.
3. A geração automática de PDF somente poderá ser incluída se for implementada por biblioteca local auditada, sem código remoto, sem ampliar permissões e sem comprometer o tamanho do pacote.
4. A ausência do PDF automático não poderá bloquear a exportação principal.

## 14. Integridade das evidências

Requisito `INT-001`: usar Web Crypto com SHA-256 para gerar o hash de cada arquivo.

Requisito `INT-002`: o manifesto deverá registrar nome, tamanho, MIME, hash e data de geração.

Requisito `INT-003`: o relatório deverá registrar versão da extensão, versão do esquema e ambiente de origem.

Requisito `INT-004`: qualquer falha durante a escrita deverá ser registrada e apresentada ao usuário.

Requisito `INT-005`: uma exportação parcial deverá receber o estado “Incompleta” e informar quais arquivos falharam.

## 15. Segurança

### 15.1 Requisitos obrigatórios

1. `SEC-004`: manter Manifest V3.
2. `SEC-005`: manter CSP sem `unsafe-inline` e `unsafe-eval`.
3. `SEC-006`: proibir scripts remotos.
4. `SEC-007`: validar `sender.id` em todas as mensagens internas.
5. `SEC-008`: aceitar somente URLs HTTPS dos dois Moodles autorizados.
6. `SEC-009`: escapar todo conteúdo do Moodle antes de inserir HTML.
7. `SEC-010`: neutralizar fórmulas em todas as exportações CSV.
8. `SEC-011`: validar JSON com `try/catch` e esquema mínimo.
9. `SEC-012`: limitar tamanho, quantidade e duração de exportações.
10. `SEC-013`: não registrar mensagens, notas ou feedbacks completos no console.

### 15.2 Limites propostos

| Recurso | Limite inicial |
|---|---:|
| Eventos locais por curso | 2.000 |
| Eventos exibidos por página | 100 |
| Eventos por exportação | 50.000 |
| Tamanho máximo do pacote | 500 MB |
| Tamanho máximo de detalhe textual por evento | 2.000 caracteres |
| Tempo sem progresso antes de aviso | 30 segundos |

Os limites deverão ser testados e poderão ser reduzidos se houver impacto de memória.

## 16. Acessibilidade

### 16.1 Critério mínimo

A interface deverá atender WCAG 2.2 nível AA nos fluxos principais.

### 16.2 Requisitos

1. `A11Y-001`: navegação completa por teclado.
2. `A11Y-002`: foco visível com contraste mínimo de 3:1.
3. `A11Y-003`: contraste de texto normal de pelo menos 4,5:1.
4. `A11Y-004`: botões somente com ícone devem possuir `aria-label`.
5. `A11Y-005`: mensagens dinâmicas devem usar região `aria-live`.
6. `A11Y-006`: carregamentos devem usar `aria-busy`.
7. `A11Y-007`: erros devem estar associados aos campos por `aria-describedby`.
8. `A11Y-008`: Escape fecha modal e devolve foco ao elemento de origem.
9. `A11Y-009`: nenhuma informação poderá depender somente de cor.
10. `A11Y-010`: zoom de 200% sem perda funcional.
11. `A11Y-011`: respeitar `prefers-reduced-motion`.
12. `A11Y-012`: tabelas devem manter semântica e cabeçalhos associados.
13. `A11Y-013`: ícones decorativos devem usar `aria-hidden="true"`.
14. `A11Y-014`: o dashboard deve possuir link “Ir para o conteúdo”.

## 17. Tema escuro

Requisito `THEME-001`: todas as cores deverão utilizar tokens semânticos.

Requisito `THEME-002`: não utilizar fundos claros fixos em avisos, itens ativos ou campos.

Requisito `THEME-003`: a escolha poderá ser “Claro”, “Escuro” ou “Usar configuração do sistema”.

Requisito `THEME-004`: a preferência deverá ser armazenada localmente.

Requisito `THEME-005`: gráficos, tabelas, modais, calendário e importador deverão ser testados nos dois temas.

## 18. Estados da interface

Cada área deverá possuir os seguintes estados:

1. Carregamento com esqueleto visual ou progresso determinado.
2. Conteúdo disponível.
3. Estado vazio com explicação e próxima ação.
4. Erro recuperável com botão “Tentar novamente”.
5. Erro de autenticação com orientação para abrir o Moodle.
6. Dados parciais com indicação do que não foi verificado.
7. Operação concluída com resumo quantitativo.

Mensagens técnicas e pilhas de erro não poderão ser exibidas diretamente ao usuário.

## 19. Desempenho

Requisito `PERF-001`: renderizar imediatamente dados armazenados e atualizar em segundo plano somente após ação ou regra configurada.

Requisito `PERF-002`: histórico deverá usar paginação ou renderização incremental.

Requisito `PERF-003`: gerar hashes e arquivos em lotes para evitar congelamento prolongado da interface.

Requisito `PERF-004`: atualizações do DOM deverão ser agrupadas.

Requisito `PERF-005`: animações deverão utilizar `transform` e `opacity`, durar entre 100 e 200 ms e respeitar redução de movimento.

Metas iniciais:

| Medição | Meta |
|---|---:|
| Primeira renderização com dados locais | até 500 ms |
| Resposta visual após clique | até 100 ms |
| Troca de tela | até 200 ms |
| Filtro em até 2.000 eventos | até 250 ms |
| Ausência de tarefa longa | nenhuma tarefa acima de 200 ms sem progresso visível |

## 20. Migração de dados

Requisito `MIG-001`: incrementar o esquema do histórico sem apagar dados compatíveis.

Requisito `MIG-002`: manter as chaves atuais do dashboard durante pelo menos uma versão de compatibilidade.

Requisito `MIG-003`: converter snapshots antigos somente quando forem carregados.

Requisito `MIG-004`: se a migração falhar, preservar o dado original, registrar diagnóstico e permitir exportação de recuperação.

Requisito `MIG-005`: nenhuma atualização deverá apagar `CREDITOS.md`, histórico válido ou configurações do usuário.

## 21. Arquivos previstos

### 21.1 Novos módulos sugeridos

```text
dashboard/
  design-tokens.css
  components.css
  audit-view.js
  audit-export.js
  directory-access.js
content/
  audit-log.js
tests/
  audit-log.test.js
  audit-export-v2.test.js
  directory-access.test.js
  visual-contract.test.js
  accessibility-contract.test.js
```

### 21.2 Arquivos que deverão ser revisados

1. `manifest.json`
2. `content/styles.css`
3. `content/ui.js`
4. `content/exporters.js`
5. `content/storage.js`
6. `content/batch-grading.js`
7. `content/importer/contextual-importer.css`
8. `content/importer/contextual-importer.js`
9. `dashboard/index.html`
10. `dashboard/dashboard.css`
11. `dashboard/dashboard.js`
12. `background/service-worker.js`
13. `CREDITOS.md`
14. `PRIVACIDADE.md`
15. `README.md`
16. `CHANGELOG.md`
17. `VALIDACAO.md`

## 22. Etapas de implementação

### Fase 0. Proteção da base

1. Criar branch `release/3.7.0-renovacao-visual-auditoria`.
2. Registrar checksum da versão 3.6.8.
3. Executar os 53 testes existentes.
4. Guardar capturas das telas atuais para comparação.
5. Confirmar que `CREDITOS.md` está presente.

Critério de saída: base reproduzível, sem falhas e sem alterações inesperadas.

### Fase 1. Sistema visual

1. Criar tokens claros e escuros.
2. Criar componentes compartilhados.
3. Aplicar tipografia e espaçamentos.
4. Revisar foco, contraste e áreas clicáveis.
5. Manter o comportamento funcional atual.

Critério de saída: painel, dashboard e importador usam o mesmo padrão visual.

### Fase 2. Menu compacto e página inicial

1. Substituir as abas horizontais do painel pelo menu híbrido compacto.
2. Adicionar expansão opcional.
3. Criar navegação inferior para painel estreito.
4. Reduzir o cabeçalho contextual.
5. Implantar a Central de prioridades.
6. Criar cartão consolidado da UC.
7. Criar linha do tempo operacional.
8. Implantar comando rápido.
9. Implantar qualidade da leitura.
10. Corrigir rolagem e notificações sobrepostas.
11. Aplicar tabelas aprimoradas.

Critério de saída: a mudança visual é claramente perceptível no painel do Moodle, as abas anteriores deixaram de existir e todas as páginas continuam acessíveis por mouse, teclado e leitor de tela.

### Fase 3. Fluxo de notas

1. Apresentar quatro etapas.
2. Preservar edição individual.
3. Adicionar resumo da conferência.
4. Preservar invalidação após edição.
5. Preservar verificação posterior.

Critério de saída: nenhum salvamento é possível sem conferência válida.

### Fase 4. Auditoria Local

1. Criar esquema de eventos.
2. Instrumentar ações críticas.
3. Criar linha do tempo e filtros.
4. Implantar retenção e limites.
5. Migrar histórico anterior.

Critério de saída: ações críticas geram eventos mínimos, consistentes e pesquisáveis.

### Fase 5. Pasta e exportação

1. Implantar seletor de pasta.
2. Guardar referência no IndexedDB.
3. Validar autorização a cada uso.
4. Criar estrutura de diretórios.
5. Gerar manifesto e hashes.
6. Implantar fallback por download.

Critério de saída: pacote integral salvo, validado e reaberto sem corrupção.

### Fase 6. Auditorias e homologação

1. Auditoria visual.
2. Auditoria de acessibilidade.
3. Auditoria de código.
4. Auditoria de segurança e privacidade.
5. Testes automatizados.
6. Teste real em curso de homologação.

Critério de saída: nenhum problema crítico, alto ou médio aberto.

### Fase 7. Publicação

1. Atualizar versão para 3.7.0.
2. Atualizar documentação e créditos.
3. Gerar instalador com `manifest.json` na raiz.
4. Gerar checksums.
5. Criar pull request.
6. Revisar comparativo.
7. Integrar somente após aprovação.

## 23. Estratégia de testes

### 23.1 Testes unitários

1. Validação de eventos.
2. Minimização de dados.
3. Retenção e limites.
4. Normalização de nomes de arquivos.
5. Neutralização de fórmulas CSV.
6. Geração de hashes.
7. Geração do manifesto.
8. Migração de esquema.
9. Contratos de tokens visuais.
10. Validação de notas e feedbacks.

### 23.2 Testes de integração

1. Evento criado após análise.
2. Evento criado após exportação.
3. Evento criado após salvamento e verificação.
4. Histórico persistido e recuperado.
5. Pasta autorizada, revogada e novamente autorizada.
6. Escrita integral e escrita parcial.
7. Fallback por download.
8. Comunicação entre dashboard, content script e service worker.
9. Migração da versão 3.6.8.

### 23.3 Testes de interface

1. Menu compacto e expandido.
2. Navegação móvel.
3. Tema claro e escuro.
4. Densidade confortável e compacta.
5. Tabelas em diferentes larguras.
6. Etapas da importação.
7. Linha do tempo vazia, preenchida e com erro.
8. Seletor de pasta indisponível.
9. Permissão negada.
10. Exportação concluída e parcial.

### 23.4 Testes de acessibilidade

1. Navegação somente com teclado.
2. Leitura com NVDA no Windows.
3. Lighthouse Accessibility.
4. axe DevTools.
5. Zoom de 200%.
6. Contraste de todos os estados.
7. Ordem de foco dos modais.
8. Anúncios de progresso e conclusão.
9. Redução de movimento.

### 23.5 Testes de segurança

1. Ausência de `eval` e `new Function`.
2. Ausência de scripts remotos.
3. CSP preservada.
4. Permissões mínimas.
5. Validação de remetente.
6. Teste de XSS com conteúdo do Moodle.
7. Teste de CSV Injection.
8. Teste de nomes de arquivo maliciosos.
9. Teste de JSON inválido.
10. Teste de pacote excessivo.

### 23.6 Testes de desempenho

1. Histórico com 2.000 eventos.
2. Exportação com 50.000 eventos.
3. Pacote próximo do limite permitido.
4. Filtragem e busca.
5. Troca rápida entre telas.
6. Consumo de memória durante geração de ZIP e hashes.

### 23.7 Homologação no Moodle

Testar nos dois ambientes:

1. `ead.fieg.com.br`.
2. `ead.senai.br`.

Fluxos obrigatórios:

1. Página inicial `/my/`.
2. Página de curso.
3. Página de atividade.
4. Avaliação rápida.
5. Livro de notas.
6. Mensageria do AVA.
7. Dashboard local.
8. Importação em curso de homologação.
9. Conferência posterior.
10. Exportação das evidências para pasta real.

## 24. Auditoria visual obrigatória

### 24.1 Resoluções

Capturar e comparar:

1. 360 por 800 px.
2. 768 por 1024 px.
3. 1366 por 768 px.
4. 1920 por 1080 px.

### 24.2 Estados

Para cada resolução, revisar:

1. Tema claro.
2. Tema escuro.
3. Menu compacto.
4. Menu expandido.
5. Carregamento.
6. Estado vazio.
7. Dados parciais.
8. Erro.
9. Modal aberto.
10. Tabela com rolagem.

### 24.3 Critérios visuais

1. Nenhum texto cortado sem alternativa.
2. Nenhum botão sobreposto.
3. Nenhuma rolagem horizontal da página inteira.
4. Hierarquia visual clara.
5. Uma ação principal por contexto.
6. Contraste aprovado.
7. Espaçamento consistente.
8. Ícones consistentes.
9. Estados identificados por texto e cor.
10. Créditos visíveis e legíveis.

## 25. Auditoria de código obrigatória

### 25.1 Estrutura

1. Sintaxe JavaScript válida.
2. Referências do manifesto existentes.
3. `manifest.json` na raiz do ZIP.
4. Nenhum arquivo temporário no pacote.
5. Nenhuma dependência remota.
6. Checksums atualizados.

### 25.2 Manutenibilidade

1. Dividir arquivos que concentram responsabilidades excessivas.
2. Evitar duplicação de tokens e componentes.
3. Documentar funções públicas.
4. Evitar manipulação insegura de HTML.
5. Tratar erros em operações assíncronas.
6. Proibir `console.log` com dados acadêmicos.

### 25.3 Revisão de risco

Cada achado deverá ser classificado como crítico, alto, médio ou baixo. A versão não poderá ser publicada com achados críticos, altos ou médios sem correção ou justificativa formal aprovada.

## 26. Critérios de aceite

### 26.1 Funcionais

1. Todos os recursos presentes na base 3.7.0 de homologação continuam funcionando.
2. Menu compacto funciona no painel, dashboard e demais áreas previstas.
3. Menu expandido preserva a preferência.
4. Auditoria registra todas as ações críticas definidas.
5. Filtros do histórico funcionam.
6. Pasta pode ser escolhida e reutilizada após confirmação.
7. Negação de permissão não bloqueia o download comum.
8. Pacote contém todos os arquivos obrigatórios.
9. Hashes conferem com o conteúdo exportado.
10. Importação continua exigindo conferência.
11. Modo foco preserva edições e exige confirmação antes de sair.
12. Comando rápido executa somente ações válidas no contexto atual.
13. Linha do tempo abre a evidência correspondente.

### 26.2 Visuais

1. Painel, dashboard e importador compartilham tokens e componentes.
2. Tema claro e escuro estão completos.
3. Não há texto menor que 12 px.
4. Não há controles menores que 32 por 32 px.
5. Não há conteúdo inacessível em 200% de zoom.
6. As abas horizontais anteriores não aparecem no painel.
7. O cabeçalho padrão não excede 124 px, salvo quando houver aviso crítico expandido.
8. A primeira dobra contém no máximo quatro indicadores principais.
9. A visão geral não repete o mesmo indicador em cartões consecutivos.
10. O painel possui apenas uma rolagem vertical principal.
11. Nenhuma notificação cobre informações ou ações.
12. “Verificar” não aparece como valor numérico ou resultado confirmado.
13. Nenhuma mensagem técnica bruta aparece fora do Diagnóstico.
14. A composição permanece utilizável em 360, 430 e 560 px.

### 26.3 Segurança e privacidade

1. Nenhuma nova permissão ampla.
2. Nenhum código remoto.
3. Nenhum dado enviado para terceiros.
4. Histórico padrão sem nomes, notas ou feedbacks individuais.
5. Exportação detalhada exige confirmação.
6. Remetentes de mensagens são validados.
7. Conteúdo acadêmico é escapado.

### 26.4 Qualidade

1. Os 53 testes existentes continuam aprovados.
2. Todos os novos requisitos críticos possuem teste.
3. Nenhum teste reprovado.
4. Validação estrutural aprovada.
5. Auditoria visual aprovada.
6. Auditoria de acessibilidade aprovada.
7. Auditoria de segurança sem achados críticos, altos ou médios.
8. Homologação real concluída sem gravar dados fora do curso de teste.

## 27. Matriz de rastreabilidade mínima

| Requisito | Implementação prevista | Teste obrigatório |
|---|---|---|
| `NAV-001` | Menu compacto | Contrato visual e E2E |
| `NAV-006` | Substituição das abas do painel | Captura visual e E2E |
| `HOME-004` | Cartão consolidado da UC | Contrato visual e unitário |
| `HOME-013` | Tradução de erros técnicos | Unitário e integração |
| `FOCUS-001` | Modo foco | Integração e acessibilidade |
| `LAYOUT-002` | Rolagem única | Captura visual e E2E |
| `LAYOUT-003` | Notificação sem sobreposição | Captura visual e E2E |
| `GRADE-001` | Campos editáveis | Unitário e integração |
| `AUD-001` | Log minimizado | Unitário de privacidade |
| `AUD-005` | Linha do tempo | Interface e acessibilidade |
| `DIR-001` | Autorização de pasta | Integração com mock e teste manual |
| `INT-001` | SHA-256 | Unitário com vetor conhecido |
| `SEC-005` | CSP | Validação estrutural |
| `A11Y-001` | Navegação por teclado | E2E e teste manual |
| `THEME-005` | Tema completo | Captura visual comparativa |
| `MIG-001` | Migração de esquema | Unitário com dados 3.6.8 |

A implementação deverá ampliar esta matriz até cobrir todos os requisitos numerados.

## 28. Estratégia de publicação e reversão

### 28.1 Publicação

1. Criar branch exclusiva.
2. Implementar por fases e commits pequenos.
3. Abrir pull request com checklist.
4. Anexar relatório de testes e auditorias.
5. Comparar todos os arquivos com a branch principal.
6. Integrar por squash somente após aprovação.

### 28.2 Reversão

1. Manter instalador validado da versão 3.6.8.
2. Não excluir chaves antigas na primeira migração.
3. Permitir desativar a nova Auditoria Local sem perder o histórico existente.
4. Em falha grave, restaurar a interface anterior sem alterar os dados acadêmicos.
5. Documentar qualquer incompatibilidade descoberta após publicação.

## 29. Créditos e documentação

Requisito `DOC-001`: `CREDITOS.md` deverá permanecer na raiz e ser incluído no pacote de instalação.

Requisito `DOC-002`: o rodapé deverá exibir “By Eurico Cirilo” de forma legível e acessível.

Requisito `DOC-003`: o `README.md` deverá explicar instalação, atualização, Auditoria Local e escolha de pasta.

Requisito `DOC-004`: `PRIVACIDADE.md` deverá explicar retenção, exportação detalhada e acesso à pasta.

Requisito `DOC-005`: `CHANGELOG.md` deverá registrar todas as alterações da versão 3.7.0.

Requisito `DOC-006`: `VALIDACAO.md` deverá registrar comandos, quantidades, resultados e limites do teste real.

## 30. Definição de concluído

A versão 3.7.0 somente será considerada concluída quando:

1. O escopo definido estiver implementado.
2. A matriz de rastreabilidade estiver completa.
3. Os testes anteriores e novos estiverem aprovados.
4. A auditoria visual estiver documentada.
5. A auditoria de acessibilidade estiver documentada.
6. A auditoria de código e segurança estiver aprovada.
7. A exportação para pasta tiver sido testada no Chrome real.
8. O fallback de download tiver sido testado.
9. A migração da versão 3.6.8 tiver sido comprovada.
10. Os créditos estiverem preservados.
11. O instalador possuir `manifest.json` diretamente na raiz.
12. O checksum do instalador estiver publicado.
13. O pull request tiver sido revisado antes da integração.
14. O menu híbrido estiver visível e funcional dentro do painel do Moodle.
15. As abas horizontais antigas tiverem sido removidas.
16. A Central de prioridades, o cartão consolidado e a qualidade da leitura estiverem implantados.
17. Não houver mensagem técnica crua nem notificação cobrindo o conteúdo.
18. A interface tiver sido comparada visualmente nas larguras de 360, 430 e 560 px.
19. O usuário tiver aprovado capturas ou protótipo da versão final antes da publicação.
20. O número da versão permanecer `3.7.0` no manifesto, no painel, nos documentos e no instalador.

## 31. Decisões aprovadas para início

1. Adotar o menu lateral híbrido como padrão do painel e da Central de Gestão.
2. Permitir expansão opcional do menu.
3. Adotar a Auditoria Local em linha do tempo.
4. Permitir escolha de pasta por autorização explícita do Chrome.
5. Manter fallback por download de ZIP.
6. Manter o processamento local e sem servidor externo.
7. Manter JavaScript, HTML e CSS puros na versão 3.7.0.
8. Preservar os créditos de Eurico Cirilo e Julio Alves.
9. Executar auditoria visual e de código antes da publicação.
10. Manter a identificação da versão 3.7.0 durante toda esta revisão.
11. Não publicar novamente no GitHub antes da aprovação visual do painel real.

## 32. Comandos mínimos de validação

```bash
node --test tests/*.test.js
node scripts/validate-extension.js
```

Testes de navegador, acessibilidade e escolha de pasta deverão ser executados separadamente em Chrome real, pois dependem de interação do usuário e do ambiente Moodle.

## 33. Referências técnicas oficiais

1. [File System Access API no Chrome](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access)
2. [Permissões persistentes para acesso a arquivos e pastas](https://developer.chrome.com/blog/persistent-permissions-for-the-file-system-access-api)
3. [Referência das APIs de extensões do Chrome](https://developer.chrome.com/docs/extensions/reference/api/)
4. [Políticas do programa para desenvolvedores da Chrome Web Store](https://developer.chrome.com/docs/webstore/program-policies/)

As referências oficiais confirmam o uso de `showDirectoryPicker()`, `queryPermission()`, `requestPermission()` e armazenamento de `FileSystemHandle` no IndexedDB. A funcionalidade deverá ser tratada como melhoria progressiva, mantendo o download convencional como alternativa obrigatória.
