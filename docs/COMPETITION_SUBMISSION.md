# Nimiq Mini Apps Competition — Cycle 2 submission prep

_Last verified: 2026-09-15._

## Deadline and scoring

Cycle 2 submissions close **2026-09-18 at 23:59 UTC**. The competition states that the deadline is not a code freeze, so the Mini App may continue improving afterward, but it may be evaluated at any time after submission.

Current 100-point scorecard:

- **45 pts — Functionality, reliability & usefulness**
- **25 pts — Nimiq Pay & Nimiq integration**
- **15 pts — Real usage** based on unique Nimiq wallets opening the Mini App during the measurement period
- **10 pts — Design & UX**
- **5 pts — Builder promotion** (Skool + public social post)

Current submission portal: `https://miniappscompetition.com/submissions/cycle2`

## MergeEarn positioning

### One-line pitch

**MergeEarn turns real GitHub issues into funded NIM bounties and releases payment only after the expected pull request is actually merged and independently verified.**

### Problem

Open-source maintainers need a practical way to attach money to real work without relying on screenshots, self-reported status, or manual payout spreadsheets. Contributors need confidence that successful work can be paid quickly and transparently.

### Core loop

**Issue → Bounty → Fund → Claim → Pull Request → Merge → Verify → Approve → Pay**

### Why Nimiq is central

Nimiq Pay is the funding and payout rail for the bounty lifecycle. The browser never marks a bounty `FUNDED` or `PAID` from a client claim. The trusted server independently verifies the Nimiq transaction recipient, amount, sender where applicable, execution result, and chain inclusion before advancing payment state.

### Why GitHub is central

GitHub is the work source of truth. The server checks repository permissions and verifies that a submitted pull request belongs to the expected repository, targets the expected base branch, and is actually merged before a maintainer can approve payout.

### Reliability / safety highlights

- Server-enforced bounty state machine
- Database transition guard
- Idempotent funding and payout transaction records
- GitHub access-token encryption at rest with AES-256-GCM
- Canonical PR repository/base/merged verification
- Independent Nimiq transaction verification
- No private wallet key stored by MergeEarn
- RLS enabled; browser does not talk directly to Supabase
- Deterministic lockfile + `npm ci` CI

## Verified live release state

On 2026-09-15 the deployed production app completed the real Nimiq testnet lifecycle through Nimiq Pay:

`Issue → Bounty → Fund → Claim → Pull Request → Merge → Verify → Approve → Pay`

Verified evidence:

- Canonical production URL: `https://mergeearn.vercel.app`
- Public repository: `https://github.com/Saidur-droid/MergeEarn`
- MIT License present
- GitHub OAuth completed successfully
- Authorized repository and issue loading completed successfully
- Nimiq Pay Mini App wallet connection completed successfully
- Funding transaction independently verified before bounty reached `FUNDED`
- Real GitHub PR #5 linked and merged into `main`
- Bounty advanced through verified/approved states
- Payout transaction independently verified before bounty reached `PAID`
- Claim completed
- Latest cleanup/documentation CI passed secret scan, typecheck, tests and build

## Submission copy draft

### Title

MergeEarn — GitHub Issue Bounties Paid Through Nimiq

### Short description

MergeEarn lets maintainers convert real GitHub issues into funded NIM bounties. Contributors claim a bounty, submit the real pull request, and get paid only after the expected PR is merged, a maintainer approves the work, and the Nimiq transaction is independently verified.

### Longer description

MergeEarn connects the two sources of truth that matter for open-source bounties: GitHub for the work and Nimiq for the money. Maintainers select an authorized repository and issue, generate or edit a bounty specification, and fund it through Nimiq Pay. Contributors claim the bounty with their payout address and link a real pull request. MergeEarn then verifies the repository, target branch, and merged state directly against GitHub before allowing approval. Funding and payout states are independently verified against Nimiq, with sender/recipient/amount checks and idempotency protections so a browser cannot simply claim that a payment succeeded.

The result is a compact, mobile-first bounty workflow that makes small open-source work easier to fund, verify, and pay without spreadsheets or manual screenshots.

## Release checklist

- [x] Production vertical slice implemented
- [x] PR authorization hardening implemented
- [x] Deterministic dependency versions + lockfile
- [x] `npm ci` CI pipeline
- [x] Dedicated Supabase production project created and migrations applied
- [x] Nimiq RPC selected and exercised in deployed verification
- [x] Vercel production environment configured sufficiently for live E2E
- [x] GitHub production OAuth live
- [x] Treasury/funding/payout public addresses configured for the tested environment
- [x] Production deployment READY
- [x] GitHub OAuth login verified live
- [x] Real Issue → Fund → Claim → PR → Merge → Approve → Pay E2E reached `PAID`
- [x] Public GitHub repository live
- [x] MIT License live
- [x] README updated with canonical live URL and tested state
- [x] Latest cleanup CI green
- [ ] Rotate any credential/recovery material ever exposed outside its intended secret store
- [ ] Final production runtime-log review after the last deployment
- [ ] Demo video published
- [ ] Skool promotion post published
- [ ] Public social post published
- [ ] Cycle 2 portal submission completed

## Definition of done

The core product flow is proven end-to-end. Final competition submission readiness additionally requires the remaining security-rotation and submission-asset items above to be completed.
