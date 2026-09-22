# MergeEarn — Persistent Handoff

> This file is the permanent resume point for future humans or AI agents. The repository is the source of truth. Do not ask the owner to repeat completed setup unless current evidence shows it is broken.

## Resume rule

When continuing MergeEarn:

**Owner handoff protocol:** if the owner supplies only the repository URL in a future chat, treat that as sufficient context. Inspect this handoff, current main, open issues/PRs, CI, production, and current growth state first. Do not ask the owner to repeat prior requirements. Perform safe repository work autonomously, then ask for only the exact human-only action needed (wallet signature, login, external approval, or private credential rotation) and give that action one step at a time.

1. Read `README.md`, `docs/RELEASE_CHECKLIST.md`, `docs/SECURITY_RELEASE_CHECKLIST.md`, `docs/SUBMISSION_FORM.md`, and this file.
2. Inspect latest `main` CI and the current Vercel production deployment.
3. Continue the highest-priority unchecked release/security/submission item.
4. Do not recreate completed OAuth, Supabase, GitHub, Nimiq Pay, or Vercel setup from scratch.
5. Never request wallet recovery words, login files, private keys, GitHub client secrets, Supabase service-role keys, or session-encryption secrets in chat.

## Product

**Name:** MergeEarn  
**Pitch:** Turn GitHub issues into paid, verified work.  
**Canonical production URL:** `https://mergeearn.vercel.app`  
**Public repository:** `https://github.com/Saidur-droid/MergeEarn`  
**License:** MIT

Core loop:

`Issue -> Bounty -> Fund -> Claim -> Pull Request -> Merge -> Verify -> Approve -> Pay`

Trust boundaries:

- GitHub is the canonical source of code-work state.
- Nimiq is the canonical source of payment state.
- AI is advisory only.
- Money-sensitive state changes require trusted-server verification.

## Verified production state — 2026-09-15

The live deployed product completed the full Nimiq TESTNET E2E through Nimiq Pay:

`Issue -> Bounty -> Fund -> Claim -> PR -> Merge -> Verify -> Approve -> Pay`

Final persisted state for the completed bounty:

- bounty: `PAID`
- payout transaction: `CONFIRMED`
- amount: `5 NIM`
- claim: `COMPLETED`

Other verified facts:

- GitHub OAuth works in production.
- Authorized repository + issue loading works.
- Nimiq Pay Mini App connection works on mobile TESTNET.
- Funding was independently chain-verified before `FUNDED`.
- Real GitHub PR #5 was linked and merged into `main`.
- Payout was independently chain-verified before `PAID`.
- Repository is public.
- MIT License is present.
- Temporary CI payout-debug instrumentation was removed.
- README and competition submission docs were updated with the canonical production URL and successful E2E state.
- GitHub issue #1 (`P0: Build the first real Issue -> Bounty -> PR -> Pay vertical slice`) is closed as completed.
- Latest checked CI after cleanup/release-document updates completed successfully.

## Important fixes discovered during live E2E

The real flow exposed and fixed several production issues:

- Vercel Hobby serverless-function limit: auth endpoints consolidated.
- GitHub OAuth state/canonical-host behavior on Vercel.
- Nimiq funding recipient runtime configuration mismatch.
- Nimiq PoS JSON-RPC `{ data, metadata }` wrapper handling during transaction verification.
- PR verification relation-loading issue; verifier now loads the canonical submission directly.
- Payout-source address configuration corrected to the actual TESTNET transaction sender.

Do not revert these fixes without a replacement test.

## Production infrastructure

### Supabase

Project ref: `ppqvnxrcwsdltzpdcwat`

Migrations applied:

1. `supabase/migrations/202609140001_core.sql`
2. `supabase/migrations/202609140002_security_performance_hardening.sql`

### Vercel

Team:

- slug: `saidur-droids-projects`
- id: `team_BsJXXtOBNmww7MhlgiE7JzzO`

Canonical domain: `https://mergeearn.vercel.app`

Production variables known to be in use:

- `APP_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_ENCRYPTION_KEY`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `VITE_NIMIQ_FUNDING_ADDRESS`
- `NIMIQ_FUNDING_ADDRESS`
- `NIMIQ_PAYOUT_SOURCE_ADDRESS`
- `NIMIQ_RPC_URL`
- optional AI configuration

Never copy secret values into repository docs or chat.

### Nimiq test environment used for E2E

The successful E2E was TESTNET. Public addresses and transaction hashes are not secrets; recovery material is secret.

The payout-source production config for the tested TESTNET flow was corrected to the actual signing address observed on-chain. If moving to MAINNET or a fresh wallet, update the public address configuration and perform a fresh end-to-end verification.

## Security actions still required before calling the release fully hardened

Two credentials/recovery items were exposed in chat during development and must be treated as compromised even if the chat is later deleted:

1. **Rotate `SESSION_ENCRYPTION_KEY` in Vercel Production.**
   - Generate a new strong random value locally.
   - Store it only in Vercel.
   - Redeploy production.
   - Existing sessions may be invalidated; re-login is expected.

2. **Do not use the previously exposed Nimiq wallet recovery/Login File for real-value mainnet funds.**
   - Create a fresh wallet/recovery setup for real funds.
   - Never paste recovery words, QR/Login File, or private keys into chat.
   - Update public funding/payout addresses if the new wallet becomes the production treasury/payout wallet.

Deleting the development chat does not substitute for rotation of exposed credentials.

Repository secret search did not find the previously exposed session secret value in the current code search, and CI includes full-history secret-pattern scanning, but rotation is still mandatory because exposure occurred outside Git.

## Current release status

### Post-submission judging phase — 2026-09-20

MergeEarn has been submitted for Cycle 2 and is now in the public judging/showcase phase. Post-submission priorities are reliability, judge-first proof, real organic usage, and repeat verified bounty lifecycles. Do not fabricate wallets, transactions, users, GitHub activity, or traffic. Do not buy usage. All growth must be genuine and competition-safe.

### Core product

The core product flow is proven end-to-end and functional through `PAID`.

### Not yet safe to call “100% final competition submission complete” until:

- `SESSION_ENCRYPTION_KEY` is rotated after chat exposure.
- Any real-value wallet uses fresh recovery material.
- Final production runtime-error/log review is completed after the latest deployment.
- Required demo/video/screenshots are captured.
- Skool promotion URL is published and recorded if required by the portal.
- Public social post URL is published and recorded if required.
- Competition portal submission is completed and the public showcase entry remains reachable.

See `docs/RELEASE_CHECKLIST.md` for the canonical checkbox list.

## Submission material

Prepared files:

- `docs/COMPETITION_SUBMISSION.md`
- `docs/SUBMISSION_FORM.md`
- `docs/PROMOTION_COPY.md`
- `docs/DEMO_RUNBOOK.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/SECURITY_RELEASE_CHECKLIST.md`

`docs/SUBMISSION_FORM.md` already contains the verified live app and public GitHub URLs. Remaining placeholders are for demo/promotion URLs.

## Current acquisition state — 2026-09-22

- Nimiq Space MergeEarn advertising campaign exists but is visibly **Pending Payment**.
- The competition 1500 NIM advertising top-up has not yet been visibly confirmed on the campaign.
- Do not spend the owner's NIM on that campaign while the free competition top-up is pending.
- GitHub source-aware acquisition work is tracked in #66–#69.
- Organic growth only: never fabricate, buy, script, or impersonate users/wallets.

## Next-session priority order

1. Keep the no-login judge path reliable: public bounty evidence, GitHub links, Nimiq transaction links, live metrics, and production smoke checks.
2. Grow genuine usage and distribution organically; never simulate or purchase users, wallets, traffic, transactions, stars, or PRs.
3. Keep the first-time path under 60 seconds: Earn NIM / Sponsor work / Join contributor pool.
4. Complete 2–3 fresh real sponsor → contributor → PR → merge → payout lifecycles using real independent users where available.
5. Use the current contributor-friendly growth issues (#66–#69) for genuine community-sponsored lifecycles through the product whenever genuine contributors participate.
6. Rotate `SESSION_ENCRYPTION_KEY`; redeploy; verify GitHub login still works.
7. For any mainnet/real-value use, create a fresh Nimiq wallet and update public address config.
8. Inspect production runtime errors/logs when Vercel project log access is available and keep latest `main` CI green throughout judging.
9. Keep issue #33 and the community-growth workflow healthy; it is the canonical self-updating contributor/sponsor board.
10. Keep the hourly `MergeEarn Judge Ops`, `Bounty Concierge`, and active 48-hour growth sprint automation healthy during judging.

## Definition of 100%

Only say **100% competition submission ready** after both the product and operational release gates are complete: live E2E reached `PAID`, latest CI is green, no blocking runtime errors remain, exposed credentials/recovery material have been rotated/replaced, required public assets/links exist, and the competition submission itself is completed.
