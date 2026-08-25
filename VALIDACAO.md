# Validação da versão 3.6.1

Data: 22/08/2026

## Resultado

- 38 testes automatizados aprovados.
- 0 testes reprovados.
- 36 arquivos verificados pela auditoria estrutural.
- 23 referências do manifesto confirmadas.
- 0 falhas de sintaxe JavaScript.
- 0 desequilíbrios de estrutura CSS.
- 0 violações críticas, altas ou médias encontradas na varredura para Chrome Web Store.

## Cobertura automatizada

- CSV com delimitadores, aspas e quebras de linha;
- rejeição de notas negativas e não numéricas;
- rejeição de registros duplicados;
- associação exata por CMID e nome de atividade;
- impedimento de salvamento por sugestão aproximada;
- neutralização de fórmulas de planilha;
- normalização de configurações e limites;
- minimização de snapshots e mensagens;
- restrição de URLs e hosts de automação;
- rejeição de lotes inválidos e excessivos;
- ciclo transacional completo: preparar, enviar, confirmar e fechar aba;
- metadados, permissões mínimas e CSP;
- Shadow DOM, cinco abas primárias e avisos acessíveis;
- padrões conservadores de sobrescrita e confirmação.
- distinção entre participante sem envio e entrega aguardando avaliação;
- presença e acionamento do botão “Importar notas” no resumo do curso;
- geração da mensagem automática com nomes ou contagem das pendências;
- recuperação do rascunho quando o mensageiro usa um identificador de conversa.
- seleção simultânea de vários arquivos CSV;
- aceitação de CSV individual sem coluna de atividade mediante associação confirmada;
- reconhecimento seguro da atividade pelo CMID ou nome completo presente no arquivo;
- bloqueio do lote enquanto houver arquivo sem atividade confirmada.
- reconhecimento do botão “Salvar” no rodapé fixo da avaliação rápida do Moodle 5;
- envio alternativo pelo formulário `action=quickgrade` quando o tema não exibir o botão;
- confirmação textual de sucesso ou falha após o retorno do Moodle;
- indicação visual explícita quando o lote termina com atividades não salvas.
- leitura da confirmação após o retorno `action=quickgradingresult` do Moodle;
- restauração controlada de `action=grading` quando o formulário de opções remover a ação da URL;
- limite de redirecionamentos para impedir repetição infinita.
- comparação numérica tolerante entre notas como `50`, `50,0` e `50.00000`;
- comparação de feedback após normalização de quebras de linha e espaços;
- separação entre confirmação, divergência, aluno não localizado e campo não verificável;
- releitura pós-salvamento com filtro de todos os participantes;
- preservação da confirmação de salvamento quando a conferência apresentar divergência;
- rejeição de mensagens sem a identidade interna da extensão;
- painel acessível de conferência, filtro de divergências e relatório CSV detalhado.
- registro quantitativo da conferência no Histórico, sem persistir nomes, notas ou feedbacks.
- identificação da UC atual, vigências em sobreposição, UCs futuras e encerradas;
- data final considerada de forma inclusiva até o fim do dia;
- localização de alunos na visão completa da avaliação rápida;
- releitura de notas em campos numéricos, listas de escala e células exibidas pelo Moodle.
- carregamento da visão geral nas páginas `/my/` dos dois ambientes;
- inventário de cursos com eliminação de duplicidades pelo ID;
- relatório CSV geral com neutralização de fórmulas;
- sinalização de inventário parcial e leituras incompletas.
- calendário de turmas e UCs futuras ordenado por data;
- página separada do dashboard com filtros e dados agregados;
- preservação de valores ausentes como “não coletado”;
- exportação CSV e impressão otimizada para PDF.

## Comandos

```bash
node --test tests/*.test.js
node scripts/validate-extension.js
```

## Escopo da validação

O comportamento que gravaria notas foi validado por integração simulada, sem alterar dados acadêmicos reais. A instalação em Chrome e uma execução controlada em curso de homologação continuam sendo a verificação operacional recomendada antes de uso em produção, pois dependem da versão e do tema do Moodle da instituição.

## Publicação

O código-fonte foi classificado como provável aprovação na revisão de políticas. Campos externos ao pacote, como URL pública da política de privacidade, declaração de práticas de dados e capturas reais, devem ser preenchidos no painel da Chrome Web Store caso a extensão seja publicada.
