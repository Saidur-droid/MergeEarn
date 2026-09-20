# Release Checklist

This is the final operator checklist for the Nimiq Mini Apps Competition Cycle 2 release. Checked items below were observed during the 2026-09-15 production test unless otherwise noted.

## A. Code and CI

- [x] Production vertical slice implemented.
- [x] GitHub authorization hardening implemented.
- [x] Exact dependency versions and `package-lock.json` committed.
- [x] CI uses `npm ci`.
- [x] Supabase security/performance hardening migration committed.
- [x] Latest cleanup/documentation `main` CI passes secret scan, typecheck, tests and build.

## B. Infrastructure

- [x] Dedicated Supabase production project created.
- [x] Core schema migration applied.
- [x] Supabase security/performance hardening applied.
- [x] Nimiq RPC selected and exercised by deployed verification.
- [x] Supabase production URL + backend credential configured in Vercel.
- [x] GitHub production OAuth App created.
- [x] GitHub client ID/secret configured in Vercel.
- [x] Session-encryption secret configured in Vercel.
- [x] Funding/payout public Nimiq addresses configured for the tested environment.
- [x] AI fallback path is acceptable if the optional provider is unavailable.

## C. Deploy

- [x] Latest tested `main` deployed to Vercel Production.
- [x] Production deployment reached READY.
- [x] Canonical production domain `https://mergeearn.vercel.app` resolves to production.
- [x] GitHub OAuth login/callback completes.
- [x] Repository and issue lists load.
- [x] Supabase persistence works across the bounty lifecycle.
- [x] Nimiq RPC verification works from the deployed trusted server.

## D. Real E2E

- [x] Maintainer signed in.
- [x] Maintainer selected a real public repository + issue.
- [x] Bounty was created and published.
- [x] Nimiq funding was signed in Nimiq Pay testnet.
- [x] Server independently verified funding before `FUNDED`.
- [x] Contributor claim recorded with a public Nimiq payout address.
- [x] Real PR #5 was created against `main`.
- [x] PR was submitted to MergeEarn.
- [x] PR was merged on GitHub.
- [x] Verified lifecycle reached the GitHub-verified state before approval.
- [x] Authorized maintainer approval was recorded.
- [x] Payout was signed through Nimiq Pay testnet.
- [x] Server independently verified payout before `PAID`.
- [x] Payment records and lifecycle state reflect completion.
- [x] Final bounty status is `PAID`; claim status is `COMPLETED`.
- [ ] Final Vercel runtime-error/log review after the very latest deployment.

## E. Judge-facing QA

- [x] Intended Nimiq Pay Mini App/WebView experience tested on mobile.
- [x] Funding retry/failure handling exercised during live debugging.
- [x] Payout retry/failure handling exercised and existing confirmed transaction safely re-verified.
- [x] Automated wrong-repository/wrong-base/unmerged-PR negative-path pass recorded in CI (PR #38).
- [x] Automated cancelled-bounty/wrong-amount/pending-confirmation payment negative-path pass recorded in CI (PR #38).
- [x] Automated non-maintainer repository-authorization rejection is covered in CI; approve/payout both require the same server-side maintainer assertion (PR #38).
- [ ] AI-provider failure fallback explicitly re-tested in production.

## F. Security/public release

- [x] Repository is public.
- [x] MIT `LICENSE` is present.
- [x] Public repository loads through GitHub.
- [x] CI includes repository/history secret scanning.
- [ ] Rotate any credential or recovery material ever exposed outside its intended secret store.
- [ ] Rotate `SESSION_ENCRYPTION_KEY` before final submission because a prior value was exposed in chat history.
- [ ] Use a fresh wallet/recovery setup for any real-value mainnet funds because prior wallet recovery material was exposed in chat screenshots.
- [ ] Re-run/confirm security checklist after those rotations.

## G. Submission assets

- [ ] Capture final hero/board screenshot.
- [ ] Capture issue-to-bounty screenshot.
- [ ] Capture funding confirmation screenshot.
- [ ] Capture merged PR + verified screenshot.
- [ ] Capture final `PAID` screenshot.
- [x] Demo video published and publicly re-verified: `https://youtube.com/shorts/xf0TRhqKeUE`.
- [x] Canonical live URL and GitHub URL filled in `docs/SUBMISSION_FORM.md`.
- [x] Skool `Promote Your Work` post is publicly reachable from the recorded profile/community URL.
- [x] Public X post is reachable: `https://x.com/Rifatncr7/status/2100430329886745073`.
- [x] Demo, Skool, X, live-app, repository and showcase URLs are recorded in `docs/SUBMISSION_FORM.md`.

## H. Submit

- [x] Cycle 2 portal submission completed.
- [x] Canonical submission answers supplied.
- [x] Live Mini App URL supplied.
- [x] Public GitHub repository URL supplied.
- [x] Demo video URL published and recorded.
- [x] Skool promotion URL published and recorded.
- [x] Public social post URL published and recorded.
- [x] Public/signed-out URL re-check completed on 2026-09-20 for live app, repository, demo, Skool evidence, X post and official showcase entry.
- [x] Submitted before the Cycle 2 deadline.
- [x] Public Cycle 2 showcase listing serves as submission evidence.

## Definition of finished

The core product is proven end-to-end through `PAID`. Core competition evidence is live and publicly re-verified. Remaining operational hardening items are the Vercel runtime-log review, production AI-fallback retest, and secret/wallet rotations that require secure account-level secret-store or wallet control.
