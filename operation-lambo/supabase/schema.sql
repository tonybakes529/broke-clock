-- OPERATION LAMBO — Supabase schema
-- Run in the Supabase SQL editor, or via `supabase migration`.
-- One game per user. Row Level Security so a user only ever sees their own rows.

-- GAME (one row per user)
create table if not exists game (
  user_id uuid primary key references auth.users(id) on delete cascade,
  start_date date not null default current_date,
  base_target date not null,
  delay_days int not null default 0,
  bank numeric not null default 0,
  daily_goal numeric not null default 2740,
  miss_penalty int not null default 3,
  created_at timestamptz default now()
);

-- TRANSACTIONS
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  kind text not null check (kind in ('income','spend','debt','asset')),
  amount numeric not null check (amount > 0),
  note text,
  luxury boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists transactions_user_date_idx on transactions (user_id, date);

-- DEBTS
create table if not exists debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  balance numeric not null default 0,
  apr numeric default 0
);

-- ASSETS
create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  value numeric not null default 0,
  liquid boolean not null default true
);

-- CHECK-INS (completed missions)
create table if not exists check_ins (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  primary key (user_id, date)
);

-- DAYS ALREADY JUDGED BY THE SLIP ENGINE
create table if not exists judged_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  primary key (user_id, date)
);

-- RLS: a user only ever sees their own rows
alter table game enable row level security;
alter table transactions enable row level security;
alter table debts enable row level security;
alter table assets enable row level security;
alter table check_ins enable row level security;
alter table judged_days enable row level security;

drop policy if exists own on game;
drop policy if exists own on transactions;
drop policy if exists own on debts;
drop policy if exists own on assets;
drop policy if exists own on check_ins;
drop policy if exists own on judged_days;

create policy own on game for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own on transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own on debts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own on assets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own on check_ins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own on judged_days for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
