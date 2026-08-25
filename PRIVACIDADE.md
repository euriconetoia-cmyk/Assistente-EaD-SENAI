# Privacidade e tratamento local de dados

Versão: 3.6.2

## Finalidade

O Assistente EaD SENAI organiza informações já disponíveis ao tutor na sessão autenticada do Moodle para apoiar acompanhamento, correção, comunicação e fechamento de unidades curriculares.

## Dados processados

A extensão pode processar nomes, e-mails, identificadores internos do Moodle, acesso recente, entregas, arquivos vinculados, notas, feedbacks e registros de acompanhamento. Senhas, cookies e tokens de autenticação não são coletados nem exportados pela extensão.

## Armazenamento e retenção

Retratos, notas separadas, configurações, checklist e histórico ficam no `chrome.storage.local`. A retenção padrão é de 90 dias e pode ser ajustada entre 7 e 365 dias. Registros expirados são removidos na inicialização e ao salvar configurações. O usuário pode limpar os dados do curso no painel.

O conteúdo de mensagens não é armazenado por padrão. Quando essa opção permanece desativada, o histórico registra apenas que uma mensagem foi preparada.

O estado temporário de um lote, incluindo o plano de conferência, fica em `chrome.storage.session` somente para permitir retomada segura após suspensão do service worker e é removido ao concluir o processo. O resultado detalhado da conferência permanece no modal até seu fechamento e pode ser baixado pelo tutor, sem persistência automática adicional.

O Histórico local recebe somente um resumo quantitativo do lote, sem nomes, notas ou feedbacks dos estudantes. Esse resumo segue o mesmo prazo de retenção configurado para os demais registros do curso.

## Comunicação e domínios

A extensão limita suas consultas automáticas a `ead.senai.br` e `ead.fieg.com.br` e não contém código remoto. Arquivos e prompts de correção são preparados localmente. Quando o tutor escolhe explicitamente abrir o WhatsApp, a extensão abre `wa.me` com o telefone e a mensagem preparados na URL; esses dados passam então a ser tratados pelo WhatsApp conforme os termos do serviço. Nenhuma mensagem é enviada sem essa ação do tutor.

## Controles do usuário

- habilitar ou desabilitar armazenamento do conteúdo das mensagens;
- definir retenção local;
- manter varreduras automáticas desativadas;
- exportar os próprios relatórios;
- remover todos os dados locais do curso com confirmação em duas etapas.

## Responsabilidade de uso

Notas e feedbacks são dados acadêmicos. O tutor deve revisar a prévia e usar inicialmente um ambiente de homologação. Resultados sem confirmação verificável do Moodle são marcados para revisão manual e não são tratados como sucesso.
