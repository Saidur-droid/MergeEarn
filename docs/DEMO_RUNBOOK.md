# Demo Runbook

This runbook is for the final release operator, competition judges, and anyone recording the 60–90 second product walkthrough.

## Goal

Prove the complete trust chain without screenshots or manual database edits:

`GitHub issue -> funded bounty -> contributor claim -> real PR -> merged verification -> maintainer approval -> NIM payout -> PAID`

## Preconditions

- Production URL is deployed and reachable.
- GitHub OAuth production callback is configured.
- Supabase production credentials are present in Vercel.
- `VITE_NIMIQ_FUNDING_ADDRESS` and `NIMIQ_FUNDING_ADDRESS` match the same public treasury address.
- `NIMIQ_PAYOUT_SOURCE_ADDRESS` is the public address of the wallet that will sign the payout.
- `NIMIQ_RPC_URL` has been tested for network health and `getTransactionByHash`.
- Use the smallest practical NIM bounty for release validation.
- Prefer two GitHub identities for the final role-separation test: one maintainer and one contributor.
- Never expose a seed phrase, private key, service-role key, OAuth client secret, or session encryption key in the recording.

## Full end-to-end validation

1. Open MergeEarn in the intended Nimiq Pay Mini App environment.
2. Sign in with the maintainer GitHub account.
3. Select an authorized public repository and a real open issue.
4. Generate the bounty draft, review/edit acceptance criteria, and set a small NIM reward.
5. Publish the bounty.
6. Fund it through Nimiq Pay.
7. Confirm the UI does not mark the bounty `FUNDED` until the server verifies the transaction.
8. Switch to the contributor account and claim the funded bounty with the contributor public Nimiq payout address.
9. Create the real implementation branch/commit and open a PR against the expected base branch.
10. Submit the PR URL to MergeEarn.
11. Merge the PR on GitHub.
12. Trigger/refresh verification in MergeEarn as an authorized maintainer or claimant.
13. Confirm the server verifies the expected repository, base branch and merged state before `VERIFIED`.
14. As an authorized repository maintainer, approve the verified work.
15. Initiate payout and sign it in Nimiq Pay from the configured payout-source wallet.
16. Confirm MergeEarn does not show `PAID` until the server independently verifies sender, recipient, amount and chain inclusion.
17. Confirm transaction records, audit events and metrics reflect the completed lifecycle.
18. Inspect Vercel runtime errors/logs after the flow.

Do not force state transitions directly in the database. A successful demo is only valid when the real APIs and chain verification move the state.

## 60–90 second competition demo script

### 0–10s — Problem + promise

Show the MergeEarn landing/board.

Narration: "MergeEarn turns real GitHub issues into funded NIM bounties, then pays contributors only after the expected pull request is actually merged and verified."

### 10–25s — Create from GitHub

Show GitHub sign-in, repository/issue selection, and the editable bounty draft.

Narration: "The maintainer selects an authorized repository and a real issue. GitHub is the source of truth for the work, and the bounty spec remains editable."

### 25–40s — Fund through Nimiq Pay

Show the NIM reward and Nimiq Pay confirmation.

Narration: "Funding happens through Nimiq Pay. The browser cannot simply claim payment succeeded; MergeEarn verifies the transaction before marking the bounty funded."

### 40–58s — Claim, PR and merge verification

Show contributor claim, PR URL, merged GitHub PR and `VERIFIED` state.

Narration: "A contributor claims the bounty and submits the real PR. MergeEarn re-checks the repository, target branch and merged state directly against GitHub."

### 58–75s — Approve and pay

Show maintainer approval and Nimiq payout signing.

Narration: "Only after verified work can a repository maintainer approve payout. Nimiq Pay signs the payment, and the server verifies it before `PAID`."

### 75–90s — Evidence + close

Show final `PAID` state / metrics / audit trail.

Narration: "Two sources of truth: GitHub proves the work, Nimiq proves the money. No screenshots, no manual payout spreadsheet."

## Failure-state checks before submission

Validate at least once that:

- cancelling Nimiq funding does not create a false `FUNDED` state;
- a wrong transaction recipient/amount is rejected;
- a PR from the wrong repository or base branch is rejected;
- an unmerged PR cannot become `VERIFIED`;
- a non-maintainer cannot approve or pay;
- a duplicate confirmed payout cannot be created;
- AI-provider failure falls back to the deterministic editable bounty draft;
- an expired/invalid GitHub session returns a clear authentication error instead of crashing.

## Evidence to capture

Keep these artifacts for the submission and promotion package:

- landing/board screenshot;
- issue-to-bounty screenshot;
- Nimiq Pay funding confirmation screenshot with sensitive values hidden if necessary;
- merged PR + MergeEarn verified state screenshot;
- final `PAID` state screenshot;
- 60–90 second vertical/mobile-friendly video;
- live URL;
- public GitHub URL;
- Skool promotion URL;
- public social post URL.

## Pass condition

The release candidate passes only when the real deployed path reaches `PAID`, the server independently verifies both money-sensitive transactions, latest CI is green, and there are no blocking runtime errors.
