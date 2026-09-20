import { Bounty } from './api';

export type PublicBountyFilter = 'all' | 'open' | 'paid';

export interface PublicBountyLifecycleCue {
  step: 'funded' | 'claimed' | 'verified' | 'paid' | 'open';
  label: string;
  detail: string;
}

export function publicBountyLifecycleCue(status: string): PublicBountyLifecycleCue {
  const normalized = (status || '').toUpperCase();
  switch (normalized) {
    case 'PAID':
      return { step: 'paid', label: 'Paid', detail: 'Reward settled on-chain' };
    case 'VERIFIED':
    case 'APPROVED':
      return { step: 'verified', label: 'Approved', detail: 'PR verified & approved for payout' };
    case 'CLAIMED':
    case 'PR_SUBMITTED':
      return { step: 'claimed', label: 'In Review', detail: 'PR submitted by contributor' };
    case 'FUNDED':
      return { step: 'funded', label: 'Funded', detail: 'Ready for solution & PR' };
    default:
      return { step: 'open', label: 'Open', detail: 'Awaiting contribution' };
  }
}

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

export function filterPublicBounties(bounties: Bounty[], filter: PublicBountyFilter) {
  if (filter === 'paid') return bounties.filter((bounty) => bounty.status === 'PAID');
  if (filter === 'open') return bounties.filter((bounty) => bounty.status !== 'PAID');
  return bounties;
}

export function publicBountyShareUrl(id: string, origin: string) {
  return `${origin.replace(/\/$/, '')}/?bounty=${encodeURIComponent(id)}#live-bounties`;
}
