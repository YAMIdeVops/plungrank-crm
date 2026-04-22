# CRM PlungRank

CRM comercial voltado para captação, acompanhamento e conversão de leads, com foco em operação organizada, rastreabilidade do funil e aplicação consistente de regras de negócio.

O sistema cobre todo o ciclo comercial:
- cadastro e qualificação de leads
- registro de tentativas de contato
- acompanhamento de reuniões
- fechamento de vendas
- gestão de serviços e usuários

## Stack

- `TypeScript + Express` no back-end para API, autenticação e reforço das regras de negócio
- `Next.js + TypeScript` no front-end para a experiência operacional do CRM
- `Supabase / PostgreSQL` como base de dados

## Estrutura

- `backend/src/`: API em TypeScript, autenticação, regras de negócio e scripts operacionais
- `frontend/`: aplicação Next.js com login, dashboard e módulos do CRM
- `supabase/`: esquema SQL e scripts de apoio da base do projeto

## Variáveis de Ambiente

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

Observações:
- `DATABASE_URL` é obrigatória para o back-end operar.
- `SUPABASE_SERVICE_ROLE_KEY` é recomendada para rotinas administrativas e automações.
- chaves `sb_publishable_*` são públicas e não devem ser usadas como credencial principal do servidor.

### Front-end

Copie `frontend/.env.example` para `frontend/.env.local`.

Campo principal:
- `NEXT_PUBLIC_API_URL`

## Execução Local

### Back-end

```bash
cd backend
npm install
npm run dev
```

Build de produção:

```bash
cd backend
npm run build
npm start
```

Scripts úteis:

```bash
cd backend
npm run seed:admin
npm run validate:admin
npm run apply:sql -- ../supabase/performance_indexes.sql
```

### Front-end

```bash
cd frontend
npm install
npm run dev
```

## Fluxo Sugerido

1. Criar ou alinhar o schema no Supabase com os scripts em `supabase/`
2. Configurar `backend/.env`
3. Rodar o seed inicial do administrador
4. Subir a API TypeScript
5. Subir o front Next.js

## Objetivo

O objetivo do projeto é manter coerência entre interface, back-end e banco de dados, garantindo que regras comerciais, validações e restrições operacionais sejam respeitadas em toda a jornada do usuário.
