import { describe, expect, it } from 'vitest';
import { contributorOnboardingHint, contributorReliabilitySignals, filterPublicBounties, nimiqExplorerUrl, prioritizePublicBounties, publicBountyShareUrl, publicBountySummary, publicLifecycleProgress, publicProofGlossary, verifiedTransactionHistory } from './publicBounties';
import type { Bounty } from './api';

function bounty(status: string): Bounty {
  return {
    id: status.toLowerCase(),
    creator_user_id: '',
    repository_id: '',
    source_issue_id: '',
    title: status,
    description: '',
    acceptance_criteria: [],
    reward_amount_luna: 500000,
    reward_amount_nim: '5',
    reward_asset: 'NIM',
    status,
  };
}

describe('public bounty helpers', () => {
  it('removes markdown heading noise from public summaries', () => {
    expect(publicBountySummary('## Goal\nMake bounty cards readable.\n\n**Details** stay intact.'))
      .toBe('Make bounty cards readable. Details stay intact.');
  });

  it('filters open and paid public bounty states', () => {
    const items = [bounty('FUNDED'), bounty('CLAIMED'), bounty('PAID')];
    expect(filterPublicBounties(items, 'open').map((item) => item.status)).toEqual(['FUNDED', 'CLAIMED']);
    expect(filterPublicBounties(items, 'paid').map((item) => item.status)).toEqual(['PAID']);
    expect(filterPublicBounties(items, 'all')).toHaveLength(3);
  });

  it('prioritizes funded work while preserving relative order otherwise', () => {
    const items = [bounty('PAID'), bounty('CLAIMED'), bounty('FUNDED'), bounty('PR_SUBMITTED')];
    expect(prioritizePublicBounties(items).map((item) => item.status))
      .toEqual(['FUNDED', 'PAID', 'CLAIMED', 'PR_SUBMITTED']);
  });

  it('maps public lifecycle states to concise progress labels', () => {
    expect(publicLifecycleProgress('FUNDED')).toEqual({ label: 'Ready to claim', step: 2, total: 5 });
    expect(publicLifecycleProgress('PR_SUBMITTED')).toEqual({ label: 'PR submitted', step: 3, total: 5 });
    expect(publicLifecycleProgress('PAID')).toEqual({ label: 'Paid', step: 5, total: 5 });
  });

  it('creates a canonical share URL', () => {
    expect(publicBountyShareUrl('abc 123', 'https://mergeearn.vercel.app/'))
      .toBe('https://mergeearn.vercel.app/?bounty=abc+123#live-bounties');
    expect(publicBountyShareUrl('abc 123', 'https://mergeearn.vercel.app/', 'referral'))
      .toBe('https://mergeearn.vercel.app/?bounty=abc+123&src=referral#live-bounties');
  });

  it('creates a canonical Nimiq explorer URL for confirmed proof actions', () => {
    expect(nimiqExplorerUrl('tx hash/123')).toBe('https://nimiq.watch/#tx%20hash%2F123');
  });

  it('shows the compact contributor workflow only for funded bounties', () => {
    expect(contributorOnboardingHint('FUNDED')).toBe('claim → fix → PR → verified payout');
    expect(contributorOnboardingHint('CLAIMED')).toBeNull();
    expect(contributorOnboardingHint('PAID')).toBeNull();
  });

  it('explains critical proof states in plain language', () => {
    const glossary = publicProofGlossary();
    expect(glossary.map((entry) => entry.term)).toEqual(['FUNDED', 'MERGED_VERIFIED', 'PAID']);
    expect(glossary.find((entry) => entry.term === 'FUNDED')?.authority).toBe('Nimiq');
    expect(glossary.find((entry) => entry.term === 'MERGED_VERIFIED')?.authority).toBe('GitHub');
    expect(glossary.find((entry) => entry.term === 'PAID')?.authority).toBe('Nimiq');
  });
  it('builds transaction history from confirmed proof only', () => {
    const item = bounty('PAID');
    item.payment_transactions = [
      { id: 'fund', type: 'FUNDING', status: 'CONFIRMED', providerReference: 'abc' },
      { id: 'pending', type: 'PAYOUT', status: 'PENDING', providerReference: 'hidden' },
    ];
    expect(verifiedTransactionHistory([item])).toEqual([
      expect.objectContaining({ id: 'fund', type: 'FUNDING', explorerUrl: 'https://nimiq.watch/#abc' }),
    ]);
  });

  it('derives contributor reliability only from verified lifecycle data', () => {
    const paid = bounty('PAID');
    paid.submissions = [{ id: 's1', verification_status: 'VERIFIED', html_url: 'https://github.com/a/b/pull/1', merged_at: '2026-09-01T00:00:00Z', pr_author_login: 'alice' }];
    const pending = bounty('PR_SUBMITTED');
    pending.submissions = [{ id: 's2', verification_status: 'PENDING', html_url: 'https://github.com/a/b/pull/2', merged_at: null, pr_author_login: 'bob' }];
    expect(contributorReliabilitySignals([paid, pending])).toEqual([{ login: 'alice', verifiedMerges: 1, paidCompletions: 1 }]);
  });

});
