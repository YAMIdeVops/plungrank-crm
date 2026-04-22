export const LEAD_SITUATIONS = new Set(["Novo", "Em prospecção", "Cliente", "Inativo"]);
export const LEAD_SOURCES = new Set(["Google Maps", "Instagram", "Casa dos Dados", "Receita Federal"]);

export const ATTEMPT_MODALITIES = new Set(["Presencial", "Online"]);
export const ATTEMPT_CHANNELS = new Set(["Visita presencial", "Instagram", "WhatsApp", "Ligação"]);
export const ATTEMPT_STATUS = new Set([
  "Tentando Contato",
  "Em Contato",
  "Reunião Marcada",
  "Proposta Enviada",
  "Proposta Recusada",
  "Não tem interesse",
  "Venda realizada",
]);

export const MEETING_STATUS = new Set(["Agendada", "Realizada", "Não Compareceu", "Remarcada"]);
export const FINAL_MEETING_STATUS = new Set(["Realizada", "Não Compareceu", "Remarcada"]);

export const SALES_ORIGINS = new Set(["Visita presencial", "Instagram", "WhatsApp", "Ligação"]);

export const USER_PROFILES = new Set(["ADMIN", "PADRAO"]);
export const USER_STATUS = new Set(["ACTIVE", "INACTIVE", "ATIVO", "INATIVO"]);

export const BRAZILIAN_STATES = new Set([
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
]);

export const ATTEMPT_CHANNEL_MODALITY = new Map<string, string>([
  ["Visita presencial", "Presencial"],
  ["Instagram", "Online"],
  ["WhatsApp", "Online"],
  ["Ligação", "Online"],
]);

export const ATTEMPT_STATUS_FLOW = new Map<string, Set<string>>([
  [
    "Tentando Contato",
    new Set(["Em Contato", "Reunião Marcada", "Proposta Enviada", "Proposta Recusada", "Não tem interesse", "Venda realizada"]),
  ],
  ["Em Contato", new Set(["Reunião Marcada", "Proposta Enviada", "Proposta Recusada", "Não tem interesse", "Venda realizada"])],
  ["Reunião Marcada", new Set(["Proposta Enviada", "Proposta Recusada", "Não tem interesse", "Venda realizada"])],
  ["Proposta Enviada", new Set(["Proposta Recusada", "Venda realizada", "Não tem interesse"])],
  ["Proposta Recusada", new Set()],
  ["Não tem interesse", new Set()],
  ["Venda realizada", new Set()],
]);
