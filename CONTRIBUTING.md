# Contributing

Thanks for contributing to MergeEarn.

## Read first

Before making changes, read:

1. `AGENTS.md`
2. `PROJECT_PLAN.md`
3. `ARCHITECTURE.md`
4. `ROADMAP.md`
5. `docs/DECISIONS.md`
6. `docs/NEXT_SESSION.md`

## Development setup

Use Node.js 22.

```bash
npm ci
npm run typecheck
npm test
npm run scan:secrets
npm run build
```

Copy `.env.example` to `.env.local` for local development. Never commit `.env.local` or any real credential.

## Change rules

- Keep GitHub as the canonical source of code-work state.
- Keep Nimiq as the canonical source of payment state.
- AI must remain advisory and must never authorize payment.
- Do not add client-side shortcuts that can mark a bounty `FUNDED`, `VERIFIED`, `APPROVED`, or `PAID` without trusted-server validation.
- Preserve action-specific authorization. Funding remains creator-controlled; verify/approve/pay require the appropriate claimant/maintainer authorization defined by the backend policy.
- Do not weaken canonical PR checks for repository, expected base branch, merge state, or head identity.
- Do not weaken transaction checks for recipient, amount, sender where applicable, execution result, or chain inclusion.
- Preserve idempotency and duplicate-payout protections.
- Never store or request a Nimiq seed phrase/private key.

## Pull requests

A pull request should:

- explain the user-visible and trust-boundary impact;
- include or update tests for security/payment behavior;
- pass typecheck, tests, secret scan and production build;
- avoid unrelated refactors in payment/auth changes;
- update persistent docs when changing architecture, release state, or operating decisions.

## Security-sensitive changes

Changes to authentication, repository authorization, bounty state transitions, funding, payout, encryption, database privileges, or Nimiq transaction verification require explicit review of the trust boundary and tests covering failure paths.

See `SECURITY.md` for vulnerability handling and release requirements.


## Community-sponsored bounties

MergeEarn keeps a small set of contributor-friendly issues eligible for a 5 NIM community-sponsored bounty. Check the live app before starting work:

https://mergeearn.vercel.app

A task is a real bounty only after the live app shows it as `FUNDED`. Funding is approved by the sponsor in Nimiq Pay and independently verified by MergeEarn. Do not rely on screenshots, comments, or promises as payment proof.

Current sponsor-eligible issues: #26, #27, #28, #31.

Self-updating live board: https://github.com/Saidur-droid/MergeEarn/issues/33

GitHub contributor discovery: https://github.com/Saidur-droid/MergeEarn/contribute
