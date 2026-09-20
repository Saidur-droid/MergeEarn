import { describe, expect, it } from 'vitest';
import { filterPublicBounties, publicBountyShareUrl, publicBountySummary } from './publicBounties';
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

  it('creates a canonical share URL', () => {
    expect(publicBountyShareUrl('abc 123', 'https://mergeearn.vercel.app/'))
      .toBe('https://mergeearn.vercel.app/?bounty=abc%20123#live-bounties');
  });
});
