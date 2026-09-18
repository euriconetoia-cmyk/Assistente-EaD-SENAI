# Auditoria visual do Assistente EaD SENAI 3.7.0

Data: 30/08/2026

## Escopo

A auditoria examinou a Central de Gestão, o painel lateral, a visão geral de turmas e o importador contextual. A revisão avaliou consistência visual, responsividade declarada, tema escuro, contraste, foco, semântica, estados e preservação dos créditos.

## Resultado

| Critério | Resultado |
|---|---|
| Sistema visual compartilhado | Aprovado |
| Menu híbrido no painel e no dashboard | Aprovado por contrato estrutural |
| Navegação inferior no painel estreito | Aprovado por contrato CSS |
| Tema claro e escuro | Aprovado por contrato visual |
| Contraste da paleta principal | Aprovado em WCAG AA |
| Foco visível | Aprovado |
| Link para conteúdo principal | Aprovado |
| Ícones com nome acessível | Aprovado |
| Estados sem dependência exclusiva de cor | Aprovado |
| Créditos na aplicação | Aprovado |

## Contrastes medidos

| Combinação | Relação |
|---|---:|
| Texto principal sobre branco | 15,91:1 |
| Texto secundário sobre branco | 5,62:1 |
| Azul principal sobre branco | 6,67:1 |
| Texto principal escuro sobre superfície escura | 15,28:1 |
| Texto secundário escuro sobre superfície escura | 8,32:1 |
| Azul claro sobre superfície escura | 6,48:1 |
| Sucesso sobre fundo de sucesso | 5,19:1 |
| Atenção sobre fundo de atenção | 4,84:1 |
| Erro sobre fundo de erro | 5,94:1 |

## Resoluções previstas

Os contratos CSS do painel contemplam:

1. 360 por 800 px.
2. 430 por 900 px.
3. 560 por 900 px.
4. Telas amplas com painel até 700 px.

Abaixo de 430 px de largura interna, o menu lateral transforma-se em navegação inferior. Abaixo de 400 px, indicadores e formulários passam para uma coluna.

## Melhorias implantadas

1. Menu lateral de 72 px implantado dentro do painel do Moodle.
2. Expansão opcional para 184 px.
3. Descrição visual no foco e no apontamento.
4. Preferência do menu preservada localmente.
5. Quatro indicadores principais na primeira dobra.
6. Hierarquia orientada às prioridades do tutor.
7. Tabelas com cabeçalho e primeira coluna fixos.
8. Tipografia nativa do sistema.
9. Área clicável mínima de 40 px nos controles principais.
10. Paleta unificada entre dashboard, painel e importador.
11. Tema escuro ampliado para a visão geral de turmas.
12. Auditoria Local em linha do tempo.
13. Estados textuais de confirmado, parcial, indisponível, desatualizado e erro.
14. Cabeçalho contextual reduzido.
15. Cartão consolidado da situação da UC.
16. Linha do tempo operacional ligada à Auditoria.
17. Notificações internas que não cobrem o conteúdo.
18. Erros de rede traduzidos antes da exibição.
19. Renderização sob demanda da área ativa.

## Validação automatizada

Os testes verificam:

1. Presença do menu híbrido no painel, expansão e remoção das abas antigas.
2. Estado ativo com `aria-current`.
3. Créditos visíveis.
4. Filtros da Auditoria Local.
5. Tema escuro nos três módulos.
6. Contraste AA das combinações principais.
7. Respeito a `prefers-reduced-motion`.
8. Foco visível em botões, campos, seleções e links.
9. Central operacional, qualidade da leitura e estados indisponíveis.
10. Contratos responsivos para 360, 430 e 560 px.

## Validação operacional pendente

Capturas reais e testes com NVDA, zoom de 200% e seletor nativo de pasta devem ser executados no Chrome do Windows durante a homologação. O ambiente de empacotamento não possui uma sessão gráfica autenticada no Moodle e, por isso, não deve substituir essa verificação humana.

Nenhuma publicação definitiva deverá omitir a homologação visual em um curso de teste.
