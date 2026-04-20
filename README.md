# CRM PlungRank

CRM comercial voltado para captação, acompanhamento e conversão de leads, com foco em operação organizada, rastreabilidade do funil e aplicação consistente de regras de negócio.

O sistema foi estruturado para cobrir todo o ciclo comercial:
- cadastro e qualificação de leads
- registro de tentativas de contato
- acompanhamento de reuniões
- fechamento de vendas
- gestão de serviços e usuários

A aplicação utiliza:
- `Flask` no back-end para API, autenticação e reforço das regras de negócio
- `Next.js` no front-end para a experiência operacional do CRM
- `Supabase / PostgreSQL` como base de dados

O objetivo do projeto é manter coerência entre interface, back-end e banco de dados, garantindo que regras comerciais e restrições operacionais sejam respeitadas em toda a jornada do usuário.

## Estrutura

- `backend/`: API Flask em MVC, autenticação, regras de negócio e seed do administrador master
- `frontend/`: aplicação Next.js com login, dashboard e módulos do CRM
- `supabase/`: esquema SQL de referência para a base do projeto

## Variáveis de ambiente

### Back-end

Copie `backend/.env.example` para `backend/.env`.

Campos principais:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET_KEY`
- `MASTER_ADMIN_EMAIL`
- `MASTER_ADMIN_PASSWORD`

Observação:

- `SUPABASE_KEY` pode ser usada como fallback técnico de conexão.
- Para o back-end operar com seed do admin master e gerenciamento seguro, o ideal é usar `SUPABASE_SERVICE_ROLE_KEY`.
- Chaves `sb_publishable_*` são públicas e normalmente não devem ser usadas como credencial principal do servidor.

### Front-end

Copie `frontend/.env.example` para `frontend/.env.local`.

- `NEXT_PUBLIC_API_URL`

## Fluxo sugerido

1. Criar o schema no Supabase com `supabase/schema.sql`
2. Configurar `backend/.env`
3. Rodar o seed inicial do admin master
4. Subir a API Flask
5. Subir o front Next.js

## Comandos

### Back-end

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python scripts/seed_master_user.py
flask --app run.py --debug run
```

### Front-end

```bash
cd frontend
npm install
npm run dev
```
