# Regras do Banco de Dados — CRM de Prospecção

- O campo nome_usuario é obrigatório:
    não pode ser NULL
    não pode ser string vazia ('')

- O campo email é obrigatório:
    não pode ser NULL
    não pode ser string vazia ('')

- O campo senha_hash é obrigatório:
    não pode ser NULL
    não pode ser string vazia ('')

-  O campo email deve ser único na base

- O campo perfil é obrigatório

- perfil só pode aceitar os valores:
    ADMIN
    PADRAO

- O campo status_usuario é obrigatório

- Status_usuario só pode aceitar os valores:
    ATIVO
    INATIVO

- Os campos textuais não podem conter apenas espaços:
    nome_usuario
    email
    senha_hash
    perfil
    status_usuario

- O campo email deve respeitar um formato válido
    validação via regex no banco

- O campo criado_em deve ser preenchido automaticamente com a data atual
    O campo atualizado_em deve ser preenchido automaticamente com a data atual
    O campo atualizado_em deve ser atualizado a cada modificação do registro (via trigger)

- Antes de inserir ou atualizar, o banco deve:
    aplicar trim() em todos os campos textuais
    converter email para minúsculo
    converter perfil para maiúsculo
    converter status_usuario para maiúsculo