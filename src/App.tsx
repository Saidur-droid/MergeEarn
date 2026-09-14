import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { api, Bounty, CopilotDraft, Metrics, SessionUser } from './api';
import { connectNimiqWallet, NimiqWalletSnapshot, shortNimiqAddress } from './integrations/nimiq';
import { sendNimFundingPayment } from './payments/nimiq';

const publicFundingAddress = import.meta.env.VITE_NIMIQ_FUNDING_ADDRESS?.trim() ?? '';

function normalizeAddress(value: string) {
  return value.replace(/\s+/g, '').toUpperCase();
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong></article>;
}

function Status({ value }: { value: string }) {
  return <span className={`status-pill status-${value.toLowerCase().replaceAll('_', '-')}`}>{value.replaceAll('_', ' ')}</span>;
}

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [repositories, setRepositories] = useState<Array<{ id: string; fullName: string; owner: string; name: string; defaultBranch: string; private: boolean }>>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [issues, setIssues] = useState<Array<{ id: string; number: number; title: string; body: string | null; htmlUrl: string }>>([]);
  const [selectedIssue, setSelectedIssue] = useState('');
  const [draft, setDraft] = useState<CopilotDraft | null>(null);
  const [rewardNim, setRewardNim] = useState('10');
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [selectedBountyId, setSelectedBountyId] = useState<string>('');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [canManageBounty, setCanManageBounty] = useState(false);
  const [wallet, setWallet] = useState<NimiqWalletSnapshot | null>(null);
  const [prUrl, setPrUrl] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedRepository = repositories.find((repo) => repo.id === selectedRepo) || null;
  const selectedIssueData = issues.find((issue) => issue.id === selectedIssue) || null;
  const selectedBounty = bounties.find((bounty) => bounty.id === selectedBountyId) || null;

  const run = useCallback(async <T,>(label: string, work: () => Promise<T>, success?: string): Promise<T | null> => {
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      const result = await work();
      if (success) setNotice(success);
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
      return null;
    } finally {
      setBusy(null);
    }
  }, []);

  const refreshProduct = useCallback(async () => {
    const [bountyResult, metricResult] = await Promise.all([api.bounties(), api.metrics()]);
    setBounties(bountyResult.bounties);
    setMetrics(metricResult.metrics);
    setSelectedBountyId((current) => current || bountyResult.bounties[0]?.id || '');
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const session = await api.session();
        setUser(session.user);
        if (session.authenticated) {
          const repoResult = await api.repositories();
          setRepositories(repoResult.repositories);
          setSelectedRepo(repoResult.repositories[0]?.id || '');
          await refreshProduct();
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not start MergeEarn.');
      } finally {
        setBooting(false);
      }
    })();
  }, [refreshProduct]);

  useEffect(() => {
    if (!selectedRepository) {
      setIssues([]);
      setSelectedIssue('');
      return;
    }
    run('issues', async () => {
      const result = await api.issues(selectedRepository.owner, selectedRepository.name);
      setIssues(result.issues);
      setSelectedIssue(result.issues[0]?.id || '');
      setDraft(null);
      return result;
    });
  }, [selectedRepository?.id]);

  useEffect(() => {
    if (!selectedBountyId) {
      setCanManageBounty(false);
      return;
    }
    api.capabilities(selectedBountyId).then(res => setCanManageBounty(res.canManage)).catch(() => setCanManageBounty(false));
  }, [selectedBountyId]);

  async function connectWallet() {
    const snapshot = await run('wallet', () => connectNimiqWallet(), 'Nimiq Pay connected.');
    if (snapshot) setWallet(snapshot);
  }

  async function generateDraft() {
    if (!selectedIssueData || !selectedRepository) return;
    const result = await run('copilot', () => api.copilot({
      title: selectedIssueData.title,
      body: selectedIssueData.body,
      repository: selectedRepository.fullName,
    }));
    if (result) {
      setDraft(result.draft);
      if (result.draft.suggestedReward?.min) setRewardNim(String(result.draft.suggestedReward.min));
      setNotice(result.degraded ? 'AI provider is not configured; safe structured fallback was used.' : 'AI bounty draft generated.');
    }
  }

  async function createBounty(event: FormEvent) {
    event.preventDefault();
    if (!selectedRepository || !selectedIssueData || !draft) return;
    const created = await run('create', () => api.createBounty({
      repositoryId: selectedRepository.id,
      sourceIssueId: selectedIssueData.id,
      title: draft.title,
      summary: draft.summary,
      acceptanceCriteria: draft.acceptanceCriteria,
      rewardNim,
      aiMetadata: { source: draft.source || 'manual', difficulty: draft.difficulty, risks: draft.risks },
    }));
    if (!created) return;
    const published = await run('publish', () => api.publishBounty(created.bounty.id), 'Bounty is ready for funding.');
    if (published) {
      await refreshProduct();
      setSelectedBountyId(created.bounty.id);
    }
  }

  async function fundBounty(bounty: Bounty) {
    if (!publicFundingAddress) return setError('VITE_NIMIQ_FUNDING_ADDRESS is not configured for this deployment.');
    if (!wallet) {
      setError('Connect Nimiq Pay before funding.');
      return;
    }
    const txHash = await run('fund', () => sendNimFundingPayment({ recipient: publicFundingAddress, amountNim: bounty.reward_amount_nim }));
    if (!txHash) return;
    const submitted = await run('fund-record', () => api.fundingSubmit(bounty.id, txHash));
    if (!submitted) return;
    const verified = await run('fund-verify', () => api.fundingVerify(bounty.id));
    if (verified?.confirmed) setNotice('Funding confirmed on Nimiq. Bounty is open for contributors.');
    else setNotice('Funding transaction recorded and is awaiting chain confirmation. Use Verify funding to refresh.');
    await refreshProduct();
  }

  async function verifyFunding(bounty: Bounty) {
    const result = await run('fund-verify', () => api.fundingVerify(bounty.id));
    if (result?.confirmed) setNotice('Funding confirmed.');
    else if (result?.pending) setNotice(result.message || 'Funding is still pending.');
    await refreshProduct();
  }

  async function claimBounty(bounty: Bounty) {
    if (!wallet) return setError('Connect Nimiq Pay so MergeEarn can record your payout address.');
    const result = await run('claim', () => api.claim(bounty.id, wallet.address), 'Bounty claimed. Start work and link your pull request when ready.');
    if (result) await refreshProduct();
  }

  async function submitPullRequest(event: FormEvent) {
    event.preventDefault();
    if (!selectedBounty) return;
    const result = await run('pr-submit', () => api.submitPr(selectedBounty.id, prUrl), 'Pull request linked and checked against GitHub.');
    if (result) {
      setPrUrl('');
      await refreshProduct();
    }
  }

  async function verifyPullRequest(bounty: Bounty) {
    const result = await run('pr-verify', () => api.verifyPr(bounty.id));
    if (result?.verified) setNotice('GitHub confirms the pull request is merged into the expected branch.');
    else setNotice('Pull request is valid but not merged yet.');
    await refreshProduct();
  }

  async function approveBounty(bounty: Bounty) {
    const result = await run('approve', () => api.approve(bounty.id), 'Verified work approved for payout.');
    if (result) await refreshProduct();
  }

  async function payBounty(bounty: Bounty) {
    if (!wallet) return setError('Connect the configured Nimiq payout wallet before paying.');
    const prepared = await run('payout-prepare', () => api.payoutPrepare(bounty.id));
    if (!prepared) return;
    if (prepared.alreadyPaid) {
      setNotice('This bounty is already paid.');
      return refreshProduct();
    }
    if (!prepared.payout) return;
    if (normalizeAddress(wallet.address) !== normalizeAddress(prepared.payout.sourceAddress)) {
      setError(`Connect the configured payout wallet (${shortNimiqAddress(prepared.payout.sourceAddress)}) before sending.`);
      return;
    }
    const txHash = await run('payout-send', () => sendNimFundingPayment({ recipient: prepared.payout!.recipient, amountNim: prepared.payout!.amountNim }));
    if (!txHash) return;
    const submitted = await run('payout-submit', () => api.payoutSubmit(bounty.id, txHash));
    if (!submitted) return;
    const verified = await run('payout-verify', () => api.payoutVerify(bounty.id));
    if (verified?.confirmed) setNotice('Payout confirmed on Nimiq. Bounty is paid.');
    else setNotice('Payout recorded and awaiting chain confirmation.');
    await refreshProduct();
  }

  async function verifyPayout(bounty: Bounty) {
    const result = await run('payout-verify', () => api.payoutVerify(bounty.id));
    if (result?.confirmed) setNotice('Payout confirmed.');
    else if (result?.pending) setNotice(result.message || 'Payout is still pending.');
    await refreshProduct();
  }

  async function logout() {
    await run('logout', api.logout);
    window.location.reload();
  }

  const myActiveClaim = useMemo(() => selectedBounty?.claims?.find((claim) => claim.status === 'ACTIVE' && claim.contributor_user_id === user?.id), [selectedBounty, user]);

  if (booting) return <main className="splash"><strong>MergeEarn</strong><span>Loading secure workspace…</span></main>;

  if (!user) {
    return (
      <main className="landing-shell">
        <section className="landing-card">
          <span className="brand-mark large">M</span>
          <p className="eyebrow">GitHub-native bounties · Nimiq powered</p>
          <h1>Turn GitHub issues into paid, verified work.</h1>
          <p>Maintainers create and fund real issue bounties. Contributors claim them, link real pull requests, and get paid only after GitHub and Nimiq verification.</p>
          <a className="primary button-link" href="/api/auth/github">Continue with GitHub</a>
          <small>GitHub permissions are checked server-side. Payment state is never inferred from browser claims.</small>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell production-shell">
      <header className="topbar sticky">
        <a className="brand" href="#top"><span className="brand-mark">M</span><span>MergeEarn</span></a>
        <div className="top-actions">
          <span className="github-user">@{user.login}</span>
          <button className="wallet-button" onClick={connectWallet} disabled={busy === 'wallet'}>{wallet ? shortNimiqAddress(wallet.address) : 'Connect Nimiq Pay'}</button>
          <button className="text-button" onClick={logout}>Sign out</button>
        </div>
      </header>

      <section className="hero compact-hero" id="top">
        <p className="eyebrow">Issue → Fund → Fix → PR → Verify → Pay</p>
        <h1>Real bounties. Objective verification. Safe payouts.</h1>
        <p className="hero-copy">Create a bounty from an authorized GitHub repository, verify the merged pull request on the server, then release payment through Nimiq.</p>
      </section>

      {error ? <div className="alert" role="alert"><strong>Action failed</strong><span>{error}</span></div> : null}
      {notice ? <div className="notice" role="status">{notice}</div> : null}

      {metrics ? (
        <section className="metrics-grid" aria-label="Product metrics">
          <Metric label="Bounties" value={metrics.bountiesCreated} />
          <Metric label="Funded" value={metrics.funded} />
          <Metric label="Merged & verified" value={metrics.verifiedMerged} />
          <Metric label="Paid" value={metrics.paid} />
          <Metric label="Completion" value={`${Math.round(metrics.completionRate * 100)}%`} />
          <Metric label="Contributors" value={metrics.activeContributors} />
        </section>
      ) : null}

      <section className="product-grid">
        <section className="workspace create-panel">
          <div className="workspace-header">
            <div><p className="step-label">Maintainer</p><h2>Create a bounty</h2></div>
            <span className="status-pill">SERVER VERIFIED</span>
          </div>

          <label htmlFor="repo">Authorized repository</label>
          <select id="repo" value={selectedRepo} onChange={(event) => setSelectedRepo(event.target.value)}>
            {repositories.map((repo) => <option value={repo.id} key={repo.id}>{repo.fullName}{repo.private ? ' · private' : ''}</option>)}
          </select>

          <label htmlFor="issue">Open issue</label>
          <select id="issue" value={selectedIssue} onChange={(event) => { setSelectedIssue(event.target.value); setDraft(null); }}>
            {issues.map((issue) => <option value={issue.id} key={issue.id}>#{issue.number} · {issue.title}</option>)}
          </select>

          {selectedIssueData ? <a className="subtle-link" href={selectedIssueData.htmlUrl} target="_blank" rel="noreferrer">Open selected issue on GitHub ↗</a> : null}

          {!draft ? (
            <button className="primary full" onClick={generateDraft} disabled={!selectedIssueData || busy === 'copilot'}>{busy === 'copilot' ? 'Structuring issue…' : 'Generate bounty draft'}</button>
          ) : (
            <form className="draft-form" onSubmit={createBounty}>
              <label htmlFor="title">Title</label>
              <input id="title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
              <label htmlFor="summary">Summary</label>
              <textarea id="summary" rows={5} value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} />
              <span className="field-label">Acceptance criteria</span>
              {draft.acceptanceCriteria.map((criterion, index) => (
                <div className="criterion" key={index}><span>{index + 1}</span><input value={criterion} onChange={(event) => {
                  const next = [...draft.acceptanceCriteria];
                  next[index] = event.target.value;
                  setDraft({ ...draft, acceptanceCriteria: next });
                }} /></div>
              ))}
              <div className="reward-grid"><div><label htmlFor="reward">Reward (NIM)</label><input id="reward" value={rewardNim} inputMode="decimal" onChange={(event) => setRewardNim(event.target.value)} /></div><div><label>Difficulty</label><input value={draft.difficulty} readOnly /></div></div>
              {draft.risks.length ? <div className="risk-box"><strong>Scope checks</strong>{draft.risks.map((risk) => <span key={risk}>{risk}</span>)}</div> : null}
              <button className="primary full" type="submit" disabled={busy === 'create' || busy === 'publish'}>{busy === 'create' || busy === 'publish' ? 'Saving bounty…' : 'Create & publish bounty'}</button>
            </form>
          )}
        </section>

        <section className="workspace board-panel">
          <div className="workspace-header">
            <div><p className="step-label">Marketplace</p><h2>Live bounty board</h2></div>
            <button className="text-button" onClick={() => run('refresh', refreshProduct)}>Refresh</button>
          </div>
          <div className="bounty-list">
            {bounties.length ? bounties.map((bounty) => (
              <button className={`bounty-row ${selectedBountyId === bounty.id ? 'active' : ''}`} key={bounty.id} onClick={() => setSelectedBountyId(bounty.id)}>
                <div><strong>{bounty.title}</strong><span>{bounty.github_repositories?.full_name || 'Repository'} · #{bounty.source_issues?.issue_number || '?'}</span></div>
                <div className="bounty-row-right"><strong>{bounty.reward_amount_nim} NIM</strong><Status value={bounty.status} /></div>
              </button>
            )) : <div className="empty-state compact"><h3>No bounties yet</h3><p>Create the first bounty from an authorized GitHub issue.</p></div>}
          </div>
        </section>
      </section>

      {selectedBounty ? (
        <section className="workspace detail-panel">
          <div className="workspace-header">
            <div><p className="step-label">Bounty workspace</p><h2>{selectedBounty.title}</h2></div>
            <Status value={selectedBounty.status} />
          </div>
          <div className="detail-grid">
            <div className="detail-copy">
              <p>{selectedBounty.description}</p>
              <ul>{selectedBounty.acceptance_criteria.map((item) => <li key={item}>{item}</li>)}</ul>
              <div className="trust-row compact-trust">
                <article><strong>{selectedBounty.reward_amount_nim} NIM</strong><span>Reward</span></article>
                <article><strong>{selectedBounty.github_repositories?.default_branch || '—'}</strong><span>Required base branch</span></article>
                <article><strong>{selectedBounty.submissions?.[0]?.verification_status || 'Not submitted'}</strong><span>GitHub verification</span></article>
              </div>
            </div>
            <div className="action-card">
              {selectedBounty.status === 'READY_TO_FUND' && canManageBounty ? <>
                <h3>Fund bounty</h3><p>Nimiq Pay will ask you to approve the exact reward amount. MergeEarn marks the bounty funded only after server-side chain verification.</p>
                <button className="primary full" onClick={() => fundBounty(selectedBounty)} disabled={Boolean(busy)}>Fund {selectedBounty.reward_amount_nim} NIM</button>
                {selectedBounty.payment_transactions?.some((tx) => tx.type === 'FUNDING' && tx.status === 'PENDING') ? <button className="secondary full" onClick={() => verifyFunding(selectedBounty)}>Verify funding</button> : null}
              </> : null}

              {selectedBounty.status === 'FUNDED' ? <>
                <h3>Start work</h3><p>Claiming records your GitHub identity and connected Nimiq payout address.</p>
                <button className="primary full" onClick={() => claimBounty(selectedBounty)} disabled={Boolean(busy)}>Claim bounty</button>
              </> : null}

              {selectedBounty.status === 'CLAIMED' && myActiveClaim ? <>
                <h3>Link your pull request</h3><p>The server verifies repository identity and the expected base branch before accepting it.</p>
                <form onSubmit={submitPullRequest}><input type="url" required value={prUrl} onChange={(event) => setPrUrl(event.target.value)} placeholder="https://github.com/owner/repo/pull/123" /><button className="primary full" type="submit" disabled={Boolean(busy)}>Submit pull request</button></form>
              </> : null}

              {selectedBounty.status === 'PR_SUBMITTED' && (myActiveClaim || canManageBounty) ? <>
                <h3>Waiting for merge</h3><p>Refresh canonical GitHub state after the pull request is merged.</p><button className="primary full" onClick={() => verifyPullRequest(selectedBounty)} disabled={Boolean(busy)}>Verify merged state</button>
              </> : null}

              {selectedBounty.status === 'VERIFIED' && canManageBounty ? <>
                <h3>Approve verified work</h3><p>GitHub confirms the expected pull request is merged. Server-side repository permission is checked again before approval.</p><button className="primary full" onClick={() => approveBounty(selectedBounty)} disabled={Boolean(busy)}>Approve for payout</button>
              </> : null}

              {['APPROVED', 'PAYMENT_FAILED'].includes(selectedBounty.status) && canManageBounty ? <>
                <h3>Release payout</h3><p>Only the configured payout wallet can send this payment. The server verifies sender, recipient, amount, confirmation, and idempotency before marking Paid.</p><button className="primary full" onClick={() => payBounty(selectedBounty)} disabled={Boolean(busy)}>Pay contributor</button>
                {selectedBounty.payment_transactions?.some((tx) => tx.type === 'PAYOUT' && tx.status === 'PENDING') ? <button className="secondary full" onClick={() => verifyPayout(selectedBounty)}>Verify payout</button> : null}
              </> : null}

              {selectedBounty.status === 'PAID' ? <div className="success-state"><span>✓</span><h3>Paid and complete</h3><p>GitHub merge and Nimiq payout were both independently verified.</p></div> : null}

              {!['READY_TO_FUND','FUNDED','CLAIMED','PR_SUBMITTED','VERIFIED','APPROVED','PAYMENT_FAILED','PAID'].includes(selectedBounty.status) ? <p>No action is currently available for this bounty state.</p> : null}
              {busy ? <small className="busy-copy">Working: {busy.replaceAll('-', ' ')}…</small> : null}
            </div>
          </div>
        </section>
      ) : null}

      <footer className="product-footer"><span>MergeEarn</span><span>GitHub is code truth · Nimiq is payment truth · AI is advisory</span></footer>
    </main>
  );
}
