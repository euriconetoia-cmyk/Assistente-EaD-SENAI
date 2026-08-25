# Gestão de Tutores

Protótipo funcional do módulo de gestão de tutores do Assistente EaD SENAI.

## Objetivo

Consolidar a carga de tutoria por profissional e permitir análise por turmas, cursos, matrículas, alunos únicos e modalidades.

## Estado atual

A primeira versão utiliza dados simulados para validar interface, regras de cálculo e experiência de uso antes da integração com o Moodle.

O módulo ainda não está conectado ao `manifest.json` nem ao painel lateral da extensão principal.

## Funcionalidades implementadas

1. Cards com tutores, turmas, matrículas, alunos únicos, média por tutor e modalidades.
2. Filtro textual por tutor, curso ou turma.
3. Filtro por modalidade.
4. Filtro por status da turma.
5. Gráfico de carga por tutor usando alunos únicos.
6. Resumo de turmas por modalidade.
7. Tabela detalhada por tutor.
8. Classificação comparativa de carga em baixa, média e alta.
9. Modal de detalhamento das turmas de cada tutor.
10. Diagnóstico inicial para turma sem tutor e carga acima da média.
11. Exportação CSV com separador ponto e vírgula.
12. Deduplicação de estudantes por identificador no conjunto de turmas.

## Arquivos

`index.html` contém a estrutura da dashboard.

`styles.css` contém o layout responsivo e os componentes visuais.

`app.js` contém filtros, métricas, classificação de carga, diagnósticos, detalhamento e exportação.

`mock-data.js` contém dados simulados com sobreposição proposital de estudantes entre turmas para validar a deduplicação.

## Regra atual de carga

A classificação é comparativa dentro do recorte filtrado.

Carga alta corresponde a pelo menos 125 por cento da média de alunos únicos por tutor.

Carga baixa corresponde a no máximo 75 por cento da média.

Os demais casos são classificados como carga média.

Essa regra é apenas analítica e não representa norma institucional. Os limites deverão ser configuráveis antes do uso operacional.

## Como testar o protótipo

Abra `gestao-tutores/index.html` em um navegador moderno.

Teste os filtros, clique nos tutores para abrir o detalhamento e utilize a exportação CSV.

## Próxima etapa

Mapear as páginas reais do Moodle e criar um coletor que forneça ao módulo uma estrutura equivalente à usada atualmente pelo `mock-data.js`.

O coletor deverá obter somente dados disponíveis à sessão autenticada e trabalhar com permissões mínimas, sem armazenar credenciais.
