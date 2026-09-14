# Security Policy

MergeEarn handles GitHub OAuth credentials, encrypted session data, privileged database access, and Nimiq payment state. Security issues that could expose credentials, bypass authorization, falsify payment state, or create duplicate payouts are treated as release blockers.

## Supported release

The current `main` branch is the supported release line.

## Reporting a vulnerability

Do not open a public GitHub issue containing exploit details, secrets, wallet material, or active credentials.

For now, contact the repository owner privately through the GitHub profile associated with this repository and include:

- affected endpoint or component;
- impact and realistic attack path;
- reproduction steps that do not expose real secrets;
- whether credentials or funds may already be at risk;
- suggested remediation if known.

If a credential is suspected to be exposed, rotate/revoke it first. Do not wait for a code fix before invalidating a compromised secret.

## Sensitive material that must never be committed

- Supabase service-role / backend secret credentials
- GitHub OAuth client secret or GitHub personal access tokens
- Gemini / OpenAI-compatible API keys
- `SESSION_ENCRYPTION_KEY`
- Nimiq private keys, seed phrases, recovery words, login files or signing material
- plaintext OAuth access tokens
- database passwords

Public Nimiq `NQ...` addresses are not secret and may appear in configuration or documentation when needed.

## Security architecture

### GitHub

- OAuth state validation is required.
- GitHub access tokens are encrypted at rest using AES-256-GCM.
- Browser session tokens are stored only as hashes.
- Maintainer actions are re-authorized server-side against GitHub repository permissions.
- Pull-request trust checks validate repository, base branch and merged state against GitHub.

### Supabase

- The browser does not connect directly using privileged credentials.
- Production persistence calls originate from trusted server functions.
- RLS is enabled on application tables.
- Critical bounty state transitions are guarded by a database transition function/trigger.
- Privileged transition RPC access is restricted to trusted backend usage.

### Nimiq

- MergeEarn never stores a Nimiq private key or seed phrase.
- Funding and payout are signed in the Nimiq user experience.
- Client-reported success never directly creates `FUNDED` or `PAID`.
- The server verifies transaction recipient, amount, sender where applicable, execution result and chain inclusion.
- Payment transactions use idempotency protections and duplicate confirmed payout protection.

## Release security gates

Before public release:

1. Run `npm run scan:secrets` with full git history available.
2. Run `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`.
3. Confirm production credentials exist only in secret stores/environment configuration.
4. Confirm no browser bundle contains server secrets.
5. Run a real funding and payout E2E and inspect runtime logs.
6. Confirm unauthorized users cannot approve or pay.
7. Confirm invalid/wrong-chain payment data cannot advance state.
8. Confirm no duplicate confirmed payout can be persisted.

See `docs/SECURITY_RELEASE_CHECKLIST.md` for the operator checklist.
