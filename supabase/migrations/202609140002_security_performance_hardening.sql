-- Production hardening discovered by Supabase security/performance advisors.
-- Keep trusted state transitions service-role only and make helper function search paths explicit.
alter function public.is_valid_bounty_transition(text, text) set search_path = pg_catalog, public;
alter function public.enforce_bounty_transition() set search_path = pg_catalog, public;

revoke all on function public.transition_bounty(uuid,text,text,text,text,text,jsonb) from public;
revoke all on function public.transition_bounty(uuid,text,text,text,text,text,jsonb) from anon;
revoke all on function public.transition_bounty(uuid,text,text,text,text,text,jsonb) from authenticated;
grant execute on function public.transition_bounty(uuid,text,text,text,text,text,jsonb) to service_role;

-- Cover foreign keys that are used for joins/deletes and were flagged by the Supabase performance advisor.
create index if not exists sessions_user_id_idx on public.sessions(user_id);
create index if not exists bounties_repository_id_idx on public.bounties(repository_id);
create index if not exists bounties_source_issue_id_idx on public.bounties(source_issue_id);
create index if not exists claims_contributor_user_id_idx on public.claims(contributor_user_id);
create index if not exists submissions_claim_id_idx on public.submissions(claim_id);
