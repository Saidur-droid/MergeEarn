# MergeEarn

> **Fund issues. Reward merges.**

MergeEarn turns real GitHub issues into funded NIM bounties. Maintainers fund work, contributors solve it through a pull request, and payout is released only after GitHub work state and Nimiq payment state are independently verified.

**Core loop:** `Issue -> Bounty -> Fund -> Claim -> Pull Request -> Merge -> Verify -> Approve -> Pay`

## Why MergeEarn is different

Most bounty tools trust screenshots, manual status updates, or a maintainer-operated spreadsheet. MergeEarn connects two canonical sources of truth instead:

- **GitHub is the work source of truth.** The server validates repository permission, source issue identity, pull-request repository, expected base branch, and merged state.
- **Nimiq is the payment source of truth.** The browser cannot self-report `FUNDED` or `PAID`; the server verifies transaction sender/recipient/amount/execution/inclusion before money-sensitive state transitions.
- **AI is advisory only.** It can turn an issue into an editable bounty draft, but it never decides whether work is valid or payment is allowed.

## Competition release status

MergeEarn has completed a live deployed testnet end-to-end flow through the intended Nimiq Pay Mini App experience:

`Issue -> Bounty -> Fund -> Claim -> Pull Request -> Merge -> Verify -> Approve -> Pay`

Observed release state on 2026-09-15:

- Production app: `https://mergeearn.vercel.app`
- Public source: `https://github.com/Saidur-droid/MergeEarn`
- MIT License: present
- GitHub OAuth: live and working
- Repository and issue loading: live and working
- Nimiq Pay connection: verified in the Mini App container
- Funding: independently server-verified before `FUNDED`
- Pull request: linked, merged on GitHub, and server-verified before `VERIFIED`
- Payout: independently server-verified before `PAID`
- Completed bounty state: `PAID`

Before final competition submission, keep the latest `main` CI green, rotate any credential or wallet recovery material ever exposed outside its intended secret store, and inspect production runtime logs for new blocking errors.

## Judge / first-time user path

1. Open MergeEarn inside Nimiq Pay.
2. Sign in with GitHub.
3. Select a repository you are authorized to maintain and choose a real issue.
4. Generate or edit the bounty specification and set a NIM reward.
5. Publish and fund the bounty through Nimiq Pay.
6. A contributor claims it and submits the real pull request.
7. After the PR is merged, MergeEarn independently re-checks GitHub state.
8. A repository maintainer approves the verified work.
9. The configured payout wallet signs the NIM payout.
10. MergeEarn verifies the payout before marking the bounty `PAID`.

For the exact release/demo procedure, see [`docs/DEMO_RUNBOOK.md`](docs/DEMO_RUNBOOK.md).

## Competition submission material

- [`docs/COMPETITION_SUBMISSION.md`](docs/COMPETITION_SUBMISSION.md) — Cycle 2 positioning and release state
- [`docs/SUBMISSION_FORM.md`](docs/SUBMISSION_FORM.md) — ready-to-paste submission answers
- [`docs/PROMOTION_COPY.md`](docs/PROMOTION_COPY.md) — Skool/social launch copy
- [`docs/DEMO_RUNBOOK.md`](docs/DEMO_RUNBOOK.md) — demo and E2E runbook
- [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) — final release/submit sequence
- [`docs/SECURITY_RELEASE_CHECKLIST.md`](docs/SECURITY_RELEASE_CHECKLIST.md) — secret and security release gates

## Architecture

- **Frontend:** React + TypeScript + Vite
- **Mini App wallet integration:** official `@nimiq/mini-app-sdk`
- **Trusted API:** Vercel Functions under `/api/*`
- **Persistence / audit:** Supabase PostgreSQL
- **Code-work authority:** GitHub OAuth + REST API
- **Payment authority:** Nimiq Pay + server-side Nimiq JSON-RPC verification
- **Optional copilot:** OpenAI-compatible endpoint with structured manual-safe fallback
- **Quality:** Vitest + TypeScript + production build + deterministic lockfile + secret scan in GitHub Actions

## Security model

The browser never receives the Supabase service-role key or a wallet private key.

- GitHub access tokens are encrypted at rest with AES-256-GCM.
- Browser session tokens are stored only as hashes.
- OAuth uses a short-lived state cookie.
- Production cookies are `HttpOnly`, `SameSite=Lax`, and `Secure`.
- Important bounty transitions are enforced by application policy and a database transition guard.
- Funding/payout records use idempotency protections.
- RLS is enabled and the browser does not access Supabase directly.
- Repository/PR/payment claims are independently revalidated by the trusted server.
- CI includes a repository/work-history secret-pattern scan.

See [`SECURITY.md`](SECURITY.md) and [`docs/SECURITY_RELEASE_CHECKLIST.md`](docs/SECURITY_RELEASE_CHECKLIST.md).

## Local development

Requirements: Node.js 22 and a dedicated development configuration.

```bash
npm ci
npm run typecheck
npm test
npm run scan:secrets
npm run build
```

Copy `.env.example` to `.env.local`, fill the required values, apply the Supabase migrations, and run through Vercel-compatible local tooling so the `/api/*` functions and Vite frontend are served together.

For local GitHub OAuth, use a callback matching your local app URL, for example:

`http://localhost:5173/api/auth/github/callback`

Never commit `.env.local`, private keys, wallet seeds, service-role keys, OAuth client secrets, session encryption secrets, or AI API keys.

## Required production environment

See `.env.example`. The required contract is:

- `APP_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_ENCRYPTION_KEY`
- `VITE_NIMIQ_FUNDING_ADDRESS`
- `NIMIQ_FUNDING_ADDRESS`
- `NIMIQ_PAYOUT_SOURCE_ADDRESS`
- `NIMIQ_RPC_URL`

Optional AI configuration:

- `AI_API_URL`
- `AI_API_KEY`
- `AI_MODEL`

`VITE_NIMIQ_FUNDING_ADDRESS` and `NIMIQ_FUNDING_ADDRESS` must contain the same **public** funding address. MergeEarn never stores a Nimiq private key or seed phrase.

## Database migrations

Apply migrations in order:

1. `supabase/migrations/202609140001_core.sql`
2. `supabase/migrations/202609140002_security_performance_hardening.sql`

## Quality gates

GitHub Actions runs on pushes and pull requests to `main` and must pass:

- repository/history secret-pattern scan
- TypeScript typecheck
- Vitest tests
- production build

## Definition of done

A release is competition-ready when the deployed flow reaches `PAID`, CI is green, production runtime has no blocking errors, the public MIT repository is clean, and final competition assets/links required by the current submission portal are supplied.

## Contributing

Read [`AGENTS.md`](AGENTS.md) first for project operating rules, then [`CONTRIBUTING.md`](CONTRIBUTING.md). Payment-state and authorization changes require tests and must not weaken the GitHub/Nimiq trust boundaries.


## Contribute for verified NIM bounties

MergeEarn keeps a small set of contributor-friendly issues open for community sponsorship.

Current eligible issues:
- #25 — keyboard-visible focus states
- #26 — contributor onboarding note
- #27 — confirmed transaction-proof copy action
- #28 — public bounty accessibility labels

Open the live app first: https://mergeearn.vercel.app

A task is a real paid bounty only after the live app shows `FUNDED`. Sponsors approve their own Nimiq Pay transaction, MergeEarn independently verifies funding, contributors submit real GitHub pull requests, and payout remains subject to the verified merge + approval + Nimiq confirmation path.
