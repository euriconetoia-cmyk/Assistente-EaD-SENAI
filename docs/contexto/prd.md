# PRD — Assistente EaD SENAI

## O que é e por que existe

O Assistente EaD SENAI é uma extensão para o navegador Chrome, construída sobre o Manifest V3, que acompanha a tutoria dentro dos ambientes Moodle autorizados do SENAI (ead.senai.br) e da FIEG (ead.fieg.com.br). O projeto nasceu de uma dor concreta de quem tutora turmas técnicas nesses dois ambientes ao mesmo tempo: o Moodle mostra os dados espalhados por telas diferentes, e o tutor perde tempo procurando quem está pendente, o que já foi lançado, o que ainda falta conferir e o que precisa ser corrigido. A extensão organiza essa informação num painel próprio, sobreposto às páginas do Moodle, e numa Central de Gestão em página dedicada, sem substituir o Moodle nem duplicar dados fora do que o tutor já vê autenticado.

## Para quem é

O usuário principal é o tutor ou professor que atende turmas técnicas no Moodle do SENAI e da FIEG, muitas vezes simultaneamente nos dois ambientes. É alguém que corrige entregas, lança notas e feedback, acompanha alunos em risco de reprovação por falta de entrega, e precisa fechar Unidades Curriculares (UCs) dentro de prazos. Não é um usuário técnico: a extensão precisa funcionar sem exigir conhecimento de programação, e qualquer ação que altere dados no Moodle precisa deixar claro o que vai acontecer antes de acontecer.

## O problema que resolve

Hoje, sem a extensão, o tutor precisa navegar por várias telas do Moodle para descobrir quais alunos estão sem entrega, quais notas foram lançadas mas não confirmadas, quais UCs estão perto do fechamento, e para montar manualmente os materiais de uma correção (enunciado, anexos, arquivos de apoio). Isso é lento, sujeito a erro e não deixa rastro de o que foi decidido e por quê. O Assistente centraliza essa leitura, propõe uma fila priorizada de próximas ações com a justificativa de cada uma, e automatiza a parte mecânica de importar notas e montar pacotes de correção, sempre mantendo o tutor no controle da confirmação final.

## Funcionalidades da versão atual (3.7.16, em produção)

A extensão está organizada em torno de um painel isolado por Shadow DOM que aparece nas páginas do Moodle, e de uma Central de Gestão em página própria da extensão, com dez áreas, filtros globais, calendário, fila de trabalho, histórico e relatórios exportáveis em CSV, JSON e PDF.

Dentro do painel, a Visão geral organiza a "Minha jornada" do tutor em seis etapas — analisar, corrigir, acompanhar, lançar, conferir e arquivar — e mostra até três próximas ações prioritárias, com uma fila completa disponível para quem quiser ver tudo. A extensão acompanha alunos, atividades, notas, pendências, histórico e fechamento de UC. A importação contextual de notas acontece direto na tela de avaliação rápida do Moodle, com prévia, validação e confirmação em duas etapas antes de qualquer gravação. A correção em lote é transacional: pode ser retomada se o navegador suspender a extensão no meio do processo, e é bloqueada sempre que houver associação incompleta entre arquivo, atividade e aluno.

Depois que uma nota é salva, a extensão relê o Moodle para conferir se o que foi gravado bate com o que foi enviado, e mostra divergência por aluno quando não bate — nenhuma ação da jornada declara uma gravação como sucesso sem essa confirmação lida de volta. A associação de atividades para importação e correção acontece só por CMID ou por nome normalizado exato; sugestões aproximadas nunca são salvas sozinhas. As exportações em CSV são protegidas contra fórmulas maliciosas de planilha.

Para a correção assistida por IA, a extensão monta um pacote com o texto da tarefa, os anexos dos alunos e, quando localizado na mesma UC, o recurso "Arquivo SAP" correspondente, além de critérios, nota máxima e hashes de integridade. O CSV de retorno da correção pode trazer desempenho_0_100 em vez de nota; a extensão converte proporcionalmente pela nota máxima confirmada e mostra o cálculo antes do envio, mas nunca aceita os dois campos preenchidos na mesma linha.

A Auditoria Local registra uma linha do tempo com filtros por período, resultado, tipo de ação e busca, e permite exportar evidências para uma pasta escolhida pelo tutor (com autorização explícita do Chrome) ou como ZIP, sempre exigindo escolha separada para incluir dados acadêmicos individuais. Os dados acadêmicos ficam apenas no armazenamento local do navegador, por um período configurável; senhas e tokens de Moodle nunca são coletados.

## O que fica para depois

A homologação autenticada em turmas reais dos dois ambientes Moodle (SENAI e FIEG) é uma etapa que ainda depende de acesso a curso e aluno de teste — sem ela, nenhuma versão pode ser classificada como validada em produção, mesmo passando em todos os testes automatizados. Também ficou registrada, no plano da jornada do tutor, uma divergência de documentação sobre o comportamento padrão de guarda do texto das mensagens, que precisa ser conferida no código e corrigida antes de virar regra nova. Qualquer expansão de escopo (por exemplo, um terceiro ambiente Moodle, ou novos tipos de recurso além do "Arquivo SAP") deve ser tratada como funcionalidade nova, com plano próprio em docs/plans/, e não como ajuste implícito da versão em homologação.

## Perguntas em aberto

Onde faltou informação para decidir sozinho, seguem as perguntas em vez de suposição: existe previsão de adicionar um terceiro domínio Moodle além de SENAI e FIEG? A meta de retenção local dos dados acadêmicos (hoje configurável pelo tutor) tem um limite máximo que a instituição exige, ou fica inteiramente a critério de quem instala? Há um responsável formal pela homologação autenticada em Moodle real, ou isso depende da disponibilidade do próprio Eurico? corrigida antes de virar regra nova. Qualquer expansão de escopo (por exemplo, um terceiro ambiente Moodle, ou novos tipos de recurso além do "Arquivo SAP") deve ser tratada como funcionalidade nova, com plano próprio em docs/plans/, e não como ajuste implícito da versão em homologação.

## Perguntas em aberto

Onde faltou informação para decidir sozinho, seguem as perguntas em vez de suposição: existe previsão de adicionar um terceiro domínio Moodle além de SENAI e FIEG? A meta de retenção local dos dados acadêmicos (hoje configurável pelo tutor) tem um limite máximo que a instituição exige, ou fica inteiramente a critério de quem instala? Há um responsável formal pela homologação autenticada em Moodle real, ou isso depende da disponibilidade do próprio Eurico?
