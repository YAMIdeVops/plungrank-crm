# Regras de Negócio do Back-end — CRM de Prospecção

## 1. Consistência entre venda, reunião e lead
1. Quando `id_reuniao` for informado em uma venda, a reunião deve pertencer ao mesmo `id_lead` da venda.

## 2. Padronização de dados antes de salvar
2. O telefone deve ser padronizado automaticamente antes de ser salvo.
   A padronização do telefone deve remover máscara, espaços e caracteres especiais antes da validação de duplicidade e do salvamento(O número deve ficar no formato (99) 99999-9999) e remover zeros excedentes à esquerda quando o número vier “inflado”.

4. Campos de texto devem ser padronizados automaticamente antes de salvar.
   A padronização de texto deve, no mínimo:
      - remover espaços no início e no fim;
      - reduzir espaços duplos ou excedentes;
      - evitar variações desnecessárias de preenchimento para um mesmo valor lógico.

## 3. Situação inicial e atualização automática da situação do lead
- O lead não pode ser cadastrado com a situação "Em prospecção" sendo que ainda não houve nenhum  registro tentativas de contato ligado a ele
- O lead não pode ser cadastrado com a situação "Cliente" sendo que ainda não houve nenhum  registro de venda ligado a ele
- Se um lead estiver com a Situação Inativa, não poderá ser adicionado nenhum registro(vendas, reunião...) a ele.
- A data de cadastro do lead não pode ser alterada
6. Ao cadastrar um novo lead, o sistema deve definir automaticamente a situação inicial como `Novo`.
8. Quando for registrada a primeira tentativa de contato, o lead deve sair de `Novo` e passar automaticamente para `Em prospecção`.
9. Quando uma venda for registrada, o lead deve ser atualizado automaticamente para `Cliente`.

## 4. Controle de transições da situação do lead
11. O sistema deve impedir que um lead com venda registrada volte para uma situação incompatível, como `Novo` ou `Em prospecção`.
12. O sistema deve impedir que a situação de um lead seja alterada manualmente para `Cliente` se não existir nenhuma venda registrada para ele.
13. O sistema pode permitir que um lead com venda registrada seja alterado para `Inativo`.


## 5. Regras de coerência entre canal e modalidade
15. O canal da tentativa de contato deve ser compatível com a modalidade.
16. As combinações válidas são:
   - `Visita presencial` → `Presencial`
   - `Instagram` → `Online`
   - `WhatsApp` → `Online`
   - `Ligação` → `Online`

## 6. Regras de coerência entre status e evento real

- Só pode ser registrada uma venda se o lead tiver pelo menos uma tentativa de contato
- Só pode ser registrado uma reunião se o lead tiver pelo menos uma tentativa de contato


## 7. Regras sobre datas futuras
20. O sistema deve bloquear datas futuras para:
   - `data_cadastro`
   - `data_tentativa`
   - `data_venda`
21. O sistema deve permitir data futura para `data_reuniao`, pois ela pode representar um agendamento.

## 8. Regras de exclusão de lead
22. Um lead só pode ser excluído se estiver com a situação `Inativo`.
23. Mesmo estando `Inativo`, o lead pode ser excluído mesmo que já possua histórico vinculado.
24. Quando um lead for excluído, todo o histórico relacionado dele também deve ser excluído em cascata:
   - tentativas de contato
   - reuniões
   - vendas
25. A exclusão do lead deve remover também todo o histórico comercial vinculado, não apenas o cadastro principal.

## 9. Regras de exclusão de outros registros
26. O sistema deve impedir que uma venda já registrada seja excluída(essa regra só pode ser quebrada se o usuário for administrador e o status do lead estiver inativo)
27. O sistema deve impedir que um serviço que já foi vendido seja excluído(essa regra só pode ser quebrada se o usuário for administrador e o status do lead estiver inativo)
28. O sistema deve impedir que uma tentativa de contato já registrada seja excluída(essa regra só pode ser quebrada se o usuário for administrador e o status do lead estiver inativo)
29. O sistema deve impedir que uma reunião já registrada seja excluída(essa regra só pode ser quebrada se o usuário for administrador e o status do lead estiver inativo)

## 10. Regras de duplicidade complementar
30. Quando o campo Instagram estiver preenchido, o sistema deve verificar duplicidade e emitir alerta, mas não bloquear o cadastro automaticamente.


## 11. Regras de tentativa de contato
34. O sistema deve impedir que uma tentativa marcada como `Proposta Recusada` ou `Não tem interesse` seja alterada depois para `Venda realizada` sem que exista uma nova tentativa de contato.
35. O sistema deve impedir que uma tentativa marcada como `Venda realizada` tenha o status alterado depois.
36. O sistema deve impedir que a data de uma tentativa de contato já registrada seja alterada depois.


## 12. Regras de reunião
38. O sistema deve impedir que uma reunião marcada como `Realizada` seja alterada depois para `Remarcada` ou `Não Compareceu`.
39. O sistema deve impedir que uma reunião marcada como `Não Compareceu` seja alterada depois para `Realizada` sem que uma nova reunião seja criada.
40. Quando uma reunião for marcada como `Remarcada`, o sistema deve notificar o usuário a criar marcar outra reunião para aquele lead
41. O sistema deve impedir que a data da reunião seja alterada depois que ela tiver status final:
   - `Realizada`
   - `Não Compareceu`
   - `Remarcada`
42. A data da reunião pode ser alterada apenas enquanto a reunião ainda estiver em aberto ou agendada.
43. O Status da reunião pode ser alterado se estiver `Agendada`

## 13. Regras de venda
44. O sistema deve impedir que o `id_lead` de uma venda já registrada seja alterado depois.
45. O sistema deve impedir que o `id_servico` de uma venda já registrada seja alterado depois.
46. O sistema deve impedir que a `origem_fechamento` de uma venda já registrada seja alterada depois.
47. O sistema deve impedir que o `valor_venda` de uma venda já registrada seja alterado depois.
48. O sistema deve impedir que a `data_venda` de uma venda já registrada seja alterada depois.
49. O sistema deve impedir que o `id_reuniao` vinculado a uma venda já registrada seja alterado depois.

## 14. Regras sobre serviços
- Um serviço que está vinculado a vendas não pode ter o nome nem o valor alterado

## Gerenciamento de usuário:
- Autenticação (Login)
   O sistema deve autenticar o usuário utilizando:
      email
      senha(A senha deve ter no mínimo 8 caracteres)
      O email deve ser padronizado antes da busca:
      trim()
      lowercase

- O sistema deve buscar o usuário pelo email.
- O sistema deve verificar se o usuário existe.
- O sistema deve verificar se status_usuario = 'ATIVO'.
- O sistema deve comparar a senha informada com o senha_hash.
- O sistema deve negar acesso quando:
   usuário não existir
   senha estiver incorreta
   usuário estiver INATIVO
- Em qualquer falha, deve retornar mensagem genérica:
   “Credenciais inválidas”



- O sistema deve controlar acesso baseado no campo perfil.
   Apenas usuários com perfil ADMIN podem acessar:
   painel administrativo
   gerenciamento de usuários
   Usuários com perfil PADRAO não podem acessar rotas administrativas.
- O back-end deve validar o perfil em todas as rotas protegidas.

- O sistema deve validar os dados antes de criar usuário:
   nome obrigatório
   email obrigatório
   senha obrigatória
- O email deve ser padronizado antes da validação.
- O sistema deve verificar se o email já existe.
- O sistema deve bloquear cadastro duplicado.
- A senha deve ser transformada em hash antes de salvar(removendo os espaços se tiver).
- O sistema não deve armazenar senha em texto puro.

- O sistema deve permitir atualizar:
   nome
   email
   senha
- Ao atualizar email:
   padronizar
   validar duplicidade
Ao atualizar senha:
   validar não vazia
   gerar novo hash
   O sistema deve atualizar atualizado_em após qualquer alteração.



- O sistema deve permitir alterar status_usuario.
   Quando status_usuario = 'INATIVO':
   o acesso deve ser bloqueado imediatamente
   Usuários inativos não podem autenticar.


## IMPORTANTE
- Usuários de perfil ADMIN(EXCEÇÃO) podem:
   Ter a opção de editar registros e lançamentos de todas as tabelas
   Cadastrar novos usuários e manusear os níveis de acesso
   Apagar qualquer registror na base
   Editar perfil de outros usuário(Que sejam de perfil PADRAO)

## IMPORTANTE
Se o Admin apagar qualquer registro deverá ser apresentado uma mensagem informando sobre os riscos