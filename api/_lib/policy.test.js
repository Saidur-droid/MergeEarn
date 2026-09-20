import { describe, expect, it } from 'vitest';
import { assertExpectedPullRequest, canReplacePaymentReference, isPayoutEligible, pullRequestVerificationStatus } from './policy.js';

describe('pull request verification policy', () => {
  const pr = {
    id: 10,
    number: 4,
    base: { ref: 'main', repo: { full_name: 'acme/project' } },
    head: { sha: 'abc123' },
  };

  it('accepts the expected repository and base branch', () => {
    expect(assertExpectedPullRequest(pr, 'Acme/Project', 'main')).toBe(true);
  });

  it('rejects a PR targeting another repository', () => {
    expect(() => assertExpectedPullRequest(pr, 'acme/other', 'main')).toThrow('must target acme/other');
  });

  it('rejects a PR targeting another branch', () => {
    expect(() => assertExpectedPullRequest(pr, 'acme/project', 'develop')).toThrow('must target develop');
  });

  it('keeps an unmerged pull request pending instead of verified', () => {
    expect(pullRequestVerificationStatus({ merged: false })).toBe('PENDING');
    expect(pullRequestVerificationStatus({ merged: true })).toBe('VERIFIED');
  });
});

describe('payment retry policy', () => {
  it('never replaces a confirmed payment reference', () => {
    expect(canReplacePaymentReference({ status: 'CONFIRMED', provider_reference: 'tx-a' }, 'tx-b')).toBe(false);
  });

  it('does not replace a different pending reference', () => {
    expect(canReplacePaymentReference({ status: 'PENDING', provider_reference: 'tx-a' }, 'tx-b')).toBe(false);
  });

  it('allows a failed attempt to be retried with a new reference', () => {
    expect(canReplacePaymentReference({ status: 'FAILED', provider_reference: 'tx-a' }, 'tx-b')).toBe(true);
  });

  it('only allows payout after approval or a retryable payment failure', () => {
    expect(isPayoutEligible('APPROVED')).toBe(true);
    expect(isPayoutEligible('PAYMENT_FAILED')).toBe(true);
    expect(isPayoutEligible('VERIFIED')).toBe(false);
    expect(isPayoutEligible('PAID')).toBe(false);
  });
});
