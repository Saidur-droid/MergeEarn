export const bountyStatuses = [
  'DRAFT',
  'READY_TO_FUND',
  'FUNDED',
  'CLAIMED',
  'PR_SUBMITTED',
  'VERIFIED',
  'APPROVED',
  'PAID',
  'CANCELLED',
  'EXPIRED',
  'DISPUTED',
  'PAYMENT_FAILED',
] as const;

export type BountyStatus = (typeof bountyStatuses)[number];

const transitions: Record<BountyStatus, readonly BountyStatus[]> = {
  DRAFT: ['READY_TO_FUND', 'CANCELLED'],
  READY_TO_FUND: ['FUNDED', 'CANCELLED', 'EXPIRED'],
  FUNDED: ['CLAIMED', 'CANCELLED', 'EXPIRED'],
  CLAIMED: ['PR_SUBMITTED', 'CANCELLED', 'EXPIRED'],
  PR_SUBMITTED: ['VERIFIED', 'CLAIMED', 'DISPUTED'],
  VERIFIED: ['APPROVED', 'DISPUTED'],
  APPROVED: ['PAID', 'PAYMENT_FAILED', 'DISPUTED'],
  PAYMENT_FAILED: ['APPROVED', 'DISPUTED'],
  PAID: [],
  CANCELLED: [],
  EXPIRED: [],
  DISPUTED: ['APPROVED', 'CANCELLED'],
};

export function canTransitionBounty(
  from: BountyStatus,
  to: BountyStatus,
): boolean {
  return transitions[from].includes(to);
}

export function assertBountyTransition(
  from: BountyStatus,
  to: BountyStatus,
): void {
  if (!canTransitionBounty(from, to)) {
    throw new Error(`Invalid bounty transition: ${from} -> ${to}`);
  }
}

export type Bounty = {
  id: string;
  sourceIssueId: string;
  repositoryId: string;
  creatorUserId: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  rewardAmount: string;
  rewardAsset: string;
  status: BountyStatus;
  createdAt: string;
  updatedAt: string;
};
