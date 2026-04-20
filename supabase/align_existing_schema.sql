begin;

create extension if not exists pgcrypto;

update public.usuarios
set
  nome_usuario = regexp_replace(btrim(nome_usuario), '\s+', ' ', 'g'),
  email = lower(btrim(email)),
  perfil = upper(btrim(perfil)),
  status_usuario = upper(btrim(status_usuario));

alter table public.usuarios
  alter column nome_usuario set not null,
  alter column email set not null,
  alter column senha_hash set not null,
  alter column perfil set not null,
  alter column status_usuario set not null,
  alter column criado_em set default timezone('utc', now()),
  alter column atualizado_em set default timezone('utc', now());

alter table public.usuarios drop constraint if exists ck_usuarios_email_formato;
alter table public.usuarios drop constraint if exists ck_usuarios_perfil;
alter table public.usuarios drop constraint if exists ck_usuarios_status;

alter table public.usuarios
  add constraint ck_usuarios_email_formato check (
    email ~* '^[A-Za-z0-9._%%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ),
  add constraint ck_usuarios_perfil check (perfil in ('ADMIN', 'PADRAO')),
  add constraint ck_usuarios_status check (status_usuario in ('ATIVO', 'INATIVO'));

update public.leads
set instagram = '--'
where instagram is null or btrim(instagram) = '';

update public.leads
set tem_site = 'NÃO'
where tem_site = 'NAO';

alter table public.leads
  alter column instagram set default '--';

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

commit;
