import { Bounty } from './api';

export type PublicBountyFilter = 'all' | 'open' | 'paid';

export function publicBountySummary(description: string) {
  const cleaned = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^#{1,6}\s+/, '').replace(/^[-*+]\s+/, ''))
    .filter((line) => !/^(goal|summary|description|acceptance criteria):?$/i.test(line))
    .join(' ')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/(\*\*|__|\`)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || 'Open the linked GitHub issue to review this bounty.';
}

export function prioritizePublicBounties(bounties: Bounty[]) {
  return [...bounties].sort((left, right) => {
    const leftRank = left.status === 'FUNDED' ? 0 : 1;
    const rightRank = right.status === 'FUNDED' ? 0 : 1;
    return leftRank - rightRank;
  });
}

export function filterPublicBounties(bounties: Bounty[], filter: PublicBountyFilter) {
  const prioritized = prioritizePublicBounties(bounties);
  if (filter === 'paid') return prioritized.filter((bounty) => bounty.status === 'PAID');
  if (filter === 'open') return prioritized.filter((bounty) => bounty.status !== 'PAID');
  return prioritized;
}

export function publicLifecycleProgress(status: string) {
  if (status === 'FUNDED') return { label: 'Ready to claim', step: 2, total: 5 };
  if (status === 'CLAIMED') return { label: 'Work in progress', step: 3, total: 5 };
  if (status === 'PR_SUBMITTED') return { label: 'PR submitted', step: 3, total: 5 };
  if (status === 'VERIFIED') return { label: 'Merge verified', step: 4, total: 5 };
  if (status === 'APPROVED') return { label: 'Payout approved', step: 4, total: 5 };
  if (status === 'PAID') return { label: 'Paid', step: 5, total: 5 };
  if (status === 'READY_TO_FUND') return { label: 'Waiting for funding', step: 1, total: 5 };
  if (status === 'PAYMENT_FAILED') return { label: 'Payout retry needed', step: 4, total: 5 };
  return { label: status.replaceAll('_', ' ').toLowerCase(), step: 1, total: 5 };
}

export function publicBountyShareUrl(id: string, origin: string) {
  return `${origin.replace(/\/$/, '')}/?bounty=${encodeURIComponent(id)}#live-bounties`;
}

export interface ProofGlossaryEntry {
  term: 'FUNDED' | 'MERGED_VERIFIED' | 'PAID';
  title: string;
  badge: string;
  description: string;
  authority: string;
  source: 'Nimiq' | 'GitHub';
}

export function publicProofGlossary(): ProofGlossaryEntry[] {
  return [
    {
      term: 'FUNDED',
      title: 'Funded',
      badge: 'FUNDED',
      description: 'Reward funds are escrowed and locked before contributor work begins.',
      authority: 'Nimiq blockchain transaction verification',
      source: 'Nimiq',
    },
    {
      term: 'MERGED_VERIFIED',
      title: 'Merged / Verified',
      badge: 'MERGED / VERIFIED',
      description: 'Pull request is cleanly merged into the repository default branch and verified via GitHub API.',
      authority: 'GitHub repository merge & commit proof',
      source: 'GitHub',
    },
    {
      term: 'PAID',
      title: 'Paid',
      badge: 'PAID',
      description: 'Payout transaction is confirmed on-chain and transferred directly to the contributor wallet.',
      authority: 'Nimiq blockchain settlement confirmation',
      source: 'Nimiq',
    },
  ];
}

