-- =============================================================================
-- ShowMyMoney — Expenses Migration (002)
-- =============================================================================
-- 지출 관리 도메인 추가:
--   · members            — 계정 내 구성원(부부/가족). 지출의 주체를 구분한다.
--   · expense_categories — 지출 카테고리(식비/교통 등). 자산 카테고리와 달리 단층 구조.
--   · expenses           — 건별 지출 원장. member_id가 null이면 "공용" 지출.
--
-- 설계 메모:
--   · expenses.year_month는 spent_on에서 파생되는 generated column.
--     앱 전체의 6자리 정수 컨벤션(예: 202606)과 월 단위 조회 인덱스를 DB가 보장한다.
--   · 멤버 삭제 시 해당 멤버의 지출은 on delete set null로 공용에 귀속된다.
--   · 카테고리 삭제 시 해당 지출은 미분류(category_id null)로 남는다.
--
-- 사용법: Supabase 대시보드 SQL Editor에 이 파일 전체를 그대로 붙여 넣고 실행.
-- =============================================================================


-- 1. tables -------------------------------------------------------------------

create table if not exists public.members (
  id          uuid        primary key default gen_random_uuid(),
  account_id  uuid        not null references public.accounts(id) on delete cascade,
  name        text        not null,
  color       text        not null default 'chart-1',
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.expense_categories (
  id          uuid        primary key default gen_random_uuid(),
  account_id  uuid        not null references public.accounts(id) on delete cascade,
  name        text        not null,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.expenses (
  id           uuid        primary key default gen_random_uuid(),
  account_id   uuid        not null references public.accounts(id) on delete cascade,
  category_id  uuid        references public.expense_categories(id) on delete set null,
  member_id    uuid        references public.members(id) on delete set null,
  amount       numeric     not null check (amount > 0),
  spent_on     date        not null,
  year_month   integer     not null generated always as (
                 (extract(year from spent_on) * 100 + extract(month from spent_on))::integer
               ) stored,
  memo         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);


-- 2. indexes ------------------------------------------------------------------

create index if not exists expenses_account_ym_idx
  on public.expenses (account_id, year_month desc, spent_on desc);

create index if not exists members_account_sort_idx
  on public.members (account_id, sort_order);

create index if not exists expense_categories_account_sort_idx
  on public.expense_categories (account_id, sort_order);


-- 3. updated_at 트리거 ----------------------------------------------------------

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
  before update on public.expenses
  for each row
  execute function public.update_updated_at_column();


-- 4. RLS 안전장치 ---------------------------------------------------------------
-- 001과 동일하게 RLS만 ENABLE하고 policy는 부여하지 않는다.
-- service_role(서버 액션)만 접근 가능하고 publishable/anon 키는 전부 차단된다.

alter table public.members            enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expenses           enable row level security;
