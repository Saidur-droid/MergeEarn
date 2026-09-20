export type SessionUser = { id: string; githubUserId: number; login: string; avatarUrl: string | null };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
    credentials: 'same-origin',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed with ${response.status}.`);
  return payload as T;
}

export const api = {
  session: () => request<{ authenticated: boolean; user: SessionUser | null }>('/api/auth/session'),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST', body: '{}' }),
  repositories: () => request<{ repositories: Array<{ id: string; fullName: string; owner: string; name: string; defaultBranch: string; private: boolean }> }>('/api/repositories'),
  issues: (owner: string, repo: string) => request<{ repository: { id: string; fullName: string; defaultBranch: string }; issues: Array<{ id: string; number: number; title: string; body: string | null; htmlUrl: string; state: string }> }>(`/api/issues?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`),
  copilot: (input: { title: string; body: string | null; repository: string }) => request<{ draft: CopilotDraft; degraded: boolean }>('/api/copilot', { method: 'POST', body: JSON.stringify(input) }),
  createBounty: (input: { repositoryId: string; sourceIssueId: string; title: string; summary: string; acceptanceCriteria: string[]; rewardNim: string; aiMetadata?: Record<string, unknown> }) => request<{ bounty: Bounty }>('/api/bounties', { method: 'POST', body: JSON.stringify(input) }),
  publishBounty: (id: string) => request<{ bounty: Bounty }>('/api/bounties', { method: 'PATCH', body: JSON.stringify({ id, action: 'publish' }) }),
  bounties: () => request<{ bounties: Bounty[] }>('/api/bounties'),
  bounty: (id: string) => request<{ bounty: Bounty }>(`/api/bounties?id=${encodeURIComponent(id)}`),
  fundingSubmit: (bountyId: string, txHash: string) => request('/api/funding', { method: 'POST', body: JSON.stringify({ bountyId, action: 'submit', txHash }) }),
  fundingVerify: (bountyId: string) => request<{ confirmed: boolean; pending?: boolean; message?: string }>('/api/funding', { method: 'POST', body: JSON.stringify({ bountyId, action: 'verify' }) }),
  sponsorInit: (issueNumber: number) => request<{ bountyId: string; issueNumber: number; title: string; rewardNim: string; status: string; fundingAddress: string }>('/api/funding', { method: 'POST', body: JSON.stringify({ action: 'sponsor-init', issueNumber }) }),
  sponsorSubmit: (bountyId: string, txHash: string) => request('/api/funding', { method: 'POST', body: JSON.stringify({ action: 'sponsor-submit', bountyId, txHash }) }),
  sponsorVerify: (bountyId: string) => request<{ confirmed: boolean; pending?: boolean; message?: string }>('/api/funding', { method: 'POST', body: JSON.stringify({ action: 'sponsor-verify', bountyId }) }),
  claim: (bountyId: string, nimiqAddress: string) => request('/api/claims', { method: 'POST', body: JSON.stringify({ bountyId, nimiqAddress }) }),
  submitPr: (bountyId: string, pullRequestUrl: string) => request('/api/submissions', { method: 'POST', body: JSON.stringify({ bountyId, action: 'submit', pullRequestUrl }) }),
  verifyPr: (bountyId: string) => request<{ verified: boolean }>('/api/submissions', { method: 'POST', body: JSON.stringify({ bountyId, action: 'verify' }) }),
  approve: (bountyId: string) => request('/api/approve', { method: 'POST', body: JSON.stringify({ bountyId }) }),
  payoutPrepare: (bountyId: string) => request<{ payout?: { recipient: string; amountNim: string; sourceAddress: string }; alreadyPaid?: boolean }>('/api/payout', { method: 'POST', body: JSON.stringify({ bountyId, action: 'prepare' }) }),
  payoutSubmit: (bountyId: string, txHash: string) => request('/api/payout', { method: 'POST', body: JSON.stringify({ bountyId, action: 'submit', txHash }) }),
  payoutVerify: (bountyId: string) => request<{ confirmed: boolean; pending?: boolean; message?: string }>('/api/payout', { method: 'POST', body: JSON.stringify({ bountyId, action: 'verify' }) }),
  metrics: () => request<{ publicConfig: { fundingAddress: string }; metrics: Metrics }>('/api/metrics'),
  capabilities: (bountyId: string) => request<{ canManage: boolean }>(`/api/capabilities?bountyId=${encodeURIComponent(bountyId)}`),
};

export type CopilotDraft = {
  title: string;
  summary: string;
  acceptanceCriteria: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedEffort?: string;
  suggestedReward?: { min: number; max: number; asset: 'NIM' };
  risks: string[];
  source?: string;
};

export type Bounty = {
  id: string;
  creator_user_id: string;
  repository_id: string;
  source_issue_id: string;
  title: string;
  description: string;
  acceptance_criteria: string[];
  reward_amount_luna: number;
  reward_amount_nim: string;
  reward_asset: 'NIM';
  status: string;
  github_repositories?: { full_name: string; default_branch: string; owner?: string; name?: string };
  source_issues?: { issue_number: number; title: string; html_url: string };
  claims?: Array<{ id: string; status: string; contributor_user_id: string }>;
  submissions?: Array<{ id: string; verification_status: string; html_url: string; merged_at: string | null }>;
  payment_transactions?: Array<{ id: string; type: string; status: string; providerReference?: string }>;
};

export type Metrics = {
  bountiesCreated: number;
  funded: number;
  claimed: number;
  prSubmitted: number;
  verifiedMerged: number;
  paid: number;
  completionRate: number;
  totalBountyLuna: number;
  totalPaidLuna: number;
  activeContributors: number;
  repeatContributors: number;
  medianCompletionMs: number | null;
};
