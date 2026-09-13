import { describe, expect, it } from 'vitest';
import { assertBountyTransition, canTransitionBounty } from './bounty';

describe('bounty state machine', () => {
  it('allows the happy path', () => {
    const path = [
      ['DRAFT', 'READY_TO_FUND'],
      ['READY_TO_FUND', 'FUNDED'],
      ['FUNDED', 'CLAIMED'],
      ['CLAIMED', 'PR_SUBMITTED'],
      ['PR_SUBMITTED', 'VERIFIED'],
      ['VERIFIED', 'APPROVED'],
      ['APPROVED', 'PAID'],
    ] as const;

    for (const [from, to] of path) {
      expect(canTransitionBounty(from, to)).toBe(true);
    }
  });

  it('blocks payout before approval', () => {
    expect(canTransitionBounty('VERIFIED', 'PAID')).toBe(false);
    expect(() => assertBountyTransition('VERIFIED', 'PAID')).toThrow(
      'Invalid bounty transition: VERIFIED -> PAID',
    );
  });

  it('does not allow a paid bounty to transition again', () => {
    expect(canTransitionBounty('PAID', 'APPROVED')).toBe(false);
  });

  it('allows retry after a payment failure only through approval', () => {
    expect(canTransitionBounty('PAYMENT_FAILED', 'APPROVED')).toBe(true);
    expect(canTransitionBounty('PAYMENT_FAILED', 'PAID')).toBe(false);
  });
});
