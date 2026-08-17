# Gates de Qualidade, Desempenho e Release

## Objetivo

Definir critérios objetivos para impedir que uma versão da Gestão de Tutores seja tratada como pronta apenas porque abre no navegador ou exibe uma dashboard.

O produto deve ser confiável, rápido, rastreável e recuperável em caso de regressão.

## Princípio central

Não existe garantia técnica responsável de ausência absoluta de erros. A garantia do projeto será baseada em prevenção, detecção automática, validação real, bloqueio de decisões sobre dados incompletos e rollback.

## Gate G0. Integridade do repositório

Obrigatório antes da integração definitiva ao Assistente EaD.

Critérios:

1. Todos os arquivos referenciados pelo manifesto existem.
2. Instalação a partir da árvore versionada funciona.
3. Versões de manifesto e pacote são coerentes.
4. Scripts de teste são reproduzíveis.
5. README corresponde à implementação real.

Bloqueador relacionado: issue #2.

## Gate G1. Sintaxe e testes unitários

Obrigatório em toda PR.

Critérios:

1. `npm run check:syntax` aprovado.
2. `npm test` aprovado.
3. Nenhuma alteração em parser ou regra sem teste correspondente.
4. Normalização, papéis, modalidade, métricas e exportação permanecem cobertos.

## Gate G2. Adaptadores Moodle

Obrigatório para cada ambiente.

Critérios:

1. Moodle Goiás possui adaptador próprio.
2. Moodle CTM GO possui adaptador próprio.
3. Ambos obedecem ao mesmo contrato de saída.
4. Fixtures anonimizadas validam participantes, papéis, paginação e metadados.
5. Falha em um adaptador não altera regras do outro.

## Gate G3. Completude da coleta

Cada curso deve estar em um dos estados:

- completo;
- parcial;
- erro;
- não analisado.

Uma análise pode ser marcada como apta para decisão definitiva somente quando:

1. descoberta de categorias não foi truncada;
2. 100% dos cursos descobertos foram processados;
3. não existem cursos parciais por falha técnica ou paginação incompleta;
4. não existem cursos em erro de leitura;
5. versão do adaptador, schema e regras estão registradas no snapshot.

Cursos sem tutor ou sem modalidade podem existir em uma coleta tecnicamente completa, mas devem permanecer como pendências de qualidade institucional.

## Gate G4. Exatidão por amostragem real

Antes de promover uma versão beta:

1. selecionar amostras dos dois Moodles;
2. conferir manualmente cursos, tutores, papéis, alunos e paginação;
3. comparar totais do painel com a origem Moodle;
4. registrar divergências;
5. corrigir qualquer divergência crítica antes da promoção.

Meta para KPIs críticos: nenhuma divergência conhecida na amostra validada.

## Gate G5. Modelo institucional

Antes de exibir Turma e UC como fatos:

1. regra Curso Moodle x Curso Institucional x Turma x UC aprovada;
2. origem de cada classificação registrada;
3. fallback para `Curso Moodle` quando não houver evidência;
4. testes cobrindo cada regra institucional.

Bloqueador relacionado: issue #4.

## Gate G6. Desempenho

Metas iniciais de engenharia, sujeitas a calibração com medições reais:

1. dashboard com até 500 cursos deve abrir o snapshot local sem travamento perceptível;
2. interação de filtro e troca de aba deve permanecer responsiva em base de 500 cursos;
3. coleta deve usar concorrência limitada e não disparar centenas de requisições simultâneas;
4. uma falha isolada não deve abortar a coleta global;
5. requisições possuem timeout e retry limitado;
6. o tempo total, tempo por curso e quantidade de falhas devem ser registrados localmente sem dados sensíveis;
7. atualização incremental deverá ser preferida no uso cotidiano após sua implementação.

Alvos quantitativos provisórios para teste controlado:

- renderização inicial de snapshot local de 500 cursos: até 1 segundo em máquina de referência;
- filtros sobre 500 cursos: até 200 ms;
- nenhuma tarefa síncrona longa deve bloquear a interface por mais de 200 ms;
- coleta completa de aproximadamente 200 cursos: objetivo de até 5 minutos em conexão institucional estável, sem sacrificar completude;
- atualização incremental: objetivo de até 60 segundos quando a maioria dos cursos não exigir releitura.

Esses tempos são requisitos de produto e devem ser confirmados por benchmark antes da versão 1.0.

## Gate G7. Segurança e privacidade

Critérios:

1. nenhuma senha ou token persistido;
2. nenhuma transmissão para serviços externos;
3. aluno armazenado apenas pelo identificador técnico quando nome e e-mail não forem necessários;
4. snapshots isolados por host;
5. botão de limpeza de dados e histórico;
6. retenção configurável;
7. exportações protegidas contra fórmulas;
8. permissões do manifesto justificadas.

## Gate G8. Dashboard gerencial

Critérios:

1. KPIs globais não mudam silenciosamente por filtro local;
2. filtros informam claramente o recorte;
3. cada KPI pode ser rastreado até os cursos que o compõem;
4. visão de cursos inclui cursos sem tutor;
5. qualidade é apresentada primeiro de forma agregada e depois detalhada;
6. base incompleta não é apresentada como apta para decisão definitiva;
7. carga, complexidade e ICT são separados e explicáveis.

## Gate G9. Release Candidate

A versão candidata à produção só pode ser criada quando:

1. Gates G0 a G8 estiverem aprovados;
2. CI estiver verde;
3. roteiro manual passar em Chrome e Edge;
4. Moodle Goiás e CTM GO estiverem validados;
5. documentação corresponder ao pacote;
6. pacote ZIP for reproduzível;
7. existir procedimento de rollback;
8. changelog e versão estiverem atualizados.

## Política de regressão

Se uma versão nova apresentar divergência de KPI, erro de parser ou perda relevante de desempenho:

1. não realizar merge para a linha estável;
2. manter a última versão validada disponível;
3. registrar o cenário como fixture ou teste de regressão;
4. corrigir o problema na branch de desenvolvimento;
5. repetir os gates afetados antes de nova promoção.

## Definição de pronto

Uma issue é considerada concluída somente quando código, testes, documentação e critérios de aceite correspondentes estiverem concluídos. Uma tela funcionando isoladamente não é suficiente para marcar uma funcionalidade como pronta.
