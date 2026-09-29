# Design — Assistente EaD SENAI

## Princípio

O painel e a Central de Gestão precisam ter a mesma cara em qualquer tela nova: mesmas cores, mesma tipografia, mesmo espaçamento, com suporte completo a tema claro, escuro e do sistema. Os valores abaixo são os que já estão implementados em `content/styles.css` e `dashboard/dashboard.css`; uma tela nova deve reutilizar essas variáveis CSS, nunca declarar uma cor ou um espaçamento novo direto no componente.

## Cores

As cores são declaradas como variáveis CSS em `:root`, com um conjunto trocado inteiro para `:root[data-theme="dark"]`. Nunca usar um valor hexadecimal direto num componente novo — sempre referenciar a variável.

Tema claro:
- `--primary: #0b5cad` (ação principal, links, ícones ativos)
- `--primary-dark: #073b70` (gradiente da marca, estados escuros do primário)
- `--accent: #0f9fb5` (gráficos, destaques secundários)
- `--ink: #162238` (texto principal)
- `--muted: #5b6880` (texto secundário, rótulos)
- `--border: #d8e1ec` / `--border-strong: #b8c5d5`
- `--surface: #fff` (cartões, painéis) / `--surface2: #f8fafc` (fundo de inputs e linhas alternadas) / `--bg: #f3f6fa` (fundo da página)
- `--red: #b42318` / `--redbg: #fff0ef` (erro, pendência crítica)
- `--green: #067647` / `--greenbg: #e9f8f0` (sucesso, conferido)
- `--amber: #a15c00` / `--amberbg: #fff6e5` (aviso, leitura inconclusiva)
- `--info: #075da8` / `--infobg: #eaf4fd` (informação neutra)
- `--shadow: 0 5px 18px rgba(25,47,76,.07)`

Tema escuro (mesmas variáveis, valores trocados):
- `--primary: #47a8ec` / `--primary-dark: #2488d4` / `--accent: #37bfd0`
- `--ink: #edf5fc` / `--muted: #a9b8c9`
- `--border: #2a3b4e` / `--border-strong: #41556c`
- `--surface: #121e2c` / `--surface2: #172536` / `--bg: #0c1420`
- `--red: #ff8d84` / `--redbg: #441e20`
- `--green: #69d5a2` / `--greenbg: #123b2c`
- `--amber: #f6c768` / `--amberbg: #412f10`
- `--info: #78bdf1` / `--infobg: #153651`
- `--shadow: 0 5px 18px rgba(0,0,0,.22)`

O tema é escolhido por `data-theme` na raiz (`light`, `dark`, ou ausente para seguir o sistema via `color-scheme`).

## Tipografia

Fonte do sistema, sem importação externa: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Corpo do texto em `14px`, `line-height: 1.5`. Títulos de página (`.page-head h1`) em `22px`; títulos de seção (`.view-head h2`) em tamanho fluido `clamp(23px, 2.4vw, 32px)` com `letter-spacing: -.03em`; rótulos e categorias (`.eyebrow`, `.nav-group`) em `11px`, peso `800`, letras espaçadas (`letter-spacing: .08em`) e maiúsculas. Números de destaque em cartões de métrica (`.metric strong`) em `27px`.

## Espaçamento e layout

Espaçamento-base entre blocos: `--gap: 16px`, usado nas grades de métricas e painéis. Raio de borda padrão de cartão e painel: `13px`–`14px`; de botão e badge: `8px`–`10px`; de badge circular (pílula): `999px`. A navegação lateral tem largura de `84px` recolhida e `264px` expandida (`--nav`), com transição de `.16s`. O conteúdo principal tem largura máxima de `1600px`, centralizado, com `padding` lateral fluido (`max(22px, 3vw)`).

Pontos de quebra responsivos já estabelecidos: `1200px` (métricas e relatórios passam a 2–3 colunas), `840px` (navegação lateral vira barra horizontal compacta, marca e rodapé somem), `620px` (uma coluna única em filtros, métricas e cabeçalhos). Toda tela nova precisa se comportar bem nesses três pontos, incluindo a versão de tabela em cartões empilhados usada abaixo de `760px` (`data-label` no lugar do cabeçalho da coluna).

## Componentes

Botão padrão: fundo `--surface`, borda `--border`, texto `--primary`, altura mínima `40px`; variante primária (`.button.primary`) inverte para fundo `--primary` e texto branco. Cartão de métrica, de qualidade e de relatório compartilham o mesmo estilo base: borda `--border`, fundo `--surface`, sombra `--shadow`, raio `14px`. Estados de linha em tabela usam fundo de aviso (`--redbg` para pendência, `--amberbg` para revisão). Badges e resultado de evento usam fundo e cor emparelhados por estado: vermelho para erro, verde para sucesso, âmbar para parcial, azul-info para neutro — essa correspondência de cores por estado (vermelho/verde/âmbar/info) é o vocabulário visual do projeto inteiro e deve ser respeitada em qualquer indicador novo.

## Acessibilidade

Foco visível obrigatório em botão, input, select e link: contorno de `3px` na cor `#f6b900`, com `2px` de espaçamento (`outline-offset`). Existe um link de pular para o conteúdo (`.skip-link`) fixo no topo, visível ao receber foco. A extensão respeita `prefers-reduced-motion: reduce`, desligando transição e animação. Existe uma folha de estilo dedicada para impressão, que oculta navegação e ações e ajusta a tabela para caber na página. Qualquer componente novo deve manter esse padrão de foco visível e de suporte a teclado — o painel já é testado nessa dimensão (navegação por teclado, 320px e painel amplo, tema claro e escuro).

## Onde faltou informação

Não há, nos arquivos do repositório, uma referência de marca externa (manual de marca do SENAI ou da FIEG) que defina se essas cores devem seguir uma identidade visual institucional oficial. Se existir um manual de marca à parte, ele deveria ser linkado aqui; sem ele, os valores acima são a única fonte de verdade de design do projeto.
