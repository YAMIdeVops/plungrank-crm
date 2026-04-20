import { ApiError } from "@/shared/api/http";

type RuleMessage = {
  match: string | RegExp;
  message: string;
};

const RULE_VIOLATION_MESSAGES: RuleMessage[] = [
  { match: "Campo obrigatório ausente: nome_contato.", message: "Informe o nome do contato." },
  { match: "Campo obrigatório vazio: nome_contato.", message: "O nome do contato não pode ficar em branco." },
  { match: "Campo obrigatório ausente: nome_empresa.", message: "Informe o nome da empresa." },
  { match: "Campo obrigatório vazio: nome_empresa.", message: "O nome da empresa não pode ficar em branco." },
  { match: "Campo obrigatório ausente: telefone.", message: "Informe o telefone do lead." },
  { match: "Campo obrigatório vazio: telefone.", message: "O telefone não pode ficar em branco." },
  { match: "Campo obrigatório ausente: nicho.", message: "Informe o nicho do lead." },
  { match: "Campo obrigatório vazio: nicho.", message: "O nicho não pode ficar em branco." },
  { match: "Campo obrigatório ausente: fonte_lead.", message: "Selecione a origem do lead." },
  { match: "Campo obrigatório vazio: fonte_lead.", message: "A origem do lead não pode ficar em branco." },
  { match: "Campo obrigatório ausente: estado.", message: "Informe a UF do lead." },
  { match: "Campo obrigatório vazio: estado.", message: "A UF do lead não pode ficar em branco." },
  { match: "Campo obrigatório ausente: tem_site.", message: "Informe se o lead possui site." },
  { match: "Campo obrigatório vazio: tem_site.", message: "O campo 'tem site' não pode ficar em branco." },
  { match: "Campo obrigatório ausente: data_cadastro.", message: "Informe a data de cadastro do lead." },
  { match: "Campo obrigatório vazio: data_cadastro.", message: "A data de cadastro do lead não pode ficar em branco." },

  { match: "Campo obrigatório ausente: id_lead.", message: "Selecione o lead relacionado." },
  { match: "Campo obrigatório vazio: id_lead.", message: "Selecione o lead relacionado." },
  { match: "Campo obrigatório ausente: data_tentativa.", message: "Informe a data da tentativa." },
  { match: "Campo obrigatório vazio: data_tentativa.", message: "A data da tentativa não pode ficar em branco." },
  { match: "Campo obrigatório ausente: modalidade.", message: "Selecione a modalidade da tentativa." },
  { match: "Campo obrigatório vazio: modalidade.", message: "A modalidade da tentativa não pode ficar em branco." },
  { match: "Campo obrigatório ausente: canal.", message: "Selecione o canal da tentativa." },
  { match: "Campo obrigatório vazio: canal.", message: "O canal da tentativa não pode ficar em branco." },
  { match: "Campo obrigatório ausente: status.", message: "Selecione o status." },
  { match: "Campo obrigatório vazio: status.", message: "O status não pode ficar em branco." },

  { match: "Campo obrigatório ausente: data_reuniao.", message: "Informe a data e hora da reunião." },
  { match: "Campo obrigatório vazio: data_reuniao.", message: "A data e hora da reunião não podem ficar em branco." },
  { match: "Campo obrigatório ausente: status_reuniao.", message: "Selecione o status da reunião." },
  { match: "Campo obrigatório vazio: status_reuniao.", message: "O status da reunião não pode ficar em branco." },

  { match: "Campo obrigatório ausente: id_servico.", message: "Selecione o serviço." },
  { match: "Campo obrigatório vazio: id_servico.", message: "Selecione o serviço." },
  { match: "Campo obrigatório ausente: origem_fechamento.", message: "Selecione a origem do fechamento." },
  { match: "Campo obrigatório vazio: origem_fechamento.", message: "A origem do fechamento não pode ficar em branco." },
  { match: "Campo obrigatório ausente: valor_venda.", message: "Informe o valor da venda." },
  { match: "Campo obrigatório vazio: valor_venda.", message: "O valor da venda não pode ficar em branco." },
  { match: "Campo obrigatório ausente: data_venda.", message: "Informe a data da venda." },
  { match: "Campo obrigatório vazio: data_venda.", message: "A data da venda não pode ficar em branco." },

  { match: "Campo obrigatório ausente: nome_servico.", message: "Informe o nome do serviço." },
  { match: "Campo obrigatório vazio: nome_servico.", message: "O nome do serviço não pode ficar em branco." },
  { match: "Campo obrigatório ausente: valor.", message: "Informe o valor do serviço." },
  { match: "Campo obrigatório vazio: valor.", message: "O valor do serviço não pode ficar em branco." },

  { match: "Campo obrigatório ausente: nome.", message: "Informe o nome do usuário." },
  { match: "Campo obrigatório vazio: nome.", message: "O nome do usuário não pode ficar em branco." },
  { match: "Campo obrigatório ausente: email.", message: "Informe o e-mail do usuário." },
  { match: "Campo obrigatório vazio: email.", message: "O e-mail não pode ficar em branco." },
  { match: "Campo obrigatório ausente: password.", message: "Informe a senha do usuário." },
  { match: "Campo obrigatório vazio: password.", message: "A senha não pode ficar em branco." },
  { match: "Campo obrigatório ausente: perfil.", message: "Selecione o perfil de acesso." },
  { match: "Campo obrigatório vazio: perfil.", message: "O perfil de acesso não pode ficar em branco." },
  { match: "Campo obrigatório ausente: status.", message: "Selecione o status do usuário." },
  { match: "Campo obrigatório vazio: status.", message: "O status do usuário não pode ficar em branco." },

  { match: "Telefone deve conter 11 dígitos com DDD.", message: "Informe um telefone com 11 dígitos, incluindo o DDD." },
  { match: "Telefone deve conter 11 digitos com DDD.", message: "Informe um telefone com 11 dígitos, incluindo o DDD." },
  { match: "Telefone já cadastrado.", message: "Este número já está cadastrado na base. Use outro telefone ou edite o lead existente." },
  { match: "UF inválida.", message: "Informe uma UF brasileira válida, como CE, SP ou RJ." },
  { match: "tem_site deve ser SIM ou NÃO.", message: "O campo 'tem site' aceita apenas SIM ou NÃO." },
  { match: "Data inválida para data_cadastro. Use YYYY-MM-DD.", message: "A data de cadastro deve estar no formato YYYY-MM-DD." },
  { match: "data_cadastro não pode estar no futuro.", message: "A data de cadastro do lead não pode ser futura." },
  { match: "Data de cadastro do lead nao pode ser alterada.", message: "A data de cadastro do lead não pode ser alterada depois do registro." },
  { match: "Valor inválido para fonte_lead.", message: "Selecione uma origem permitida: Google Maps, Instagram, Casa dos Dados ou Receita Federal." },
  { match: "Valor inválido para situacao.", message: "Selecione uma situação válida para o lead." },
  { match: "Lead não pode ser criado manualmente como Cliente.", message: "Um lead novo não pode começar como Cliente." },
  { match: "Lead com venda registrada não pode voltar para essa situação.", message: "Este lead já tem venda registrada e não pode voltar para Novo ou Em prospecção." },
  { match: "Lead só pode virar Cliente quando existir uma venda.", message: "Só é possível marcar o lead como Cliente quando houver uma venda registrada." },
  { match: "Lead só pode ser excluído quando estiver Inativo.", message: "Antes de excluir um lead, altere a situação dele para Inativo." },

  { match: "Data inválida para data_tentativa. Use YYYY-MM-DD.", message: "A data da tentativa deve estar no formato YYYY-MM-DD." },
  { match: "data_tentativa não pode estar no futuro.", message: "A data da tentativa não pode ser futura." },
  { match: "Valor inválido para modalidade.", message: "Selecione uma modalidade válida: Presencial ou Online." },
  { match: "Valor inválido para canal.", message: "Selecione um canal válido para a tentativa." },
  { match: "Valor inválido para status.", message: "Selecione um status válido." },
  { match: "Canal incompatível com a modalidade informada.", message: "O canal escolhido não combina com a modalidade. WhatsApp, Instagram e Ligação exigem modalidade Online." },
  { match: "Data da tentativa não pode ser menor que a data de cadastro do lead.", message: "A tentativa precisa acontecer na mesma data do cadastro ou depois dela." },
  { match: "Lead já possui tentativa finalizada como venda realizada.", message: "Este lead já possui uma tentativa finalizada como venda realizada." },
  { match: "Data da tentativa não pode ser alterada.", message: "A data da tentativa não pode ser editada depois do registro." },
  { match: "Canal da tentativa não pode ser alterado.", message: "O canal da tentativa não pode ser editado depois do registro." },
  { match: "Modalidade da tentativa não pode ser alterada.", message: "A modalidade da tentativa não pode ser editada depois do registro." },
  { match: "Apenas atualização de status é suportada.", message: "Depois de registrar a tentativa, só o status pode ser alterado." },
  { match: "Tentativa com venda realizada não pode ser alterada.", message: "Uma tentativa marcada como venda realizada não pode mais ser alterada." },
  { match: "Crie uma nova tentativa antes de marcar venda realizada.", message: "Depois de Proposta Recusada ou Não tem interesse, registre uma nova tentativa antes de concluir como venda." },
  { match: "Transição de status da tentativa não é permitida.", message: "Essa mudança de status quebra o fluxo comercial permitido." },

  { match: "Data/hora inválida para data_reuniao. Use ISO 8601.", message: "A data da reunião está inválida. Escolha uma data e hora válidas." },
  { match: "Valor inválido para status_reuniao.", message: "Selecione um status válido para a reunião." },
  { match: "Valor invalido para status_reuniao.", message: "Selecione um status válido para a reunião." },
  { match: "Só é possível registrar reunião após existir tentativa de contato.", message: "Registre pelo menos uma tentativa de contato antes de criar uma reunião." },
  { match: "Data da reunião não pode ser menor que a data de cadastro do lead.", message: "A reunião precisa acontecer na mesma data do cadastro do lead ou depois dela." },
  { match: "Status de reunião finalizada não pode ser alterado.", message: "Reuniões finalizadas não permitem alteração de status." },
  { match: "Data de reunião finalizada não pode ser alterada.", message: "A data de uma reunião finalizada não pode ser alterada." },
  { match: "Reunião realizada não pode retroceder.", message: "Uma reunião marcada como Realizada não pode voltar para Remarcada ou Não Compareceu." },
  { match: "Crie uma nova reunião em vez de alterar para Realizada.", message: "Se a reunião foi marcada como Não Compareceu, crie uma nova reunião em vez de mudar esse registro para Realizada." },

  { match: "Data inválida para data_venda. Use YYYY-MM-DD.", message: "A data da venda deve estar no formato YYYY-MM-DD." },
  { match: "Data invalida para data_venda. Use YYYY-MM-DD.", message: "A data da venda deve estar no formato YYYY-MM-DD." },
  { match: "data_venda não pode estar no futuro.", message: "A data da venda não pode ser futura." },
  { match: "data_venda nao pode estar no futuro.", message: "A data da venda não pode ser futura." },
  { match: "valor_venda deve ser numérico.", message: "Informe um valor numérico válido para a venda." },
  { match: "valor_venda deve ser numerico.", message: "Informe um valor numérico válido para a venda." },
  { match: "valor_venda deve ser maior que zero.", message: "O valor da venda deve ser maior que zero." },
  { match: "Valor inválido para origem_fechamento.", message: "Selecione uma origem de fechamento válida." },
  { match: "Só é possível registrar venda após existir tentativa de contato.", message: "Registre pelo menos uma tentativa de contato antes de lançar a venda." },
  { match: "So e possivel registrar venda apos existir tentativa de contato.", message: "Registre pelo menos uma tentativa de contato antes de lançar a venda." },
  { match: "Serviço informado não existe.", message: "O serviço selecionado não existe mais no catálogo." },
  { match: "Servico informado nao existe.", message: "O serviço selecionado não existe mais no catálogo." },
  { match: "Data da venda não pode ser menor que a data de cadastro do lead.", message: "A venda não pode ter data anterior ao cadastro do lead." },
  { match: "Data da venda nao pode ser menor que a data de cadastro do lead.", message: "A venda não pode ter data anterior ao cadastro do lead." },
  { match: "Reunião informada não existe.", message: "A reunião informada não foi encontrada." },
  { match: "Reuniao informada nao existe.", message: "A reunião informada não foi encontrada." },
  { match: "Reunião informada deve pertencer ao mesmo lead da venda.", message: "A reunião vinculada precisa pertencer ao mesmo lead da venda." },
  { match: "Reuniao informada deve pertencer ao mesmo lead da venda.", message: "A reunião vinculada precisa pertencer ao mesmo lead da venda." },
  { match: "Reunioes futuras devem permanecer como Agendada.", message: "Reuniões com data futura só podem ficar com status Agendada." },
  { match: "O lead da venda nao pode ser alterado.", message: "O lead da venda não pode ser alterado depois do registro." },
  { match: "O servico da venda nao pode ser alterado.", message: "O serviço da venda não pode ser alterado depois do registro." },
  { match: "A origem da venda nao pode ser alterada.", message: "A origem da venda não pode ser alterada depois do registro." },
  { match: "O valor da venda nao pode ser alterado.", message: "O valor da venda não pode ser alterado depois do registro." },
  { match: "A data da venda nao pode ser alterada.", message: "A data da venda não pode ser alterada depois do registro." },
  { match: "A reuniao vinculada da venda nao pode ser alterada.", message: "A reunião vinculada da venda não pode ser alterada depois do registro." },
  { match: "Nenhuma alteracao permitida para vendas registradas.", message: "Vendas registradas não permitem edição." },

  { match: "valor deve ser numérico.", message: "Informe um valor numérico válido para o serviço." },
  { match: "valor deve ser maior que zero.", message: "O valor do serviço deve ser maior que zero." },
  { match: "Nome do serviço já cadastrado.", message: "Já existe um serviço com esse nome no catálogo." },
  { match: "Serviço já vendido não pode ser excluído.", message: "Este serviço já foi usado em uma venda e não pode ser excluído." },
  {
    match: "Nome de servico vinculado a vendas nao pode ser alterado.",
    message: "O nome de um serviço já usado em vendas não pode ser alterado. Cadastre um novo serviço com o nome desejado.",
  },

  { match: "E-mail inválido.", message: "Digite um e-mail válido para continuar." },
  { match: "Senha não pode ser vazia.", message: "A senha não pode ficar em branco." },
  { match: "Senha deve ter pelo menos 8 caracteres.", message: "A senha deve ter no mínimo 8 caracteres." },
  { match: "Valor inválido para perfil.", message: "Selecione um perfil válido. Os perfis permitidos são ADMIN e PADRAO." },
  { match: "Valor inválido para status.", message: "Selecione um status válido. Os valores permitidos são ATIVO e INATIVO." },
  { match: "E-mail já está em uso.", message: "Este e-mail já está vinculado a outro usuário." },
  { match: "Usuário inativo não pode acessar o sistema.", message: "Seu usuário está inativo. Solicite reativação a um administrador." },
  { match: "Usuário inativo.", message: "Seu usuário está inativo. Solicite reativação a um administrador." },
  { match: "Credenciais inválidas.", message: "E-mail ou senha incorretos." },
  { match: "Usuário não encontrado.", message: "Não encontramos um usuário com esse e-mail." },
  { match: "Acesso negado para este perfil.", message: "Seu perfil não tem permissão para executar essa ação." },
  { match: "Token de acesso não informado.", message: "Sua sessão não foi encontrada. Faça login novamente." },
  { match: "Token inválido ou expirado.", message: "Sua sessão expirou. Entre novamente para continuar." },
  { match: "Confirme a exclusao em cascata antes de continuar.", message: "Confirme a exclusão em cascata antes de continuar." },
  { match: "Voce nao pode excluir o proprio usuario.", message: "Você não pode excluir o próprio usuário." },

  { match: "Nenhuma alteração informada.", message: "Nenhuma alteração foi enviada." },

  { match: /Registro não encontrado em leads\./i, message: "O lead informado não foi encontrado." },
  { match: /Registro não encontrado em tentativa_contato\./i, message: "A tentativa informada não foi encontrada." },
  { match: /Registro não encontrado em reuniao\./i, message: "A reunião informada não foi encontrada." },
  { match: /Registro não encontrado em vendas\./i, message: "A venda informada não foi encontrada." },
  { match: /Registro não encontrado em servicos\./i, message: "O serviço informado não foi encontrado." },
  { match: /Registro não encontrado em usuarios\./i, message: "O usuário informado não foi encontrado." },

  { match: /duplicate key value violates unique constraint .*telefone/i, message: "Este telefone já está cadastrado na base." },
  { match: /duplicate key value violates unique constraint .*email/i, message: "Este e-mail já está em uso por outro usuário." },
  { match: /duplicate key value violates unique constraint .*serv/i, message: "Já existe um serviço com esse nome." },
  { match: /violates foreign key constraint/i, message: "O registro relacionado não foi encontrado. Revise os dados informados." },
  { match: /violates not-null constraint/i, message: "Há campos obrigatórios sem preenchimento. Revise o formulário." },
  { match: /violates check constraint/i, message: "Um dos valores informados não atende às regras do sistema. Revise os campos e tente novamente." },
];

function normalizeRuleText(value: string) {
  return value
    .replace(/Ã¡/g, "á")
    .replace(/Ã /g, "à")
    .replace(/Ã¢/g, "â")
    .replace(/Ã£/g, "ã")
    .replace(/Ã§/g, "ç")
    .replace(/Ã©/g, "é")
    .replace(/Ãª/g, "ê")
    .replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó")
    .replace(/Ã´/g, "ô")
    .replace(/Ãµ/g, "õ")
    .replace(/Ãº/g, "ú")
    .replace(/Ã/g, "Á")
    .replace(/Ã‡/g, "Ç")
    .replace(/Ã‰/g, "É")
    .replace(/Ã“/g, "Ó")
    .replace(/Ãš/g, "Ú")
    .replace(/Â/g, "")
    .replace(/â€¢/g, "•");
}

function resolveMappedMessage(rawMessage: string) {
  const normalizedRawMessage = normalizeRuleText(rawMessage);
  const directMessageMap: Record<string, string> = {
    "Lead so pode ser criado como Em prospeccao apos existir tentativa de contato.":
      "Este lead nao pode ser salvo com situacao Em prospeccao, porque ainda nao existe nenhuma tentativa de contato vinculada a ele.",
    "Lead so pode ser criado como Cliente apos existir venda registrada.":
      "Este lead nao pode ser salvo com situacao Cliente, porque ainda nao existe nenhuma venda vinculada a ele.",
    "Lead so pode virar Em prospeccao quando existir tentativa de contato.":
      "Este lead nao pode ficar com situacao Em prospeccao, porque ainda nao existe nenhuma tentativa de contato vinculada a ele.",
    "Lead inativo nao pode receber novos registros de tentativa, reuniao ou venda.":
      "Este lead esta Inativo e nao pode receber novas tentativas, reunioes ou vendas.",
    "Venda registrada so pode ser excluida quando o lead estiver Inativo.":
      "Esta venda só pode ser excluída quando o lead vinculado estiver com status Inativo.",
    "Tentativa registrada so pode ser excluida quando o lead estiver Inativo.":
      "Esta tentativa só pode ser excluída quando o lead vinculado estiver com status Inativo.",
    "Reuniao registrada so pode ser excluida quando o lead estiver Inativo.":
      "Esta reunião só pode ser excluída quando o lead vinculado estiver com status Inativo.",
    "Servico vendido so pode ser excluido quando todos os leads vinculados estiverem Inativos.":
      "Este serviço só pode ser excluído quando todas as vendas vinculadas pertencerem a leads Inativos.",
    "Valor invalido para modalidade.":
      "Selecione uma modalidade valida: Presencial ou Online.",
    "Valor invalido para canal.":
      "Selecione um canal valido para a tentativa.",
    "Valor invalido para status.":
      "Selecione um status valido para a tentativa.",
  };

  if (directMessageMap[normalizedRawMessage]) {
    return directMessageMap[normalizedRawMessage];
  }

  if (/Lead so pode ser criado como Em prospeccao apos existir tentativa de contato\./i.test(normalizedRawMessage)) {
    return "Este lead nao pode ser salvo com situacao Em prospeccao, porque ainda nao existe nenhuma tentativa de contato vinculada a ele.";
  }

  if (/Lead so pode virar Em prospeccao quando existir tentativa de contato\./i.test(normalizedRawMessage)) {
    return "Este lead nao pode ficar com situacao Em prospeccao, porque ainda nao existe nenhuma tentativa de contato vinculada a ele.";
  }

  if (/Lead so pode ser criado como Cliente apos existir venda registrada\./i.test(normalizedRawMessage)) {
    return "Este lead nao pode ser salvo com situacao Cliente, porque ainda nao existe nenhuma venda vinculada a ele.";
  }

  for (const rule of RULE_VIOLATION_MESSAGES) {
    if (typeof rule.match === "string" && normalizedRawMessage === rule.match) {
      return rule.message;
    }
    if (rule.match instanceof RegExp && rule.match.test(normalizedRawMessage)) {
      return rule.message;
    }
  }
  return null;
}

export function getFriendlyErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const rawMessage = error.message || error.details || "";
    return (
      resolveMappedMessage(rawMessage) ||
      (error.details ? resolveMappedMessage(error.details) : null) ||
      rawMessage ||
      fallback
    );
  }

  if (error instanceof Error) {
    return resolveMappedMessage(error.message) || error.message || fallback;
  }

  return fallback;
}
