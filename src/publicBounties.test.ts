import { describe, expect, it } from 'vitest';
import {
  filterPublicBounties,
  prioritizePublicBounties,
  publicBountyShareUrl,
  publicBountySummary,
  publicLifecycleProgress,
  publicProofGlossary,
} from './publicBounties';
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
      .toBe('https://mergeearn.vercel.app/?bounty=abc%20123#live-bounties');
  });

  it('provides compact proof glossary terms pointing to authoritative sources', () => {
    const glossary = publicProofGlossary();
    expect(glossary).toHaveLength(3);
    expect(glossary.map((entry) => entry.term)).toEqual(['FUNDED', 'MERGED_VERIFIED', 'PAID']);
    
    const funded = glossary.find((entry) => entry.term === 'FUNDED')!;
    expect(funded.title).toBe('Funded');
    expect(funded.description.toLowerCase()).toContain('funds');
    expect(funded.authority.toLowerCase()).toContain('nimiq');
    expect(funded.source).toBe('Nimiq');

    const merged = glossary.find((entry) => entry.term === 'MERGED_VERIFIED')!;
    expect(merged.title).toBe('Merged / Verified');
    expect(merged.description.toLowerCase()).toContain('pull request');
    expect(merged.authority.toLowerCase()).toContain('github');
    expect(merged.source).toBe('GitHub');

    const paid = glossary.find((entry) => entry.term === 'PAID')!;
    expect(paid.title).toBe('Paid');
    expect(paid.description.toLowerCase()).toContain('payout');
    expect(paid.authority.toLowerCase()).toContain('nimiq');
    expect(paid.source).toBe('Nimiq');
  });
});
