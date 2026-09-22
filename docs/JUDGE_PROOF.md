# MergeEarn — 60-second judge proof

This page is intentionally short. Every claim below points to a public source of truth.

## Product claim

**GitHub proves the work. Nimiq proves the money.**

MergeEarn turns a real GitHub issue into a funded NIM bounty and does not mark the lifecycle paid until the expected work and payment have both been independently verified.

## Verify the completed lifecycle

1. **Source issue**  
   https://github.com/Saidur-droid/MergeEarn/issues/1

2. **Merged pull request**  
   https://github.com/Saidur-droid/MergeEarn/pull/5

3. **Confirmed funding transaction**  
   https://nimiq.watch/#e0aecb2d9afeaa219171b5bebb9e53b438fd4031f34c6dbb91d9bd954a596345

4. **Confirmed payout transaction**  
   https://nimiq.watch/#7dd3034da59c8d28a3ecb14fed4d88325cd20d2795ca218cae4aa6b113437f86

5. **Live public bounty proof**  
   https://mergeearn.vercel.app/?bounty=2786293f-4036-4b72-ad19-852a42c04892#live-bounties

6. **Live product metrics**  
   https://mergeearn.vercel.app/api/metrics

## What the browser is not trusted to do

The browser cannot self-report:
- `FUNDED`
- GitHub `VERIFIED`
- `PAID`

Funding and payout transaction recipient/amount/execution/inclusion are checked server-side against Nimiq. The payout path also checks the expected sender. Pull-request repository, expected base branch and merged state are checked against GitHub.

## Current community growth loop

Self-updating bounty board:  
https://github.com/Saidur-droid/MergeEarn/issues/33

GitHub contributor discovery:  
https://github.com/Saidur-droid/MergeEarn/contribute

Current sponsor-eligible issues:
- #55
- #56
- #57
- #58

A task only becomes paid work after the live product reports it as `FUNDED`.

## Reliability

- CI: typecheck, tests, build and secret scanning
- Production smoke monitoring: every 15 minutes
- Community bounty board synchronization: every 15 minutes
- Judge Ops review: hourly
- Public source: MIT licensed

Production: https://mergeearn.vercel.app  
Source: https://github.com/Saidur-droid/MergeEarn
