# Submission Form Answers

Use this file as the canonical copy source for the competition portal. The demo video is published; only the promotion URLs remain to be filled after those posts are published.

## Project name

MergeEarn

## Tagline

Fund issues. Reward merges.

## One-line pitch

MergeEarn turns real GitHub issues into funded NIM bounties and releases payment only after the expected pull request is merged and independently verified.

## Short description

MergeEarn lets maintainers convert real GitHub issues into funded NIM bounties. Contributors claim a bounty, submit the real pull request, and get paid only after the expected PR is merged, an authorized maintainer approves the work, and the Nimiq transaction is independently verified.

## Longer description

MergeEarn connects the two sources of truth that matter for open-source bounties: GitHub for the work and Nimiq for the money.

A maintainer signs in with GitHub, selects an authorized repository and a real issue, reviews an editable bounty specification, and funds the reward through Nimiq Pay. A contributor claims the bounty with a public Nimiq payout address and submits the real pull request. MergeEarn verifies that the PR belongs to the expected repository, targets the expected base branch, and is actually merged before allowing approval. Funding and payout states are independently verified against Nimiq, with sender/recipient/amount and chain-inclusion checks plus idempotency protections, so a browser cannot simply claim that payment succeeded.

The result is a compact, mobile-first bounty workflow that makes small open-source work easier to fund, verify and pay without screenshots or manual payout spreadsheets.

## Problem

Open-source maintainers need a practical way to attach money to real work without relying on screenshots, self-reported progress or payout spreadsheets. Contributors need confidence that successful work can be paid quickly and transparently.

## Solution

MergeEarn makes GitHub and Nimiq authoritative instead of trusting client-reported state. GitHub verifies the code-work lifecycle; Nimiq verifies the money lifecycle. A contributor becomes payable only after the expected PR is merged and an authorized maintainer approves it.

## Core user flow

Issue → Bounty → Fund → Claim → Pull Request → Merge → Verify → Approve → Pay

## Why Nimiq is essential

Nimiq Pay is the funding and payout rail for the bounty lifecycle. Funding is requested in Nimiq Pay and server-verified before `FUNDED`. Payout is signed from the configured wallet and server-verified before `PAID`. MergeEarn stores no private wallet key or seed phrase.

## Nimiq integration highlights

- Official `@nimiq/mini-app-sdk` integration
- Nimiq Pay wallet/account connection
- NIM funding transaction request
- Server-side JSON-RPC verification before `FUNDED`
- Recipient and amount verification
- Payout sender/recipient/amount verification
- Idempotent payout intent
- No private wallet key stored by MergeEarn

## GitHub integration highlights

- GitHub OAuth
- Server-side repository permission checks
- Authorized repository and issue selection
- Canonical repository/issue IDs
- PR repository verification
- Expected base-branch verification
- Merged-state verification before approval
- Maintainer capability checks for verify/approve/pay

## AI usage

AI is optional and advisory. It converts an issue into an editable structured bounty draft. If the AI provider is unavailable, MergeEarn uses a deterministic fallback. AI never decides whether work is valid or whether a payment may be released.

## Reliability / security highlights

- Explicit server-enforced bounty state machine
- Database transition guard
- Idempotent payment records
- GitHub access-token encryption at rest with AES-256-GCM
- Hash-only browser session-token persistence
- Canonical GitHub PR verification
- Independent Nimiq transaction verification
- RLS enabled; browser does not talk directly to Supabase
- Deterministic package lock and `npm ci`
- CI secret-pattern scan, typecheck, tests and production build

## Live app

`https://mergeearn.vercel.app`

Live OAuth, Nimiq Pay connection, funding, GitHub PR verification, and payout have been exercised in the deployed environment.

## Source code

`https://github.com/Saidur-droid/MergeEarn`

Public repository with MIT License.

## Demo video

`https://youtube.com/shorts/xf0TRhqKeUE`

## Skool promotion post

[SKOOL_POST_URL]

## Public social post

[SOCIAL_POST_URL]

## Builder / GitHub profile

`https://github.com/Saidur-droid`

## Suggested category / keywords

Open source, developer tools, GitHub, bounties, payments, Nimiq Pay, NIM, contribution rewards

## Judge test instructions

1. Open MergeEarn from the intended Nimiq Pay Mini App environment.
2. Sign in with GitHub.
3. Select a repository you maintain and choose a real issue.
4. Create or edit the bounty and set a small NIM reward.
5. Fund through Nimiq Pay.
6. Claim the bounty and submit a real PR.
7. Merge the PR.
8. Re-verify it in MergeEarn.
9. Approve as an authorized maintainer.
10. Sign the payout in Nimiq Pay and wait for server verification before `PAID`.

## Verified release evidence

- Live deployed flow reached `PAID` on 2026-09-15.
- Funding transaction was independently confirmed before `FUNDED`.
- PR #5 was linked and merged into `main`, then reflected in the verified bounty lifecycle.
- Payout transaction was independently confirmed before `PAID`.
- Latest `main` CI after documentation/cleanup changes passed secret scan, typecheck, tests and build.

## Final pre-submit fields

- [x] Live production URL confirmed
- [x] Public GitHub repository URL confirmed
- [x] E2E reached `PAID`
- [x] Repository CI green after cleanup
- [x] Owner-approved public + MIT release is live
- [x] Demo video URL added: `https://youtube.com/shorts/xf0TRhqKeUE`
- [ ] `[SKOOL_POST_URL]` added
- [ ] `[SOCIAL_POST_URL]` added
- [ ] Final production runtime-log review after the last deployment
