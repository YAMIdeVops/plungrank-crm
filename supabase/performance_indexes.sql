create index if not exists idx_leads_data_cadastro_id
    on leads (data_cadastro desc, id_lead desc);

create index if not exists idx_leads_fonte_lead
    on leads (fonte_lead);

create index if not exists idx_leads_situacao
    on leads (situacao);

create index if not exists idx_leads_tem_site
    on leads (tem_site);

create index if not exists idx_tentativa_contato_lead_data_id
    on tentativa_contato (id_lead, data_tentativa desc, id_tentativa desc);

create index if not exists idx_tentativa_contato_modalidade
    on tentativa_contato (modalidade);

create index if not exists idx_tentativa_contato_canal
    on tentativa_contato (canal);

create index if not exists idx_tentativa_contato_status
    on tentativa_contato (status);

create index if not exists idx_reuniao_lead_data_id
    on reuniao (id_lead, data_reuniao asc, id_reuniao asc);

create index if not exists idx_reuniao_status
    on reuniao (status_reuniao);

create index if not exists idx_vendas_lead_data_id
    on vendas (id_lead, data_venda desc, id_venda desc);

create index if not exists idx_vendas_servico
    on vendas (id_servico);

create index if not exists idx_vendas_origem
    on vendas (origem_fechamento);
