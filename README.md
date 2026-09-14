# MergeEarn

> **Fund issues. Reward merges.**

MergeEarn turns GitHub issues into funded, verifiable bounties. Maintainers fund an issue, contributors solve it through a pull request, and payout is released only after GitHub work state and Nimiq payment state are independently verified.

## Core loop

**Issue -> Bounty -> Fund -> Fix -> Pull Request -> Verify -> Merge -> Approve -> Pay**

## Competition MVP

The production vertical slice includes:

- GitHub OAuth authentication
- server-side maintainer/repository permission checks
- authorized public repository and issue selection
- canonical GitHub repository/issue IDs in PostgreSQL-compatible persistence
- AI-assisted issue-to-bounty drafting with schema validation and manual-safe fallback
- explicit server-enforced bounty state transitions
- contributor claim flow with payout address capture
- canonical pull-request repository/base-branch/merge verification
- Nimiq Pay funding request from the Mini App SDK
- server-side Nimiq transaction confirmation before `FUNDED`
- explicit maintainer approval before payout
- idempotent payout intent with sender/recipient/amount verification before `PAID`
- audit events and payment transaction records
- compact competition metrics dashboard
- mobile-first maintainer and contributor UX

AI is advisory only. GitHub is the code-work source of truth. Nimiq is the payment source of truth.

## Stack

- React + TypeScript + Vite
- Vercel Functions for the trusted API layer
- Supabase/PostgreSQL for persistence and audit records
- GitHub OAuth + REST API
- official `@nimiq/mini-app-sdk`
- Nimiq JSON-RPC for canonical transaction verification
- optional OpenAI-compatible AI endpoint for bounty drafting
- Vitest + GitHub Actions CI

## Local development

1. Install Node.js 22 and run `npm install`.
2. Copy `.env.example` to `.env.local` and fill the required values.
3. Apply `supabase/migrations/202609140001_core.sql` to a dedicated Supabase project.
4. Create a GitHub OAuth App whose callback is `http://localhost:5173/api/auth/github/callback` when using a local Vercel-compatible dev server.
5. Run through Vercel dev tooling so `/api/*` functions and Vite are served together, or deploy a preview to Vercel.

Never put a service-role key, GitHub client secret, AI API key, session encryption secret, private key, or wallet seed in `VITE_*` variables or browser code.

## Required production environment

See `.env.example`. The important contract is:

- `APP_URL`: canonical HTTPS app URL
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`: GitHub OAuth App
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: trusted persistence access
- `SESSION_ENCRYPTION_KEY`: long random secret used to encrypt stored GitHub access tokens
- `VITE_NIMIQ_FUNDING_ADDRESS` and `NIMIQ_FUNDING_ADDRESS`: same public funding recipient
- `NIMIQ_PAYOUT_SOURCE_ADDRESS`: public wallet address authorized to release payouts
- `NIMIQ_RPC_URL`: trusted Nimiq JSON-RPC endpoint
- optional `AI_API_URL`, `AI_API_KEY`, `AI_MODEL`: AI copilot provider

The payout wallet signs in the Nimiq user experience; no private key is stored by MergeEarn.

## Database and security model

The browser does not connect to Supabase directly. All persistence calls are made by trusted server functions using the service-role key. RLS is enabled on application tables with no anonymous browser policies. Important state transitions are also guarded by a PostgreSQL trigger/function so an invalid payment-state transition cannot be silently written around the application layer.

GitHub access tokens are encrypted at rest with AES-256-GCM using `SESSION_ENCRYPTION_KEY`; only a hash of the browser session token is stored. OAuth uses a short-lived state cookie, and production cookies are `HttpOnly`, `SameSite=Lax`, and `Secure`.

## Quality commands

```bash
npm run typecheck
npm test
npm run build
```

GitHub Actions runs all three for pull requests to `main`.

## Definition of production-ready for this project

Do not call the product 100% complete until the deployed environment has real credentials/configuration and a person successfully performs:

1. GitHub sign-in.
2. Authorized repository + issue selection.
3. Bounty creation and review.
4. Nimiq funding transaction.
5. Independent server-side funding confirmation.
6. Contributor claim.
7. Real pull request submission.
8. Server-side repository/base-branch/merged verification.
9. Maintainer approval.
10. Idempotent Nimiq payout.
11. Independent server-side payout confirmation.
12. Persisted audit/transaction records and passing CI.

## Human + AI operating guide

Before implementation work, read:

1. `AGENTS.md`
2. `PROJECT_PLAN.md`
3. `ARCHITECTURE.md`
4. `ROADMAP.md`
5. `docs/DECISIONS.md`
6. `docs/NEXT_SESSION.md`

Those files are the persistent source of truth for humans and AI agents.
