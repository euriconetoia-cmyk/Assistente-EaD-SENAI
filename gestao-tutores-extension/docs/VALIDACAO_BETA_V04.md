# Validação Beta v0.4

## Objetivo

Homologar a Gestão de Tutores no Moodle Goiás e no Moodle CTM GO antes de promover a solução para uma versão candidata à produção.

Esta validação não serve apenas para conferir se a tela abre. Ela verifica exatidão, completude, rastreabilidade, velocidade e comportamento em falhas.

## Regra de aprovação

A versão só pode avançar quando os KPIs críticos da amostra não apresentarem divergência conhecida em relação ao Moodle e quando qualquer leitura incompleta estiver explicitamente sinalizada.

## 1. Preparação

1. Desativar versões antigas da Gestão de Tutores.
2. Carregar a pasta `gestao-tutores-extension` da branch `agent/gestao-tutores-v3`.
3. Abrir o Moodle autenticado.
4. Conferir em Opções da extensão os papéis utilizados no ambiente.
5. Manter as regras institucionais de Curso/Turma/UC vazias até que a regra da issue #4 seja validada.
6. Não configurar exclusões no primeiro teste, salvo se forem previamente conhecidas e documentadas.

## 2. Reconstrução completa

Executar `Reconstruir base`.

Registrar:

- ambiente;
- horário inicial;
- horário final;
- duração total;
- cursos descobertos;
- cursos processados;
- cursos completos;
- cursos parciais;
- cursos com erro;
- cursos não analisados;
- cobertura;
- confiabilidade técnica;
- quantidade de tutores;
- alunos únicos;
- cursos sem tutor;
- modalidade não identificada.

### Aprovação técnica

Para uma base tecnicamente apta a decisão definitiva:

- cobertura de 100%;
- zero cursos não analisados;
- zero cursos parciais por falha técnica ou paginação incompleta;
- zero erros de leitura.

Cursos sem tutor ou sem modalidade são pendências institucionais e não significam necessariamente falha técnica, mas precisam ser auditados.

## 3. Conferência manual de cursos

Selecionar no mínimo 10 cursos Moodle por ambiente, incluindo quando possível:

- curso com poucos alunos;
- curso com muitos alunos;
- curso com paginação;
- curso com um tutor;
- curso com mais de um tutor;
- curso sem tutor reconhecido;
- Tutor Online;
- Tutor com papel de gestão;
- curso Técnico;
- Aprendizagem;
- Qualificação;
- Pós-graduação;
- curso cuja modalidade não foi identificada.

Para cada curso comparar:

- ID Moodle;
- nome;
- shortname;
- categoria;
- tutor ou tutores;
- papel apresentado no Moodle;
- quantidade de estudantes;
- quantidade de páginas de participantes;
- modalidade;
- estado da coleta;
- confiança.

Qualquer divergência deve gerar fixture ou caso de teste antes da correção ser considerada concluída.

## 4. Conferência por tutor

Selecionar no mínimo 5 tutores por ambiente.

Conferir manualmente:

- cursos Moodle vinculados;
- alunos únicos;
- vínculos aluno x curso;
- papéis;
- cursos completos elegíveis;
- cursos excluídos, quando houver;
- cursos parciais que não entraram no ICT.

O ICT não deve ser validado como norma institucional. Nesta fase deve ser validada apenas a coerência matemática e a explicação da composição.

## 5. Atualização rápida

Após uma reconstrução completa válida:

1. executar `Atualização rápida` dentro da janela de validade do cache;
2. registrar duração;
3. registrar cursos reutilizados;
4. registrar cursos atualizados;
5. confirmar que cobertura e totais permanecem coerentes;
6. alterar uma regra nas configurações e executar novamente;
7. confirmar que a alteração de revisão impede reutilização indevida do cache anterior.

## 6. Cancelamento

1. iniciar uma reconstrução completa;
2. aguardar o processamento de alguns cursos;
3. clicar `Cancelar coleta`;
4. confirmar que a coleta é interrompida;
5. reabrir a dashboard;
6. confirmar que o último snapshot válido anterior permanece disponível;
7. confirmar que uma coleta cancelada não foi registrada como snapshot definitivo.

## 7. Histórico

Executar pelo menos duas coletas válidas.

Conferir:

- quantidade de snapshots;
- data das coletas;
- alunos atuais por tutor;
- variação de alunos;
- cursos atuais;
- variação de cursos;
- ICT atual;
- variação de ICT;
- retenção do histórico.

Confirmar que o histórico não contém IDs ou e-mails de estudantes.

## 8. Exportações

Gerar:

- exportação de tutores;
- exportação de cursos;
- exportação de qualidade;
- exportação de histórico.

Conferir se os totais são compatíveis com a dashboard e se relatórios de base incompleta mantêm os indicadores de cobertura e confiabilidade.

## 9. Desempenho

Registrar separadamente:

### Reconstrução completa

- quantidade de cursos;
- duração;
- média aproximada por curso;
- quantidade de erros e retries observados.

Meta inicial para cerca de 200 cursos em conexão institucional estável: até 5 minutos, desde que isso não exija sacrificar completude ou confiabilidade.

### Atualização rápida

Meta inicial quando a maioria dos cursos estiver dentro da validade do cache: até 60 segundos.

Essas são metas de produto e precisam ser calibradas com medições reais dos dois ambientes.

## 10. Responsividade da dashboard

Com base grande carregada:

- alternar entre abas;
- pesquisar tutor;
- pesquisar curso;
- filtrar modalidade;
- filtrar estado;
- abrir detalhe de tutor;
- exportar relatório.

A interface não deve apresentar travamentos prolongados ou bloquear a navegação do navegador.

## 11. Dados necessários para a issue #4

Para resolver Curso Moodle x Curso Institucional x Turma x UC, selecionar amostra de pelo menos 20 cursos de diferentes modalidades e registrar:

- ID Moodle;
- nome completo;
- shortname;
- categoria;
- subcategoria;
- código institucional da turma, quando existir;
- curso institucional;
- UC;
- modalidade;
- padrão observado.

Nenhuma regra automática deve ser ativada antes desta amostra ser validada.

## 12. Critério de reprovação imediata

A versão não pode ser promovida se ocorrer qualquer um destes casos:

- tutor incorreto sem aviso;
- professor presencial contado como aluno;
- papel administrativo contado como estudante;
- curso ausente da descoberta sem sinalização;
- paginação incompleta apresentada como completa;
- curso parcial entrando silenciosamente no ICT;
- coleta cancelada substituindo snapshot válido;
- cache reutilizado depois de mudança de regras;
- divergência crítica conhecida entre dashboard e Moodle;
- erro de sintaxe ou teste automatizado falhando.

## 13. Registro do resultado

Ao final da validação, registrar na PR #3:

- ambiente testado;
- versão;
- quantidade de cursos;
- cobertura;
- confiabilidade;
- duração completa;
- duração rápida;
- amostra conferida;
- divergências encontradas;
- evidências corrigidas;
- decisão: reprovado, aprovado com ressalvas ou aprovado para próxima fase.
