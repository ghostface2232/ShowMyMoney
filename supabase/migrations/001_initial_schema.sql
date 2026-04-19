-- =============================================================================
-- ShowMyMoney — Initial Schema Migration (001)
-- =============================================================================
-- 실행 순서:
--   1. extension 활성화 (pgcrypto — gen_random_uuid용)
--   2. 공용 트리거 함수 update_updated_at_column 정의
--   3. 테이블 생성
--        accounts → category_groups → categories
--                 → snapshots → entries
--                 → goals
--   4. 인덱스 생성
--   5. updated_at 트리거 부착 (accounts, entries)
--   6. RLS 활성화 (서비스 키 전용 안전장치)
--
-- DB 접근 규약:
--   · 서버 액션만 secret (service_role) key로 접근함. 클라이언트 접근은 차단됨.
--   · publishable key / anon key로는 어떤 테이블에도 접근 불가.
--
-- 사용법: Supabase 대시보드 SQL Editor에 이 파일 전체를 그대로 붙여 넣고 실행.
-- =============================================================================


-- 1. extensions -------------------------------------------------------------
create extension if not exists "pgcrypto";


-- 2. 공용 트리거 함수 -------------------------------------------------------
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- 3. tables -----------------------------------------------------------------

create table if not exists public.accounts (
  id             uuid        primary key default gen_random_uuid(),
  pin_hash       text        not null,
  display_name   text        not null,
  first_used_at  timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.category_groups (
  id          uuid        primary key default gen_random_uuid(),
  account_id  uuid        not null references public.accounts(id) on delete cascade,
  name        text        not null,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.categories (
  id          uuid        primary key default gen_random_uuid(),
  group_id    uuid        not null references public.category_groups(id) on delete cascade,
  name        text        not null,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.snapshots (
  id          uuid        primary key default gen_random_uuid(),
  account_id  uuid        not null references public.accounts(id) on delete cascade,
  year_month  integer     not null,
  note        text,
  created_at  timestamptz not null default now(),
  unique (account_id, year_month)
);

create table if not exists public.entries (
  id           uuid        primary key default gen_random_uuid(),
  snapshot_id  uuid        not null references public.snapshots(id) on delete cascade,
  category_id  uuid        not null references public.categories(id) on delete cascade,
  amount       numeric     not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (snapshot_id, category_id)
);

create table if not exists public.goals (
  id             uuid        primary key default gen_random_uuid(),
  account_id     uuid        not null references public.accounts(id) on delete cascade,
  label          text        not null,
  target_amount  numeric     not null,
  target_date    date        not null,
  created_at     timestamptz not null default now()
);


-- 4. indexes ----------------------------------------------------------------
create index if not exists snapshots_account_year_month_idx
  on public.snapshots (account_id, year_month desc);

create index if not exists entries_snapshot_id_idx
  on public.entries (snapshot_id);

create index if not exists category_groups_account_sort_idx
  on public.category_groups (account_id, sort_order);

create index if not exists categories_group_sort_idx
  on public.categories (group_id, sort_order);


-- 5. updated_at 트리거 ------------------------------------------------------
drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
  before update on public.accounts
  for each row
  execute function public.update_updated_at_column();

drop trigger if exists entries_set_updated_at on public.entries;
create trigger entries_set_updated_at
  before update on public.entries
  for each row
  execute function public.update_updated_at_column();


-- 6. RLS 안전장치 -----------------------------------------------------------
-- RLS를 ENABLE하고 authenticated / anon 역할에 대해 어떤 policy도 부여하지 않는다.
-- Supabase에서 service_role 키는 RLS를 bypass하므로 서버 액션은 정상 동작하고,
-- publishable(anon) / authenticated 키로는 어떤 select/insert/update/delete도 차단된다.
alter table public.accounts        enable row level security;
alter table public.category_groups enable row level security;
alter table public.categories      enable row level security;
alter table public.snapshots       enable row level security;
alter table public.entries         enable row level security;
alter table public.goals           enable row level security;
