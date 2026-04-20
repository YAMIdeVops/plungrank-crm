create extension if not exists pgcrypto;

create table if not exists public.usuarios (
  id_usuario bigint generated always as identity primary key,
  nome_usuario text not null check (btrim(nome_usuario) <> ''),
  email text not null unique,
  senha_hash text not null check (btrim(senha_hash) <> ''),
  perfil text not null check (perfil in ('ADMIN', 'PADRAO')),
  status_usuario text not null check (status_usuario in ('ATIVO', 'INATIVO')),
  criado_em timestamptz not null default timezone('utc', now()),
  atualizado_em timestamptz not null default timezone('utc', now()),
  constraint ck_usuarios_email_formato check (
    email ~* '^[A-Za-z0-9._%%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  )
);

create table if not exists public.leads (
  id_lead bigint generated always as identity primary key,
  nome_contato text not null check (btrim(nome_contato) <> ''),
  telefone text not null unique,
  instagram text null default '--',
  nome_empresa text not null check (btrim(nome_empresa) <> ''),
  nicho text not null check (btrim(nicho) <> ''),
  tem_site text not null check (tem_site in ('SIM', 'NÃO')),
  estado char(2) not null,
  data_cadastro date not null,
  fonte_lead text not null check (fonte_lead in ('Google Maps', 'Instagram', 'Casa dos Dados', 'Receita Federal')),
  situacao text not null check (situacao in ('Novo', 'Em prospecção', 'Cliente', 'Inativo'))
);

create table if not exists public.tentativa_contato (
  id_tentativa bigint generated always as identity primary key,
  id_lead bigint not null references public.leads(id_lead) on delete cascade,
  modalidade text not null check (modalidade in ('Presencial', 'Online')),
  data_tentativa date not null,
  canal text not null check (canal in ('Visita presencial', 'Instagram', 'WhatsApp', 'Ligação')),
  status text not null check (
    status in (
      'Tentando Contato',
      'Em Contato',
      'Reunião Marcada',
      'Proposta Enviada',
      'Proposta Recusada',
      'Não tem interesse',
      'Venda realizada'
    )
  )
);

create table if not exists public.reuniao (
  id_reuniao bigint generated always as identity primary key,
  id_lead bigint not null references public.leads(id_lead) on delete cascade,
  data_reuniao timestamptz not null,
  status_reuniao text not null check (status_reuniao in ('Realizada', 'Não Compareceu', 'Remarcada'))
);

create table if not exists public.servicos (
  id_servico bigint generated always as identity primary key,
  servico text not null unique check (btrim(servico) <> ''),
  valor numeric(12, 2) not null check (valor > 0)
);

create table if not exists public.vendas (
  id_venda bigint generated always as identity primary key,
  id_lead bigint not null references public.leads(id_lead) on delete cascade,
  id_reuniao bigint null references public.reuniao(id_reuniao),
  id_servico bigint not null references public.servicos(id_servico),
  data_venda date not null,
  valor_venda numeric(12, 2) not null check (valor_venda > 0),
  origem_fechamento text not null check (origem_fechamento in ('Visita presencial', 'Instagram', 'WhatsApp', 'Ligação'))
);

create or replace function public.fn_tratar_usuarios_before_ins_upd()
returns trigger as $$
begin
  new.nome_usuario := regexp_replace(btrim(new.nome_usuario), '\s+', ' ', 'g');
  new.email := lower(btrim(new.email));
  new.perfil := upper(btrim(new.perfil));
  new.status_usuario := upper(btrim(new.status_usuario));
  new.atualizado_em := timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_usuarios_before_ins_upd on public.usuarios;
create trigger trg_usuarios_before_ins_upd
before insert or update on public.usuarios
for each row execute procedure public.fn_tratar_usuarios_before_ins_upd();
