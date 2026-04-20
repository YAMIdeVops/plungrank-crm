# Regras do Banco de Dados — CRM de Prospecção

## 1. Regras de integridade estrutural

### 1.1 Chaves primárias
- Cada tabela deve possuir uma chave primária única para identificar cada registro.
- Tabelas:
  - `leads.id_lead`
  - `tentativa_contato.id_tentativa`
  - `reuniao.id_reuniao`
  - `vendas.id_venda`
  - `servicos.id_servico`

### 1.2 Chaves estrangeiras
- Só pode ser registrada uma tentativa de contato para um lead que exista na tabela `leads`.
- Só pode ser registrada uma reunião para um lead que exista na tabela `leads`.
- Só pode ser registrada uma venda para um lead que exista na tabela `leads`.
- Um serviço só pode ser vendido se estiver cadastrado na tabela `servicos`.
- `id_reuniao` em `vendas` é opcional, mas, quando informado, deve existir na tabela `reuniao`.

## 2. Regras de obrigatoriedade dos campos

### 2.1 Campos obrigatórios não podem ser nulos
- Não pode haver campos obrigatórios com valor `NULL`.

### 2.2 Campos obrigatórios textuais não podem ser vazios
- Campos obrigatórios do tipo texto não podem conter string vazia (`''`).

### 2.3 Exceções permitidas
- `instagram` na tabela `leads` pode ser nulo.
- `id_reuniao` na tabela `vendas` pode ser nulo.

## 3. Regras de unicidade

### 3.1 Telefone único por lead
- Não pode haver o mesmo número de telefone cadastrado mais de uma vez na base.
- O telefone deve ser armazenado em formato padronizado antes da validação de unicidade.

### 3.2 Serviço único
- O nome do serviço deve ser único na tabela `servicos`.

## 4. Regras de datas

### 4.1 Tentativa de contato
- A data da tentativa de contato não pode ser menor que a data de cadastro do lead.

### 4.2 Reunião
- A data da reunião não pode ser menor que a data de cadastro do lead.

### 4.3 Venda
- A data da venda não pode ser menor que a data de cadastro do lead.

## 5. Regras de valores numéricos

### 5.1 Valor do serviço
- O campo `valor` da tabela `servicos` deve ser maior que zero.

### 5.2 Valor da venda
- O campo `valor_venda` da tabela `vendas` deve ser maior que zero.

## 6. Regras de domínio dos campos

### 6.1 Situação do lead
O campo `situacao` da tabela `leads` só pode aceitar os seguintes valores:
- `Novo`
- `Em prospecção`
- `Cliente`
- `Inativo`

### 6.2 Fonte do lead
O campo `fonte_lead` da tabela `leads` só pode aceitar os seguintes valores:
- `Google Maps`
- `Instagram`
- `Casa dos Dados`
- `Receita Federal`

### 6.3 Modalidade da tentativa de contato
O campo `modalidade` da tabela `tentativa_contato` só pode aceitar os seguintes valores:
- `Presencial`
- `Online`

### 6.4 Canal da tentativa de contato
O campo `canal` da tabela `tentativa_contato` só pode aceitar os seguintes valores:
- `Visita presencial`
- `Instagram`
- `WhatsApp`
- `Ligação`

### 6.5 Status da tentativa de contato
O campo `status` da tabela `tentativa_contato` só pode aceitar os seguintes valores:
- `Tentando Contato`
- `Em Contato`
- `Reunião Marcada`
- `Proposta Enviada`
- `Proposta Recusada`
- `Não tem interesse`
- `Venda realizada`

### 6.6 Status da reunião
O campo `status_reuniao` da tabela `reuniao` só pode aceitar os seguintes valores:
- `Realizada`
- `Não Compareceu`
- `Remarcada`
- `Agendada`

### 6.7 Origem do fechamento
O campo `origem_fechamento` da tabela `vendas` só pode aceitar os seguintes valores:
- `Visita presencial`
- `Instagram`
- `WhatsApp`
- `Ligação`

### 6.8 Estado
O campo `estado` da tabela `leads` deve aceitar apenas UFs válidas do Brasil.

## 9. Regra adicional
- Todo lead deve possuir o campo tem_site preenchido obrigatoriamente, sendo permitidos apenas os valores SIM ou NÃO, não sendo aceitos valores nulos, em branco ou diferentes desse domínio.
- Se o campo instagram não for preenchido, deverá ser usado como valor padrão "--"