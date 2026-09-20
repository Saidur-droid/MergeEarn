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

export function sortPublicBounties(bounties: Bounty[]) {
  return [...bounties].sort((a, b) => {
    const aActionable = a.status === 'FUNDED' ? 0 : 1;
    const bActionable = b.status === 'FUNDED' ? 0 : 1;
    return aActionable - bActionable;
  });
}

export function filterPublicBounties(bounties: Bounty[], filter: PublicBountyFilter) {
  let filtered = bounties;
  if (filter === 'paid') {
    filtered = bounties.filter((bounty) => bounty.status === 'PAID');
  } else if (filter === 'open') {
    filtered = bounties.filter((bounty) => bounty.status !== 'PAID');
  }
  return sortPublicBounties(filtered);
}

export function publicBountyShareUrl(id: string, origin: string) {
  return `${origin.replace(/\/$/, '')}/?bounty=${encodeURIComponent(id)}#live-bounties`;
}
