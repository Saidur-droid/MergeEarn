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

References:

- `https://www.skool.com/miniappscompetition/cycle-2-scoring-everything-you-need-to-know`
- `https://www.skool.com/miniappscompetition/end-of-week-1-is-your-idea-locked-in`
- `https://www.nimiq.com/blog/the-nimiq-mini-apps-competition-registration-is-open/`

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
- [x] Main CI green after production-hardening merge
- [x] Dedicated Supabase production project created
- [x] Core schema migration applied
- [x] Supabase security/performance hardening migration applied
- [x] Nimiq RPC URL chosen and smoke-tested by the release agent
- [ ] Vercel production project/environment fully reachable from the active operator session
- [ ] `SUPABASE_URL` in Vercel Production
- [ ] `SUPABASE_SERVICE_ROLE_KEY` in Vercel Production
- [ ] GitHub production OAuth App created
- [ ] `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` in Vercel Production
- [ ] Treasury public Nimiq address configured for funding + payout
- [ ] Production deployment READY
- [ ] GitHub OAuth login verified live
- [ ] Real Issue → Fund → Claim → PR → Merge → Approve → Pay E2E passed
- [ ] Runtime logs checked after E2E
- [ ] Secret/history scan passed
- [ ] Owner explicitly approved MIT License + public repository
- [ ] MIT License added
- [ ] Repository made public
- [ ] README updated with live URL and test instructions
- [ ] Mini App submitted via Cycle 2 portal
- [ ] Skool promotion post published
- [ ] Public social post published

## Definition of done

Do not describe MergeEarn as fully production-ready until the deployed, live environment completes the real end-to-end flow and the server independently confirms both funding and payout transactions.
