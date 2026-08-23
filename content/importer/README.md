# Módulo contextual Importar notas

Este diretório contém a integração operacional de importação de notas com o Assistente EaD SENAI.

## Páginas ativadas

course/view.php?id= pode mostrar o resumo e as contagens de pendências da UC quando a varredura automática estiver habilitada pelo tutor.

course/index.php?categoryid= pode mostrar indicadores por UC quando a varredura de categorias estiver habilitada. Essa opção fica desativada por padrão.

mod/assign/view.php?action=grading recebe o botão **Importar** e o modal de importação quando a Avaliação rápida está ativa.

## Regras de operação

O importador aceita CSV, TSV, TXT e XLSX. O lote é bloqueado antes de qualquer preenchimento quando houver erros de identidade, duplicidade, nota inválida, valor fora da faixa ou coluna Moodle indisponível. O cabeçalho student_id é preferido para identificar o aluno.

Arquivos são limitados a 5 MB, 5.000 registros e 50.000 células; arquivos XLSX também têm limite de 12 MB após descompactação.

A confirmação em duas etapas apenas preenche os campos da página atual. O salvamento continua manual no Moodle. No fluxo automático iniciado pelo painel, o salvamento ocorre somente após validação completa do lote e confirmação específica do tutor.

## Segurança

A extensão usa a sessão autenticada já existente somente para leitura e preenchimento local da página. Não captura nem transmite credenciais, cookies ou tokens Moodle. Não envia arquivos de correção para serviços externos.
