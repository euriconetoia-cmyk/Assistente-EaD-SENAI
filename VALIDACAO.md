# Validação da versão 3.7.4

Data: 30/08/2026

## Resultado automatizado

- 61 testes automatizados aprovados.
- 0 testes reprovados.
- 45 arquivos verificados pela auditoria estrutural.
- 23 referências do manifesto confirmadas.
- 0 falhas de sintaxe JavaScript.
- 0 desequilíbrios de estrutura CSS.
- 0 violações críticas, altas ou médias identificadas na varredura local.

## Novas verificações da versão 3.7.4

1. Menu lateral compacto, expansão e estado ativo.
2. Preferência do menu armazenada localmente.
3. Créditos visíveis na Central de Gestão.
4. Auditoria Local com filtros e linha do tempo.
5. Eventos minimizados sem persistência padrão de nomes, notas ou feedbacks.
6. Migração dos históricos anteriores.
7. Escolha de pasta por `showDirectoryPicker()`.
8. Referência da pasta armazenada no IndexedDB.
9. Verificação de autorização por `queryPermission()` e `requestPermission()`.
10. Neutralização de nomes de pastas e arquivos.
11. Fallback por download em ZIP.
12. Relatório HTML, histórico CSV e auditoria JSON.
13. Manifesto dos arquivos e hashes SHA-256.
14. Confirmação específica para incluir dados acadêmicos individuais.
15. Contraste WCAG AA das combinações principais.
16. Tema claro e escuro no dashboard, painel e importador.
17. Registro de eventos de análise, importação, conferência e exportação.
18. Preservação das permissões mínimas e da CSP.

## Cobertura de regressão preservada

1. Parser de CSV com delimitadores, aspas e quebras de linha.
2. Rejeição de notas negativas, não numéricas e registros duplicados.
3. Associação exata por CMID ou nome completo da atividade.
4. Neutralização de fórmulas de planilha.
5. Restrição de URLs e hosts de automação.
6. Ciclo transacional de preparação, envio, confirmação e fechamento.
7. Conferência anterior e posterior ao salvamento.
8. Edição individual de nota e feedback.
9. Invalidação da confirmação após edição.
10. Distinção entre divergência e campo não verificável.
11. Validação da identidade interna em mensagens da extensão.
12. Identificação da UC atual e vigências em sobreposição.
13. Inventário acima de 96 cursos com paginação.
14. Atualização de pendências sem cache antigo.
15. Pacote independente por atividade para correção com IA.
16. Enunciado, critérios e dados da atividade no pacote para IA.
17. Mensagem acadêmica editável e encaminhada pelo AVA.
18. Ausência de integração com WhatsApp.
19. Exportações CSV, JSON e impressão para PDF.
20. Presença de `CREDITOS.md` e crédito “By Eurico Cirilo”.

## Auditoria de segurança

- Manifest V3 preservado.
- Permissões limitadas a `storage` e `alarms`.
- Hosts limitados a `ead.senai.br` e `ead.fieg.com.br`.
- CSP: `script-src 'self'; object-src 'self'`.
- Nenhum `eval`, `new Function` ou carregamento de script remoto.
- Nenhuma URL HTTP de produção.
- Nenhuma chave, senha ou token incorporado ao código.
- Remetentes validados em todos os manipuladores de mensagens.
- Conteúdo acadêmico escapado antes da geração de HTML.
- Fórmulas de planilha neutralizadas nas exportações CSV.
- Acesso à pasta dependente de escolha e autorização do usuário.

## Auditoria visual

O relatório [AUDITORIA_VISUAL_V3.7.4.md](AUDITORIA_VISUAL_V3.7.4.md) registra tokens, contrastes, responsividade, foco, tema escuro e estados acessíveis.

## Comandos executados

```bash
node --test tests/*.test.js
node scripts/validate-extension.js
```

## Limite da validação local

O comportamento que gravaria notas foi validado por integração simulada, sem alterar dados acadêmicos reais. O seletor nativo de pasta, o NVDA, o zoom de 200% e a renderização dentro dos temas reais do Moodle ainda devem ser verificados no Chrome do Windows e em curso de homologação.

A versão somente deverá ser usada em produção após essa homologação operacional.
