# Correção da coleta de arquivos SAP da UC

Data: 17/09/2026. Versão de homologação: 3.7.15.

## Causa identificada

O arquivo que contém o enunciado nem sempre é anexo da tarefa `/mod/assign/view.php`. O exemplo enviado mostra um cartão independente `modtype_resource`, com `data-activityname="SAP 01"` e link `/mod/resource/view.php?id=336353`. A tarefa “Envio da SAP 01” tem outro CMID. A versão anterior procurava somente texto ou anexos da tarefa, portanto não baixava o recurso Arquivo da UC.

## Ajuste

Na preparação do pacote, a extensão lê as seções do curso e associa recursos Arquivo à tarefa somente quando ambos pertencem à mesma seção e o título da SAP corresponde após remover prefixos conhecidos como “Envio da”. Consulta o arquivo no Moodle, inclusive quando a página do recurso fornece um link `mod_resource/content`. A pasta `arquivos_sap_da_uc` fica dentro da pasta da atividade no ZIP, separada de `anexos_do_enunciado` e `envios_dos_alunos.zip`.

O manifesto e `dados_da_atividade.txt` indicam que o arquivo foi associado pelo nome e pela UC e requer conferência do tutor. Uma falha de download produz aviso e não transforma um arquivo ausente em enunciado confirmado. O limite individual de recurso é 25 MB; origem externa, sessão expirada e resposta HTML no lugar do arquivo são recusadas.

## Validação e limite

Os 88 testes automatizados passaram. O validador conferiu 25 referências e 66 arquivos. Os testes simulados cobrem o HTML fornecido, os dois locais conhecidos do enunciado, a montagem do ZIP completo com um PDF SAP e a recusa de redirecionamento para outro domínio. A versão precisa ser testada com sessão autenticada no curso em que ocorre o problema. Se o Moodle hospedar o material como Pasta ou em uma seção diferente, o pacote indicará a ausência para conferência manual.

Os créditos de Eurico Cirilo e Julio Alves continuam em `CREDITOS.md`.
