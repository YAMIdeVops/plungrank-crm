LEAD_SITUATIONS = {"Novo", "Em prospecção", "Cliente", "Inativo"}
LEAD_SOURCES = {"Google Maps", "Instagram", "Casa dos Dados", "Receita Federal"}

ATTEMPT_MODALITIES = {"Presencial", "Online"}
ATTEMPT_CHANNELS = {"Visita presencial", "Instagram", "WhatsApp", "Ligação"}
ATTEMPT_STATUS = {
    "Tentando Contato",
    "Em Contato",
    "Reunião Marcada",
    "Proposta Enviada",
    "Proposta Recusada",
    "Não tem interesse",
    "Venda realizada",
}

MEETING_STATUS = {"Agendada", "Realizada", "Não Compareceu", "Remarcada"}
FINAL_MEETING_STATUS = {"Realizada", "Não Compareceu", "Remarcada"}

SALES_ORIGINS = {"Visita presencial", "Instagram", "WhatsApp", "Ligação"}

USER_PROFILES = {"ADMIN", "PADRAO"}
USER_STATUS = {"ACTIVE", "INACTIVE", "ATIVO", "INATIVO"}

BRAZILIAN_STATES = {
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
}

ATTEMPT_CHANNEL_MODALITY = {
    "Visita presencial": "Presencial",
    "Instagram": "Online",
    "WhatsApp": "Online",
    "Ligação": "Online",
}

ATTEMPT_STATUS_FLOW = {
    "Tentando Contato": {"Em Contato", "Reunião Marcada", "Proposta Enviada", "Proposta Recusada", "Não tem interesse", "Venda realizada"},
    "Em Contato": {"Reunião Marcada", "Proposta Enviada", "Proposta Recusada", "Não tem interesse", "Venda realizada"},
    "Reunião Marcada": {"Proposta Enviada", "Proposta Recusada", "Não tem interesse", "Venda realizada"},
    "Proposta Enviada": {"Proposta Recusada", "Venda realizada", "Não tem interesse"},
    "Proposta Recusada": set(),
    "Não tem interesse": set(),
    "Venda realizada": set(),
}
