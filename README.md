# Assistente EaD SENAI V3.0.0

Extensão para Chrome e Edge destinada ao acompanhamento da tutoria nos ambientes:

- `https://ead.senai.br`, identificado como Moodle CTM GO.
- `https://ead.fieg.com.br`, identificado como Moodle Goiás.

## Objetivo

O launcher fica disponivel em qualquer pagina dos dois Moodles suportados. A analise academica so e habilitada quando um curso e reconhecido; fora dele, o painel oferece o acesso a Meus cursos.

Quando o Moodle entregar uma página marcada em inglês, a extensão solicita a mesma página em português brasileiro (`pt_br`).

A versão 3.0.0 mantém o painel do Assistente Tutor e incorpora o Importar notas como recurso contextual do Moodle. As notificações de pendências permanecem visíveis diretamente nos cartões das UCs, nas atividades e nos resumos das páginas de curso e categoria. O modal Importar notas permanece na tela de envios, com as abas Importação e Lançamento em massa.

## Integração contextual da versão 3.0.0

A integração foi refeita a partir da base sem importador. O módulo de importação não foi colocado dentro do painel lateral. Ele é carregado somente nas páginas em que possui uma função operacional.

Na página de categoria, cada UC recebe um indicador de situação. O indicador verde confirma que não foram encontradas correções pendentes. O indicador vermelho mostra a quantidade de envios pendentes.

Na página da UC, a extensão exibe um resumo com o total de envios pendentes, a quantidade de atividades envolvidas, o botão Baixar pendentes e o botão Atualizar. Cada atividade do tipo Tarefa também recebe sua própria contagem.

Na tela de envios com Avaliação rápida ativada, o botão Importar abre o modal Importar notas. A estrutura interna preserva as abas Importação e Lançamento em massa, o prompt de correção, a seleção de CSV, TSV, TXT ou XLSX, a comparação de nomes, as opções de sobrescrita e o preenchimento sem salvamento automático.

## Créditos

Desenvolvimento e integração: [By Eurico Cirilo](https://www.linkedin.com/in/euricocirilo/).

## Organização da interface

Todas as funções relacionadas a notas ficam concentradas exclusivamente na aba **Notas**. A página **Hoje** permanece dedicada ao panorama da UC, fila de prioridades, alunos e atividades. A aba **Diagnóstico** permanece dedicada às fontes, avisos e arquivos técnicos.

## Relatório de Notas

Na aba Notas, a extensão acessa o livro de notas do curso atual e organiza:

- Todos os alunos reconhecidos.
- E-mail, quando disponível no livro de notas ou na página de participantes.
- Todas as colunas de notas reconhecidas.
- Atividades avaliativas.
- Categorias e totais visíveis.
- Nota máxima, quando a faixa é identificada.
- Quantidade de itens com nota e sem nota por aluno.
- Total do curso, quando o Moodle o apresenta.
- Situação final baseada no total do curso identificado.

A leitura pode percorrer páginas adicionais do livro de notas. As páginas são mescladas pelo identificador ou nome do aluno para evitar duplicidade.

## Cache por curso

Cada atualização salva um snapshot local separado pelo host Moodle e pelo ID do curso. Ao reabrir o mesmo curso, o painel mostra primeiro esse dado salvo. Durante 15 minutos não há nova coleta automática; o tutor pode usar **Atualizar análise** a qualquer momento para consultar o Moodle novamente.

## Downloads

O módulo permite:

- Gerar e baixar o relatório em um único clique.
- Baixar arquivo compatível com Excel em formato `.xls`.
- Baixar arquivo `.csv` separado por ponto e vírgula.
- Atualizar os dados antes de iniciar o download.

O arquivo Excel possui:

1. Aba Resumo, com curso, data da coleta, situação da leitura e indicadores.
2. Aba Notas, com uma linha para cada aluno e uma coluna para cada item de nota.

## Correção Assistida

No detalhe de uma atividade, em **Preparar correção com IA**, o prompt de correção fica disponível para cópia. Quando a leitura individual estiver completa, a tela também libera a lista CSV dos alunos pendentes. A extensão não envia essa lista para nenhuma ferramenta externa.

## Segurança da leitura

A extensão não calcula médias por conta própria. Ela reproduz os valores encontrados no livro de notas porque o Moodle pode utilizar:

- Pesos diferentes.
- Categorias.
- Fórmulas personalizadas.
- Exclusões de notas.
- Agregações específicas.

A situação final só é classificada quando a coluna Total do curso é reconhecida. Sem essa coluna, todas as notas são exportadas, mas o relatório informa que o total final não foi identificado.

Campo vazio, hífen, Sem nota, Não avaliado e valor interno `-1` são tratados como ausência de nota. Nota real igual a zero é preservada como nota válida.

## Controle de relatório parcial

O relatório é marcado para conferência quando a extensão identifica:

- Filtro de grupo ativo.
- Categorias recolhidas no livro de notas.
- Páginas adicionais que não puderam ser totalmente lidas.
- Limite configurado de participantes atingido.
- Tabela ou colunas não reconhecidas com confiança suficiente.

Para obter o relatório mais completo, abra o livro de notas, selecione todos os participantes, expanda as categorias e execute novamente a atualização.

## Demais funcionalidades

### Hoje

- Panorama geral da UC.
- Fila de prioridades.
- Atividades aguardando correção.
- Alunos em risco.

### Curso e UC

- Identificação do curso atual.
- Seleção da seção correspondente à UC.
- Data final da UC.
- Inventário de recursos e atividades.

### Atividades

- Quantidade de atividades avaliativas.
- Entregas esperadas.
- Entregas realizadas.
- Entregas corrigidas.
- Correções pendentes.
- Comentários de feedback preenchidos contam como evidência de correção concluída.
- Entregas não realizadas.
- Detalhamento por aluno.
- Verificação conservadora contra falso resultado de ausência de correção.

### Alunos

- Último acesso.
- Entregas e pendências.
- Nota total, quando reconhecida.
- Classificação de risco.
- Ação recomendada.
- Registro local de acompanhamento.

### Fechamento

- Checklist da UC.
- Bloqueio da conclusão automática quando houver atividade sem confirmação.
- Identificação de alunos sem entrega e em recuperação.

### Diagnóstico

- Fontes consultadas.
- Páginas lidas.
- Falhas e avisos.
- Situação do livro de notas.
- Exportação do diagnóstico em JSON.

## Instalação

1. Extraia o arquivo ZIP em uma pasta permanente.
2. Abra `chrome://extensions` ou `edge://extensions`.
3. Ative o Modo do desenvolvedor.
4. Clique em Carregar sem compactação.
5. Selecione a pasta deste repositório.
6. Desative as versões anteriores para evitar dois painéis simultâneos.
7. Entre no Moodle e abra a página de um curso.

## Como emitir o relatório de notas

1. Abra o curso desejado.
2. Abra o Assistente EaD SENAI.
3. Acesse a aba Notas.
4. Clique em Gerar e baixar Excel.
5. Aguarde a leitura do livro de notas e o início do download.
6. Confira o aviso de leitura concluída ou parcial.

Para melhorar a conferência, também é possível abrir primeiro o livro de notas do Moodle e executar o relatório nessa página já carregada.

## Segurança e limites

- Não armazena senha ou token.
- Usa somente a sessão autenticada do usuário.
- Não altera notas.
- Não modifica configurações do curso.
- Não envia mensagens.
- Não acessa domínios diferentes dos dois Moodles configurados.
- Mantém relatórios e históricos localmente no navegador.

A compatibilidade definitiva depende da estrutura real dos dois Moodles, incluindo tema, versão, traduções, plugins, grupos e permissões. Quando a extensão não puder confirmar que leu todos os dados, o relatório é sinalizado como parcial em vez de apresentar uma conclusão indevida.

## Estrutura

```text
Assistente-Tutor-SENAI-v3.0.0/
├── manifest.json
├── background/
├── content/
├── assets/
├── tests/
├── README.md
├── GUIA_DE_TESTE.md
├── ARQUITETURA_INTEGRACAO_CONTEXTUAL_V3.md
├── PLANO_VALIDACAO_INTEGRACAO_CONTEXTUAL_V3.md
├── MATRIZ_REQUISITOS_INTEGRACAO_CONTEXTUAL_V3.md
└── VALIDACAO_AUTOMATICA.json
```
