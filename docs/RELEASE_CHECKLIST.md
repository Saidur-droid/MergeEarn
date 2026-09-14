# Release Checklist

This is the final operator checklist for the Nimiq Mini Apps Competition Cycle 2 release. Execute in order; do not mark a step complete from assumption alone.

## A. Code and CI

- [x] Production vertical slice implemented.
- [x] GitHub authorization hardening implemented.
- [x] Exact dependency versions and `package-lock.json` committed.
- [x] CI uses `npm ci`.
- [x] Supabase security/performance hardening migration committed.
- [ ] Latest `main` CI passes secret scan, typecheck, tests and build.

## B. Infrastructure

- [x] Dedicated Supabase production project created.
- [x] Core schema migration applied.
- [x] Supabase security/performance hardening applied.
- [x] Nimiq RPC selected and smoke-tested.
- [ ] Supabase production URL + backend credential configured in Vercel.
- [ ] GitHub production OAuth App created.
- [ ] GitHub client ID/secret configured in Vercel.
- [ ] Fresh production session-encryption secret configured in Vercel.
- [ ] Treasury/funding/payout public Nimiq address configured.
- [ ] Optional AI API key configured, or fallback intentionally accepted for submission.

## C. Deploy

- [ ] Deploy latest `main` to Vercel Production.
- [ ] Confirm deployment state is READY.
- [ ] Confirm canonical production domain resolves to the latest deployment.
- [ ] Confirm `/api/auth/session` responds without server configuration errors.
- [ ] Confirm GitHub OAuth login/callback completes.
- [ ] Confirm repository and issue lists load.
- [ ] Confirm Supabase persistence works.
- [ ] Confirm Nimiq RPC calls work from the deployed trusted server.

## D. Real E2E

Use the smallest practical NIM reward and preferably two GitHub identities.

- [ ] Maintainer signs in.
- [ ] Maintainer selects a real public repository + issue.
- [ ] Bounty is created and published.
- [ ] Nimiq funding is signed.
- [ ] Server independently verifies funding before `FUNDED`.
- [ ] Contributor claims the bounty with a public Nimiq payout address.
- [ ] Real PR is created against the expected base branch.
- [ ] PR is submitted to MergeEarn.
- [ ] PR is merged on GitHub.
- [ ] Server re-verifies canonical GitHub state before `VERIFIED`.
- [ ] Authorized maintainer approves work.
- [ ] Payout is signed from the configured wallet.
- [ ] Server independently verifies payout before `PAID`.
- [ ] Audit events, payment records and metrics reflect the lifecycle.
- [ ] Vercel runtime errors/logs inspected after completion.

## E. Judge-facing QA

- [ ] Test intended Nimiq Pay Mini App/WebView experience.
- [ ] Test narrow mobile layout.
- [ ] Test loading, empty, failed, pending, retry and success states.
- [ ] Verify wrong/unmerged PR cannot advance.
- [ ] Verify cancelled/incorrect payment cannot advance.
- [ ] Verify unauthorized account cannot approve/pay.
- [ ] Verify AI failure falls back cleanly.

## F. Security/public release

Complete `docs/SECURITY_RELEASE_CHECKLIST.md` first.

- [ ] Secret/history scan passes.
- [ ] Owner explicitly approves MIT license.
- [ ] Owner explicitly approves public repository visibility.
- [ ] Add MIT `LICENSE`.
- [ ] Change repository visibility to public.
- [ ] Confirm public repository loads without authentication.
- [ ] If available on the plan, enable/verify main branch protection/ruleset after public release.

## G. Submission assets

- [ ] Capture hero/board screenshot.
- [ ] Capture issue-to-bounty screenshot.
- [ ] Capture funding confirmation screenshot.
- [ ] Capture merged PR + `VERIFIED` screenshot.
- [ ] Capture final `PAID` screenshot.
- [ ] Record 60–90 second demo using `docs/DEMO_RUNBOOK.md`.
- [ ] Replace placeholders in `docs/SUBMISSION_FORM.md`.
- [ ] Publish Skool post using `docs/PROMOTION_COPY.md`.
- [ ] Publish at least one public social post.
- [ ] Save direct Skool/social URLs.

## H. Submit

- [ ] Open the current Cycle 2 submission portal.
- [ ] Paste canonical answers from `docs/SUBMISSION_FORM.md`.
- [ ] Supply live Mini App URL.
- [ ] Supply public GitHub repository URL.
- [ ] Supply demo video URL if requested/available.
- [ ] Supply Skool promotion URL.
- [ ] Supply public social post URL.
- [ ] Re-check every submitted URL in a signed-out browser where appropriate.
- [ ] Submit before the deadline.
- [ ] Save submission confirmation/evidence.

## Definition of finished

Only call MergeEarn competition-ready when sections A–H that apply to the current portal are complete, the real E2E reaches `PAID`, and the public/MIT release is live.
