# Relatório de revisão para Chrome Web Store

**Extensão**: Assistente EaD SENAI  
**Versão**: 3.6.0  
**Data da varredura**: 22/08/2026  
**Veredito do código-fonte**: PROVÁVEL APROVAÇÃO

## Resumo

| Severidade | Quantidade |
|---|---:|
| Crítica | 0 |
| Alta | 0 |
| Média | 0 |
| Verificações aprovadas | 16 |

## Verificações aprovadas

- [x] Blue Argon: nenhum `eval`, `Function`, importação dinâmica remota ou script externo.
- [x] Red Titanium: nenhuma ofuscação, cadeia codificada ou reconstrução opaca de código.
- [x] Purple Potassium: somente `storage` e `alarms`; hosts limitados aos dois Moodles autorizados.
- [x] Purple Lithium: política de privacidade incluída e tratamento local documentado.
- [x] Yellow Zinc: nome, descrição, versão e ícones 16, 32, 48 e 128 válidos.
- [x] Red Magnesium: propósito único de apoio à tutoria em Moodle.
- [x] Red Nickel: descrição compatível com painel, importação e acompanhamento implementados.
- [x] Purple Copper: consultas e automações somente por HTTPS.
- [x] Yellow Argon: metadados concisos, sem repetição de palavras-chave.
- [x] Yellow Potassium: funcionalidade substancial com painel, análise, relatórios e importação.
- [x] Grey Titanium: nenhum link ou parâmetro de afiliado.
- [x] Grey Silicon: nenhum código de mineração.
- [x] Blue Zinc: downloads limitados a arquivos de atividades do Moodle na sessão do tutor, sem mídia pública ou burla de acesso.
- [x] Yellow Nickel: nenhuma API de notificações ou padrão de spam.
- [x] Purple Nickel: nenhuma coleta de histórico. Eventos de abas são usados somente nas abas de avaliação criadas pelo lote; WhatsApp é aberto apenas por ação explícita e está divulgado na política.
- [x] Blue Copper: manipuladores de mensagens validam a identidade interna da extensão antes de processar comandos.

## Observações para publicação

O pacote-fonte está adequado para submissão. No painel da Chrome Web Store ainda devem ser preenchidos os itens externos ao ZIP: URL pública da política de privacidade, declaração de práticas de dados, justificativa do propósito único e capturas reais da interface em ambiente de homologação. Esses campos não pertencem ao `manifest.json` e não podem ser configurados dentro do pacote.

## Evidências técnicas

- CSP: `script-src 'self'; object-src 'self'`.
- Permissões: `storage`, `alarms`.
- Host permissions: `ead.senai.br` e `ead.fieg.com.br`.
- Código remoto: ausente.
- Tráfego HTTP: ausente.
- Política local: `PRIVACIDADE.md`.
- Validação automatizada: `node scripts/validate-extension.js`.

Referência: documentação de solução de problemas da Chrome Web Store indicada pela habilidade `extension-review`.
