# Security Release Checklist

Run this immediately before making the repository public and again before competition submission.

## Credentials and repository history

- [ ] `npm run scan:secrets` passes with full git history available.
- [ ] No `.env`, `.env.local`, deployment export, wallet backup, browser profile data or credential dump is tracked.
- [ ] No GitHub PAT/OAuth secret is committed.
- [ ] No Supabase service-role/backend secret is committed.
- [ ] No Gemini/OpenAI-compatible API key is committed.
- [ ] No `SESSION_ENCRYPTION_KEY` is committed.
- [ ] No Nimiq seed phrase/private key/recovery material is committed.
- [ ] Any credential ever exposed in chat, screenshots, logs or git history has been rotated/revoked before release.

## Production environment

- [ ] `APP_URL` matches the canonical HTTPS production URL.
- [ ] GitHub OAuth callback exactly matches `<APP_URL>/api/auth/github/callback`.
- [ ] Supabase backend credential exists only in trusted server environment configuration.
- [ ] `SESSION_ENCRYPTION_KEY` is a fresh strong secret stored only in the production secret store.
- [ ] `VITE_NIMIQ_FUNDING_ADDRESS` contains only a public Nimiq address.
- [ ] `VITE_NIMIQ_FUNDING_ADDRESS === NIMIQ_FUNDING_ADDRESS`.
- [ ] `NIMIQ_PAYOUT_SOURCE_ADDRESS` is the public address of the actual signing wallet.
- [ ] `NIMIQ_RPC_URL` is healthy and supports the methods MergeEarn uses.
- [ ] Optional AI API key is server-only and absent from the browser bundle.

## Authentication / authorization

- [ ] OAuth `state` validation works.
- [ ] Production session cookie is `HttpOnly`, `Secure`, and `SameSite=Lax`.
- [ ] GitHub access token is encrypted at rest.
- [ ] Repository permission checks execute on the server.
- [ ] Funding is restricted according to creator policy.
- [ ] Verify/approve/pay authorization matches backend maintainer/claimant policy.
- [ ] Unauthorized user receives a clear 401/403 rather than UI-only protection.

## GitHub work verification

- [ ] Wrong repository PR is rejected.
- [ ] Wrong base branch PR is rejected.
- [ ] Unmerged PR cannot become `VERIFIED`.
- [ ] Valid merged PR becomes `VERIFIED` only after server-side GitHub check.

## Nimiq payment verification

- [ ] Cancelled funding never produces `FUNDED`.
- [ ] Wrong funding recipient is rejected.
- [ ] Wrong funding amount is rejected.
- [ ] Unconfirmed/pending funding does not prematurely produce `FUNDED`.
- [ ] Payout sender matches the configured payout-source address.
- [ ] Payout recipient matches the claimant's stored public address.
- [ ] Wrong payout amount is rejected.
- [ ] Duplicate confirmed payout is prevented.
- [ ] `PAID` appears only after independent transaction verification.

## Database / audit

- [ ] Core migration is applied.
- [ ] Security/performance hardening migration is applied.
- [ ] Critical state-transition function is not executable by anonymous/authenticated browser roles.
- [ ] RLS remains enabled on application tables.
- [ ] Audit events and payment transaction records are persisted during E2E.

## CI / runtime

- [ ] `npm ci` succeeds from a clean checkout.
- [ ] `npm run typecheck` succeeds.
- [ ] `npm test` succeeds.
- [ ] `npm run scan:secrets` succeeds.
- [ ] `npm run build` succeeds.
- [ ] Latest `main` CI is green.
- [ ] Production deployment is READY.
- [ ] No blocking build/runtime errors remain after the full E2E.

## Public-release gate

- [ ] Owner explicitly approves MIT licensing.
- [ ] Owner explicitly approves changing the repository from private to public.
- [ ] MIT `LICENSE` is present before/at public release.
- [ ] README points to the tested live URL and demo instructions.
- [ ] Public repo contains no secrets or private operational notes that should remain internal.

A checked box must reflect an observed result, not an assumption.
