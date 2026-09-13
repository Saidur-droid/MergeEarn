import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import {
  fetchPublicGitHubIssue,
  fetchPublicGitHubPullRequest,
  GitHubIssue,
  GitHubPullRequest,
} from './integrations/github';
import { connectNimiqWallet, NimiqWalletSnapshot, shortNimiqAddress } from './integrations/nimiq';
import { sendNimFundingPayment } from './payments/nimiq';

type Draft = {
  title: string;
  summary: string;
  acceptanceCriteria: string[];
  reward: string;
  asset: 'NIM' | 'USDT';
};

type FundingState =
  | { status: 'IDLE' }
  | { status: 'SUBMITTING' }
  | { status: 'SUBMITTED'; txHash: string }
  | { status: 'FAILED'; message: string };

type PersistedWorkspace = {
  issueUrl: string;
  issue: GitHubIssue | null;
  draft: Draft | null;
  prUrl: string;
  pullRequest: GitHubPullRequest | null;
};

const storageKey = 'mergeearn.workspace.v1';
const fundingRecipient = import.meta.env.VITE_NIMIQ_FUNDING_ADDRESS?.trim() ?? '';

function createDraft(issue: GitHubIssue): Draft {
  const firstBodyLine = issue.body
    ?.split('\n')
    .map((line) => line.trim())
    .find(Boolean);

  return {
    title: issue.title,
    summary: firstBodyLine || `Resolve GitHub issue #${issue.number} in ${issue.repository.fullName}.`,
    acceptanceCriteria: [
      `A pull request is opened against ${issue.repository.fullName}.`,
      `The pull request resolves issue #${issue.number}.`,
      'The repository maintainer reviews and merges the pull request.',
    ],
    reward: '10',
    asset: 'NIM',
  };
}

function loadWorkspace(): PersistedWorkspace | null {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as PersistedWorkspace) : null;
  } catch {
    return null;
  }
}

function App() {
  const saved = useMemo(loadWorkspace, []);
  const [issueUrl, setIssueUrl] = useState(saved?.issueUrl ?? '');
  const [issue, setIssue] = useState<GitHubIssue | null>(saved?.issue ?? null);
  const [draft, setDraft] = useState<Draft | null>(saved?.draft ?? null);
  const [wallet, setWallet] = useState<NimiqWalletSnapshot | null>(null);
  const [issueLoading, setIssueLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [funding, setFunding] = useState<FundingState>({ status: 'IDLE' });
  const [prUrl, setPrUrl] = useState(saved?.prUrl ?? '');
  const [pullRequest, setPullRequest] = useState<GitHubPullRequest | null>(saved?.pullRequest ?? null);
  const [prLoading, setPrLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const workspace: PersistedWorkspace = { issueUrl, issue, draft, prUrl, pullRequest };
    localStorage.setItem(storageKey, JSON.stringify(workspace));
  }, [issueUrl, issue, draft, prUrl, pullRequest]);

  const readyToFund = useMemo(
    () => Boolean(
      issue
      && draft
      && wallet
      && draft.asset === 'NIM'
      && Number(draft.reward) > 0
      && fundingRecipient,
    ),
    [issue, draft, wallet],
  );

  const workflowStatus = pullRequest?.merged
    ? 'VERIFIED'
    : pullRequest
      ? 'PR SUBMITTED'
      : funding.status === 'SUBMITTED'
        ? 'FUNDING PENDING'
        : issue
          ? 'DRAFT'
          : 'START';

  async function importIssue(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFunding({ status: 'IDLE' });
    setPullRequest(null);
    setPrUrl('');
    setIssueLoading(true);

    try {
      const importedIssue = await fetchPublicGitHubIssue(issueUrl);
      setIssue(importedIssue);
      setDraft(createDraft(importedIssue));
    } catch (cause) {
      setIssue(null);
      setDraft(null);
      setError(cause instanceof Error ? cause.message : 'Could not import the GitHub issue.');
    } finally {
      setIssueLoading(false);
    }
  }

  async function connectWallet() {
    setError(null);
    setWalletLoading(true);

    try {
      setWallet(await connectNimiqWallet());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not connect to Nimiq Pay.');
    } finally {
      setWalletLoading(false);
    }
  }

  async function fundBounty() {
    if (!draft || !readyToFund) return;

    setError(null);
    setFunding({ status: 'SUBMITTING' });

    try {
      const txHash = await sendNimFundingPayment({
        recipient: fundingRecipient,
        amountNim: draft.reward,
      });
      setFunding({ status: 'SUBMITTED', txHash });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Funding transaction failed.';
      setFunding({ status: 'FAILED', message });
      setError(message);
    }
  }

  async function verifyPullRequest(event: FormEvent) {
    event.preventDefault();
    if (!issue) return;

    setError(null);
    setPrLoading(true);

    try {
      const verified = await fetchPublicGitHubPullRequest(prUrl, issue.repository.fullName);
      setPullRequest(verified);
    } catch (cause) {
      setPullRequest(null);
      setError(cause instanceof Error ? cause.message : 'Could not verify the pull request.');
    } finally {
      setPrLoading(false);
    }
  }

  function resetWorkspace() {
    localStorage.removeItem(storageKey);
    setIssueUrl('');
    setIssue(null);
    setDraft(null);
    setFunding({ status: 'IDLE' });
    setPrUrl('');
    setPullRequest(null);
    setError(null);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="MergeEarn home">
          <span className="brand-mark">M</span>
          <span>MergeEarn</span>
        </a>
        <div className="top-actions">
          {issue ? <button className="text-button" type="button" onClick={resetWorkspace}>Reset</button> : null}
          <button className="wallet-button" type="button" onClick={connectWallet} disabled={walletLoading}>
            {walletLoading
              ? 'Connecting…'
              : wallet
                ? shortNimiqAddress(wallet.address)
                : 'Connect Nimiq Pay'}
          </button>
        </div>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow">GitHub-native bounties</p>
        <h1>Turn an issue into paid, verified work.</h1>
        <p className="hero-copy">
          Maintainers fund real GitHub issues. Contributors submit pull requests. MergeEarn verifies the merge before payout.
        </p>
        <div className="flow" aria-label="MergeEarn workflow">
          {['Issue', 'Bounty', 'Fund', 'PR', 'Verify', 'Pay'].map((step, index) => (
            <React.Fragment key={step}>
              <span className="flow-step">{step}</span>
              {index < 5 ? <span className="flow-arrow">→</span> : null}
            </React.Fragment>
          ))}
        </div>
      </section>

      {error ? <div className="alert" role="alert">{error}</div> : null}

      <section className="workspace" aria-label="Create a bounty">
        <div className="workspace-header">
          <div>
            <p className="step-label">Step 1</p>
            <h2>Import a GitHub issue</h2>
          </div>
          <span className="status-pill">{workflowStatus}</span>
        </div>

        <form className="issue-form" onSubmit={importIssue}>
          <label htmlFor="issue-url">GitHub issue URL</label>
          <div className="input-row">
            <input
              id="issue-url"
              type="url"
              value={issueUrl}
              onChange={(event) => setIssueUrl(event.target.value)}
              placeholder="https://github.com/owner/repo/issues/123"
              required
            />
            <button className="primary" type="submit" disabled={issueLoading}>
              {issueLoading ? 'Importing…' : 'Import issue'}
            </button>
          </div>
        </form>

        {issue && draft ? (
          <>
            <div className="bounty-builder">
              <aside className="issue-card">
                <div className="issue-meta">
                  <span>{issue.repository.fullName}</span>
                  <span>#{issue.number}</span>
                  <span className="open-dot">{issue.state}</span>
                </div>
                <h3>{issue.title}</h3>
                <p>{issue.body || 'No issue description was provided on GitHub.'}</p>
                <a href={issue.htmlUrl} target="_blank" rel="noreferrer">Open on GitHub ↗</a>
              </aside>

              <div className="draft-card">
                <div className="workspace-header compact">
                  <div>
                    <p className="step-label">Step 2</p>
                    <h2>Review the bounty</h2>
                  </div>
                  <span className="status-pill ai-pill">Editable draft</span>
                </div>

                <label htmlFor="bounty-title">Title</label>
                <input
                  id="bounty-title"
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                />

                <label htmlFor="bounty-summary">Summary</label>
                <textarea
                  id="bounty-summary"
                  rows={4}
                  value={draft.summary}
                  onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
                />

                <div className="criteria-block">
                  <span className="field-label">Acceptance criteria</span>
                  {draft.acceptanceCriteria.map((criterion, index) => (
                    <div className="criterion" key={index}>
                      <span>{index + 1}</span>
                      <input
                        value={criterion}
                        onChange={(event) => {
                          const next = [...draft.acceptanceCriteria];
                          next[index] = event.target.value;
                          setDraft({ ...draft, acceptanceCriteria: next });
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="reward-grid">
                  <div>
                    <label htmlFor="reward">Reward</label>
                    <input
                      id="reward"
                      inputMode="decimal"
                      value={draft.reward}
                      onChange={(event) => {
                        setDraft({ ...draft, reward: event.target.value });
                        setFunding({ status: 'IDLE' });
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="asset">Asset</label>
                    <select
                      id="asset"
                      value={draft.asset}
                      onChange={(event) => {
                        setDraft({ ...draft, asset: event.target.value as Draft['asset'] });
                        setFunding({ status: 'IDLE' });
                      }}
                    >
                      <option value="NIM">NIM</option>
                      <option value="USDT">USDT</option>
                    </select>
                  </div>
                </div>

                <div className="fund-panel">
                  <div>
                    <span className="fund-label">Step 3 · Fund bounty</span>
                    <strong>
                      {funding.status === 'SUBMITTED'
                        ? 'Transaction submitted — awaiting verification'
                        : !fundingRecipient
                          ? 'Live funding is credential-gated'
                          : draft.asset === 'USDT'
                            ? 'USDT rail is next; NIM funding is live first'
                            : wallet
                              ? 'Ready to request Nimiq Pay approval'
                              : 'Connect Nimiq Pay to continue'}
                    </strong>
                    <small>
                      A submitted transaction is never treated as FUNDED until provider verification confirms it.
                    </small>
                    {funding.status === 'SUBMITTED' ? <code className="tx-hash">Tx: {funding.txHash}</code> : null}
                  </div>
                  <button
                    className="primary"
                    type="button"
                    onClick={fundBounty}
                    disabled={!readyToFund || funding.status === 'SUBMITTING'}
                  >
                    {funding.status === 'SUBMITTING' ? 'Confirm in Nimiq Pay…' : `Fund ${draft.reward || '0'} ${draft.asset}`}
                  </button>
                </div>
              </div>
            </div>

            <div className="verification-panel">
              <div className="workspace-header compact">
                <div>
                  <p className="step-label">Step 4</p>
                  <h2>Verify contributor pull request</h2>
                </div>
                <span className={`status-pill ${pullRequest?.merged ? 'verified-pill' : ''}`}>
                  {pullRequest?.merged ? 'MERGED · VERIFIED' : pullRequest ? 'PR FOUND' : 'WAITING FOR PR'}
                </span>
              </div>

              <form onSubmit={verifyPullRequest}>
                <label htmlFor="pr-url">Pull request URL</label>
                <div className="input-row">
                  <input
                    id="pr-url"
                    type="url"
                    value={prUrl}
                    onChange={(event) => setPrUrl(event.target.value)}
                    placeholder={`https://github.com/${issue.repository.fullName}/pull/123`}
                    required
                  />
                  <button className="primary" type="submit" disabled={prLoading}>
                    {prLoading ? 'Checking GitHub…' : 'Verify PR'}
                  </button>
                </div>
              </form>

              {pullRequest ? (
                <div className="pr-result">
                  <div>
                    <span className="field-label">GitHub canonical result</span>
                    <h3>{pullRequest.title}</h3>
                    <p>
                      #{pullRequest.number} · base <strong>{pullRequest.baseBranch}</strong> · author{' '}
                      <strong>{pullRequest.authorLogin || 'unknown'}</strong>
                    </p>
                  </div>
                  <div className="verification-state">
                    <strong>{pullRequest.merged ? 'Verified merge' : 'Not merged yet'}</strong>
                    <span>
                      {pullRequest.merged
                        ? `Merged ${pullRequest.mergedAt ? new Date(pullRequest.mergedAt).toLocaleString() : ''}`
                        : 'Refresh verification after the maintainer merges the PR.'}
                    </span>
                  </div>
                  <a href={pullRequest.htmlUrl} target="_blank" rel="noreferrer">Open PR on GitHub ↗</a>
                </div>
              ) : (
                <p className="helper-copy">The PR must belong to the same repository as the bounty. MergeEarn reads GitHub's canonical merged state instead of trusting a contributor claim.</p>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">⌘</span>
            <h3>Start with a real GitHub issue</h3>
            <p>Paste an issue URL above. MergeEarn will turn it into a structured bounty workspace.</p>
          </div>
        )}
      </section>

      <section className="trust-row">
        <article>
          <strong>GitHub verified</strong>
          <span>Completion comes from real repository and PR state.</span>
        </article>
        <article>
          <strong>Nimiq powered</strong>
          <span>Wallet access and NIM transactions use the official Mini App SDK.</span>
        </article>
        <article>
          <strong>Safe state changes</strong>
          <span>Submitting a transaction never skips provider verification.</span>
        </article>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
