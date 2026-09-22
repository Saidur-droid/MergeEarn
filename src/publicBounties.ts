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

export function publicBountyShareUrl(id: string, origin: string, source?: string) {
  const base = origin.replace(/\/$/, '');
  const params = new URLSearchParams({ bounty: id });
  if (source) params.set('src', source);
  return `${base}/?${params.toString()}#live-bounties`;
}

export function nimiqExplorerUrl(hash: string) {
  return `https://nimiq.watch/#${encodeURIComponent(hash)}`;
}

export function contributorOnboardingHint(status: string): string | null {
  return status === 'FUNDED' ? 'claim → fix → PR → verified payout' : null;
}

export type ProofGlossaryEntry = {
  term: 'FUNDED' | 'MERGED_VERIFIED' | 'PAID';
  title: string;
  description: string;
  authority: 'Nimiq' | 'GitHub';
};

export function publicProofGlossary(): ProofGlossaryEntry[] {
  return [
    {
      term: 'FUNDED',
      title: 'Funded',
      description: 'The exact NIM reward transaction is confirmed before contributor work is treated as funded.',
      authority: 'Nimiq',
    },
    {
      term: 'MERGED_VERIFIED',
      title: 'Merged + verified',
      description: 'The pull request is merged into the expected repository and base branch, then checked again by MergeEarn.',
      authority: 'GitHub',
    },
    {
      term: 'PAID',
      title: 'Paid',
      description: 'The payout transaction is confirmed with the expected sender, recipient and amount before the bounty is complete.',
      authority: 'Nimiq',
    },
  ];
}

export type VerifiedTransactionHistoryItem = {
  id: string;
  bountyId: string;
  bountyTitle: string;
  amountNim: string;
  type: string;
  explorerUrl: string;
};

export function verifiedTransactionHistory(bounties: Bounty[]): VerifiedTransactionHistoryItem[] {
  return bounties.flatMap((bounty) =>
    (bounty.payment_transactions || [])
      .filter((transaction) => transaction.status === 'CONFIRMED' && transaction.providerReference)
      .map((transaction) => ({
        id: transaction.id,
        bountyId: bounty.id,
        bountyTitle: bounty.title,
        amountNim: bounty.reward_amount_nim,
        type: transaction.type,
        explorerUrl: nimiqExplorerUrl(transaction.providerReference!),
      })),
  );
}

export type ContributorReliabilitySignal = {
  login: string;
  verifiedMerges: number;
  paidCompletions: number;
};

export function contributorReliabilitySignals(bounties: Bounty[]): ContributorReliabilitySignal[] {
  const byLogin = new Map<string, ContributorReliabilitySignal>();
  for (const bounty of bounties) {
    for (const submission of bounty.submissions || []) {
      const login = submission.pr_author_login?.trim();
      if (!login || submission.verification_status !== 'VERIFIED') continue;
      const current = byLogin.get(login) || { login, verifiedMerges: 0, paidCompletions: 0 };
      current.verifiedMerges += 1;
      if (bounty.status === 'PAID') current.paidCompletions += 1;
      byLogin.set(login, current);
    }
  }
  return [...byLogin.values()].sort((a, b) => b.paidCompletions - a.paidCompletions || b.verifiedMerges - a.verifiedMerges || a.login.localeCompare(b.login));
}
