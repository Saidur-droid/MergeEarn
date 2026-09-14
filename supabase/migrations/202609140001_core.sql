create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  github_user_id bigint not null unique,
  github_login text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  github_access_token_ciphertext text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_expires_at_idx on public.sessions(expires_at);

create table if not exists public.github_repositories (
  id uuid primary key default gen_random_uuid(),
  github_repository_id bigint not null unique,
  owner text not null,
  name text not null,
  full_name text not null unique,
  default_branch text not null,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_issues (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references public.github_repositories(id) on delete cascade,
  github_issue_id bigint not null,
  issue_number integer not null check (issue_number > 0),
  title text not null,
  body text,
  html_url text not null,
  state text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(repository_id, github_issue_id),
  unique(repository_id, issue_number)
);

create table if not exists public.bounties (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references public.github_repositories(id) on delete restrict,
  source_issue_id uuid not null references public.source_issues(id) on delete restrict,
  creator_user_id uuid not null references public.users(id) on delete restrict,
  title text not null,
  description text not null,
  acceptance_criteria jsonb not null default '[]'::jsonb,
  reward_amount_luna bigint not null check (reward_amount_luna > 0),
  reward_asset text not null default 'NIM' check (reward_asset = 'NIM'),
  status text not null default 'DRAFT' check (status in (
    'DRAFT','READY_TO_FUND','FUNDED','CLAIMED','PR_SUBMITTED','VERIFIED','APPROVED','PAID',
    'CANCELLED','EXPIRED','DISPUTED','PAYMENT_FAILED'
  )),
  ai_metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bounties_status_idx on public.bounties(status);
create index if not exists bounties_creator_idx on public.bounties(creator_user_id);

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  bounty_id uuid not null references public.bounties(id) on delete cascade,
  contributor_user_id uuid not null references public.users(id) on delete restrict,
  nimiq_address text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','COMPLETED','CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists one_active_claim_per_bounty
  on public.claims(bounty_id) where status = 'ACTIVE';

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  bounty_id uuid not null references public.bounties(id) on delete cascade,
  claim_id uuid not null references public.claims(id) on delete restrict,
  github_pull_request_id bigint not null,
  pull_request_number integer not null check (pull_request_number > 0),
  html_url text not null,
  head_sha text not null,
  base_branch text not null,
  pr_author_login text,
  merged_at timestamptz,
  verification_status text not null default 'PENDING' check (verification_status in ('PENDING','VERIFIED','REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(bounty_id),
  unique(bounty_id, github_pull_request_id)
);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  bounty_id uuid not null references public.bounties(id) on delete cascade,
  type text not null check (type in ('FUNDING','PAYOUT')),
  provider text not null default 'NIMIQ' check (provider = 'NIMIQ'),
  asset text not null default 'NIM' check (asset = 'NIM'),
  amount_luna bigint not null check (amount_luna > 0),
  provider_reference text,
  idempotency_key text not null unique,
  raw_transaction text,
  status text not null default 'PENDING' check (status in ('PENDING','CONFIRMED','FAILED')),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists one_confirmed_payout_per_bounty
  on public.payment_transactions(bounty_id) where type = 'PAYOUT' and status = 'CONFIRMED';
create index if not exists payment_transactions_bounty_idx on public.payment_transactions(bounty_id);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  bounty_id uuid references public.bounties(id) on delete cascade,
  actor_type text not null,
  actor_id text,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_events_bounty_idx on public.audit_events(bounty_id, created_at desc);

create or replace function public.is_valid_bounty_transition(from_status text, to_status text)
returns boolean
language sql
immutable
as $$
  select case from_status
    when 'DRAFT' then to_status in ('READY_TO_FUND','CANCELLED')
    when 'READY_TO_FUND' then to_status in ('FUNDED','CANCELLED','EXPIRED')
    when 'FUNDED' then to_status in ('CLAIMED','CANCELLED','EXPIRED')
    when 'CLAIMED' then to_status in ('PR_SUBMITTED','CANCELLED','EXPIRED')
    when 'PR_SUBMITTED' then to_status in ('VERIFIED','CLAIMED','DISPUTED')
    when 'VERIFIED' then to_status in ('APPROVED','DISPUTED')
    when 'APPROVED' then to_status in ('PAID','PAYMENT_FAILED','DISPUTED')
    when 'PAYMENT_FAILED' then to_status in ('APPROVED','DISPUTED')
    when 'DISPUTED' then to_status in ('APPROVED','CANCELLED')
    else false
  end;
$$;

create or replace function public.enforce_bounty_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status and not public.is_valid_bounty_transition(old.status, new.status) then
    raise exception 'Invalid bounty transition: % -> %', old.status, new.status;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists bounties_enforce_transition on public.bounties;
create trigger bounties_enforce_transition
before update of status on public.bounties
for each row execute function public.enforce_bounty_transition();

create or replace function public.transition_bounty(
  p_bounty_id uuid,
  p_from text,
  p_to text,
  p_actor_type text,
  p_actor_id text,
  p_event_type text,
  p_metadata jsonb default '{}'::jsonb
)
returns public.bounties
language plpgsql
security definer
set search_path = public
as $$
declare
  changed public.bounties;
begin
  if not public.is_valid_bounty_transition(p_from, p_to) then
    raise exception 'Invalid bounty transition: % -> %', p_from, p_to;
  end if;

  update public.bounties
    set status = p_to, updated_at = now()
    where id = p_bounty_id and status = p_from
    returning * into changed;

  if changed.id is null then
    raise exception 'Bounty state changed concurrently or bounty not found';
  end if;

  insert into public.audit_events(bounty_id, actor_type, actor_id, event_type, metadata)
  values (p_bounty_id, p_actor_type, p_actor_id, p_event_type, coalesce(p_metadata, '{}'::jsonb));

  return changed;
end;
$$;

revoke all on function public.transition_bounty(uuid,text,text,text,text,text,jsonb) from public;
grant execute on function public.transition_bounty(uuid,text,text,text,text,text,jsonb) to service_role;

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.github_repositories enable row level security;
alter table public.source_issues enable row level security;
alter table public.bounties enable row level security;
alter table public.claims enable row level security;
alter table public.submissions enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.audit_events enable row level security;

-- No anon/authenticated policies are intentionally created. The browser never talks to
-- Supabase directly; trusted Vercel functions use the service-role key server-side.
