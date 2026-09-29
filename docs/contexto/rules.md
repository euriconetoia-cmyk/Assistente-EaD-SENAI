# Rules — Assistente EaD SENAI

## Princípio geral

Este projeto lida com notas, feedback e dados de alunos reais dentro de ambientes Moodle institucionais. A regra que está acima de todas as outras é: nenhuma ação escrita no Moodle pode ser assumida como bem-sucedida sem confirmação lida de volta, e nenhum dado sensível pode sair do armazenamento local do navegador. Qualquer sugestão de código que contorne essas duas garantias para "simplificar" ou "ganhar performance" deve ser recusada, mesmo que pareça inofensiva.

## O que fazer

Escrever JavaScript direto, sem transpilação e sem framework, compatível com o Chrome a partir da versão 102 (`minimum_chrome_version` do manifesto). Manter a ordem de carregamento dos content scripts declarada no `manifest.json`, porque scripts posteriores dependem de globals expostos pelos anteriores via `content/namespace.js`. Qualquer nova associação entre atividade, aluno e arquivo deve usar CMID ou nome normalizado exato, nunca aproximação automática — sugestões aproximadas podem ser mostradas ao tutor, mas nunca salvas sozinhas. Toda gravação em lote deve continuar transacional e retomável após suspensão do service worker, e bloqueada quando houver associação incompleta. Depois de qualquer gravação de nota ou feedback, é obrigatório reler o Moodle e comparar o que foi salvo com o que foi enviado antes de marcar a pendência como resolvida; resultado sem confirmação verificável fica como erro para revisão manual, nunca como sucesso presumido. Exportações em CSV precisam manter a proteção contra fórmulas de planilha já existente. Depois de qualquer alteração de código, rodar `npm test`, `npm run validate` e `npm run integrity`, e regenerar `CHECKSUMS.sha256` com `npm run checksums` antes de considerar a mudança pronta.

## Bibliotecas e dependências

O projeto não usa framework de UI, gerenciador de estado, bundler nem dependências externas de produção — só Node 18+ para os scripts internos de teste e validação (`node --test`, scripts próprios em `scripts/`). Não adicionar uma biblioteca nova sem antes registrar em `memory.md` por que a solução nativa não bastou; a ausência de dependências é uma decisão de arquitetura, não uma lacuna a preencher.

## Tratamento de erro

Erro de leitura, cobertura incompleta ou fonte contraditória deve aparecer como estado `Verificar` ou `Não verificado`, nunca ser tratado como zero ou como sucesso silencioso. Nunca inferir uma contagem, uma nota ou uma conclusão a partir de uma fonte ausente — na dúvida, pedir nova leitura ou conferência manual do tutor. Um contato registrado com o aluno nunca deve ser tratado, no código, como equivalente a uma entrega resolvida ou a uma mensagem efetivamente enviada; são eventos distintos e devem ficar distintos no histórico.

## O que nunca fazer

Nunca adicionar um domínio, host ou permissão do Chrome além de `ead.senai.br`, `ead.fieg.com.br`, `storage` e `alarms` sem decisão explícita registrada — isso é mudança de escopo institucional, não ajuste técnico. Nunca coletar, guardar ou transmitir senha, cookie ou token de sessão do Moodle. Nunca enviar arquivo de aluno, enunciado ou dado acadêmico para um serviço externo pela extensão — o pacote de correção assistida por IA é montado localmente para o tutor levar para onde ele decidir, a extensão em si não faz a chamada à IA. Nunca remover ou reduzir a prévia obrigatória e a confirmação em duas etapas antes de uma gravação no Moodle. Nunca declarar uma versão como "validada em Moodle real" sem homologação autenticada nos dois ambientes com curso e aluno de teste — testes automatizados passando não substituem essa etapa. Nunca publicar uma versão nova sem manter os créditos em `CREDITOS.md` e sem descrever a mudança em `CHANGELOG.md`.

## Idioma e convenções

Interface, documentação e mensagens de commit em português do Brasil. Nomes técnicos (variáveis, funções, arquivos, chaves de armazenamento) em inglês, seguindo o padrão já usado no código (`camelCase` para variáveis e funções, arquivos em `kebab-case.js`). Não traduzir nomes técnicos já existentes no meio de uma alteração pontual — se um nome precisa mudar, isso é uma decisão própria, registrada como tal.

## Documentação obrigatória por mudança

Toda entrega de versão deve manter: um relatório em `docs/reports/` descrevendo o que mudou e como foi validado; uma entrada em `CHANGELOG.md`; e, quando a mudança alterar comportamento acadêmico (regras de nota, fila de prioridades, conferência de lançamento), uma entrada correspondente em `memory.md` com a data, a decisão e o porquê.
