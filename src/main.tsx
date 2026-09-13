import React, { FormEvent, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import { fetchPublicGitHubIssue, GitHubIssue } from './integrations/github';
import { connectNimiqWallet, NimiqWalletSnapshot, shortNimiqAddress } from './integrations/nimiq';

type Draft = {
  title: string;
  summary: string;
  acceptanceCriteria: string[];
  reward: string;
  asset: 'NIM' | 'USDT';
};

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

function App() {
  const [issueUrl, setIssueUrl] = useState('');
  const [issue, setIssue] = useState<GitHubIssue | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [wallet, setWallet] = useState<NimiqWalletSnapshot | null>(null);
  const [issueLoading, setIssueLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readyToFund = useMemo(
    () => Boolean(issue && draft && wallet && Number(draft.reward) > 0),
    [issue, draft, wallet],
  );

  async function importIssue(event: FormEvent) {
    event.preventDefault();
    setError(null);
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="MergeEarn home">
          <span className="brand-mark">M</span>
          <span>MergeEarn</span>
        </a>
        <button className="wallet-button" type="button" onClick={connectWallet} disabled={walletLoading}>
          {walletLoading
            ? 'Connecting…'
            : wallet
              ? shortNimiqAddress(wallet.address)
              : 'Connect Nimiq Pay'}
        </button>
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
          <span className="status-pill">Public issues · live GitHub data</span>
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
                <span className="status-pill ai-pill">AI-ready draft</span>
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
                  <div className="criterion" key={`${criterion}-${index}`}>
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
                    onChange={(event) => setDraft({ ...draft, reward: event.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="asset">Asset</label>
                  <select
                    id="asset"
                    value={draft.asset}
                    onChange={(event) => setDraft({ ...draft, asset: event.target.value as Draft['asset'] })}
                  >
                    <option value="NIM">NIM</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>
              </div>

              <div className="fund-panel">
                <div>
                  <span className="fund-label">Funding readiness</span>
                  <strong>{readyToFund ? 'Ready for transaction implementation' : 'Connect Nimiq Pay to continue'}</strong>
                  <small>
                    MergeEarn will only mark this bounty funded after the payment provider confirms the transaction.
                  </small>
                </div>
                <button className="primary" type="button" disabled={!readyToFund}>
                  Fund {draft.reward || '0'} {draft.asset}
                </button>
              </div>
            </div>
          </div>
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
          <span>Wallet access uses the official Mini App SDK.</span>
        </article>
        <article>
          <strong>Payment safe by design</strong>
          <span>Funding and payout state require provider confirmation.</span>
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
