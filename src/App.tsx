import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { api, Bounty, CopilotDraft, Metrics, PullRequestCheckState, SessionUser } from './api';
import { connectNimiqWallet, NimiqWalletSnapshot, shortNimiqAddress } from './integrations/nimiq';
import { sendNimFundingPayment } from './payments/nimiq';
import { contributorOnboardingHint, contributorReliabilitySignals, filterPublicBounties, nimiqExplorerUrl, PublicBountyFilter, publicBountyShareUrl, publicBountySummary, publicLifecycleProgress, publicProofGlossary, verifiedTransactionHistory } from './publicBounties';

const publicFundingAddress = import.meta.env.VITE_NIMIQ_FUNDING_ADDRESS?.trim() ?? '';
const nimiqPayDeepLink = 'https://nimpay.app/miniapps/open/mergeearn.vercel.app';
const allowedAcquisitionSources = new Set(['nimiq-space', 'skool', 'x', 'github', 'referral']);

function currentAcquisitionSource() {
  const value = new URLSearchParams(window.location.search).get('src')?.trim().toLowerCase() || '';
  return allowedAcquisitionSources.has(value) ? value : '';
}

function githubSignInUrl() {
  const source = currentAcquisitionSource();
  return source ? `/api/auth/github?src=${encodeURIComponent(source)}` : '/api/auth/github';
}

function normalizeAddress(value: string) {
  return value.replace(/\s+/g, '').toUpperCase();
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong></article>;
}

function Status({ value }: { value: string }) {
  return <span className={`status-pill status-${value.toLowerCase().replaceAll('_', '-')}`} aria-label={`Bounty status: ${value.replaceAll('_', ' ')}`}>{value.replaceAll('_', ' ')}</span>;
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
  const [selectedBountyId, setSelectedBountyId] = useState<string>(() => new URLSearchParams(window.location.search).get('bounty') || sessionStorage.getItem('mergeearn_bounty') || '');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [canManageBounty, setCanManageBounty] = useState(false);
  const [wallet, setWallet] = useState<NimiqWalletSnapshot | null>(null);
  const [walletHelp, setWalletHelp] = useState(false);
  const [prUrl, setPrUrl] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [publicFilter, setPublicFilter] = useState<PublicBountyFilter>('all');
  const [copiedBountyId, setCopiedBountyId] = useState<string | null>(null);
  const [copiedTxHash, setCopiedTxHash] = useState<string | null>(null);
  const [communityJoined, setCommunityJoined] = useState(false);
  const [checkStates, setCheckStates] = useState<Record<string, PullRequestCheckState>>({});
  const sponsorTarget = Number(new URLSearchParams(window.location.search).get('sponsor') || '0');
  const acquisitionSource = currentAcquisitionSource();
  const signInUrl = githubSignInUrl();
  const sponsorIssues = [66, 67, 68, 69];

  const selectedRepository = repositories.find((repo) => repo.id === selectedRepo) || null;
  const selectedIssueData = issues.find((issue) => issue.id === selectedIssue) || null;
  const selectedBounty = bounties.find((bounty) => bounty.id === selectedBountyId) || null;
  const publicBounties = useMemo(() => bounties.filter((bounty) => !['DRAFT','CANCELLED','EXPIRED'].includes(bounty.status)), [bounties]);
  const availableFundedBounties = useMemo(() => publicBounties.filter((bounty) => bounty.status === 'FUNDED'), [publicBounties]);
  const visiblePublicBounties = useMemo(() => filterPublicBounties(publicBounties, publicFilter).slice(0, 9), [publicBounties, publicFilter]);
  const judgeProofBounty = useMemo(() => publicBounties.find((bounty) => bounty.status === 'PAID') || publicBounties[0] || null, [publicBounties]);
  const transactionHistory = useMemo(() => verifiedTransactionHistory(publicBounties), [publicBounties]);
  const contributorSignals = useMemo(() => contributorReliabilitySignals(publicBounties), [publicBounties]);

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
    setSelectedBountyId((current) => bountyResult.bounties.some((bounty) => bounty.id === current) ? current : bountyResult.bounties[0]?.id || '');
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const session = await api.session();
        setUser(session.user);
        await refreshProduct();
        if (session.authenticated) {
          const community = await api.communityStatus().catch(() => ({ joined: false, joinedAt: null }));
          setCommunityJoined(community.joined);
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
    const withSubmissions = publicBounties.filter((bounty) => bounty.submissions?.[0]?.head_sha);
    if (!withSubmissions.length) return;
    let cancelled = false;
    Promise.all(withSubmissions.map(async (bounty) => {
      try {
        return [bounty.id, await api.checks(bounty.id)] as const;
      } catch {
        return [bounty.id, { state: 'unknown', totalChecks: 0, completedChecks: 0, headSha: bounty.submissions?.[0]?.head_sha || null } satisfies PullRequestCheckState] as const;
      }
    })).then((entries) => {
      if (!cancelled) setCheckStates((current) => ({ ...current, ...Object.fromEntries(entries) }));
    });
    return () => { cancelled = true; };
  }, [publicBounties]);

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
    if (snapshot) {
      setWallet(snapshot);
      setWalletHelp(false);
    } else {
      setWalletHelp(true);
    }
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
      setWalletHelp(true);
      setError('Connect Nimiq Pay before funding. On a phone, use Open in Nimiq Pay.');
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

  async function sponsorIssue(issueNumber: number) {
    const setup = await run('sponsor-init', () => api.sponsorInit(issueNumber));
    if (!setup) return;
    if (!wallet) {
      setWalletHelp(true);
      setError('Sponsor opportunity prepared. Open MergeEarn inside Nimiq Pay and connect a wallet to fund it.');
      return;
    }
    if (setup.status === 'FUNDED') {
      setNotice('This issue is already funded.');
      return refreshProduct();
    }
    if (setup.status !== 'READY_TO_FUND') {
      setNotice(`This sponsor opportunity is currently ${setup.status.replaceAll('_', ' ').toLowerCase()}.`);
      return refreshProduct();
    }
    const txHash = await run('sponsor-pay', () => sendNimFundingPayment({ recipient: setup.fundingAddress, amountNim: setup.rewardNim }));
    if (!txHash) return;
    const submitted = await run('sponsor-record', () => api.sponsorSubmit(setup.bountyId, txHash));
    if (!submitted) return;
    const verified = await run('sponsor-verify', () => api.sponsorVerify(setup.bountyId));
    if (verified?.confirmed) setNotice(`Issue #${issueNumber} is now a funded ${setup.rewardNim} NIM bounty.`);
    else setNotice(verified?.message || 'Sponsor payment recorded and awaiting Nimiq confirmation.');
    await refreshProduct();
  }

  async function verifyFunding(bounty: Bounty) {
    const result = await run('fund-verify', () => api.fundingVerify(bounty.id));
    if (result?.confirmed) setNotice('Funding confirmed.');
    else if (result?.pending) setNotice(result.message || 'Funding is still pending.');
    await refreshProduct();
  }

  async function claimBounty(bounty: Bounty) {
    if (!wallet) {
      setWalletHelp(true);
      return setError('Connect Nimiq Pay so MergeEarn can record your payout address.');
    }
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
    if (!wallet) {
      setWalletHelp(true);
      return setError('Connect the configured Nimiq payout wallet before paying.');
    }
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

  async function copyBountyLink(bountyId: string) {
    const url = publicBountyShareUrl(bountyId, window.location.origin, 'referral');
    try {
      await navigator.clipboard.writeText(url);
      setCopiedBountyId(bountyId);
      window.setTimeout(() => setCopiedBountyId((current) => current === bountyId ? null : current), 1800);
    } catch {
      window.prompt('Copy this bounty link:', url);
    }
  }

  async function copyTxProof(hash: string, label: string) {
    const url = nimiqExplorerUrl(hash);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedTxHash(hash);
      window.setTimeout(() => setCopiedTxHash((current) => current === hash ? null : current), 1800);
    } catch {
      window.prompt(`Copy ${label} URL:`, url);
    }
  }

  async function shareBounty(bounty: Bounty) {
    const url = publicBountyShareUrl(bounty.id, window.location.origin, 'referral');
    const text = `${bounty.title} · ${bounty.reward_amount_nim} NIM bounty on MergeEarn`;
    if (navigator.share) {
      try {
        await navigator.share({ title: bounty.title, text, url });
        return;
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
      }
    }
    await copyBountyLink(bounty.id);
  }

  async function shareMergeEarn() {
    const url = `${window.location.origin}/?src=referral`;
    const text = 'Earn NIM for verified GitHub work or sponsor a real open-source issue. GitHub proves the work. Nimiq proves the money.';
    if (navigator.share) {
      try {
        await navigator.share({ title: 'MergeEarn', text, url });
        return;
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setNotice('MergeEarn link copied. Send it to a developer or Nimiq user.');
    } catch {
      window.prompt('Copy the MergeEarn link:', url);
    }
  }

  async function shareSponsorIssue(issueNumber: number) {
    const url = `${window.location.origin}/?sponsor=${issueNumber}#sponsor-${issueNumber}`;
    const text = `Sponsor a real MergeEarn GitHub issue with 5 NIM. Funding becomes real only after Nimiq verification.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `MergeEarn issue #${issueNumber}`, text, url });
        return;
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setNotice(`Sponsor link for issue #${issueNumber} copied.`);
    } catch {
      window.prompt('Copy this sponsor link:', url);
    }
  }

  async function joinContributorPool() {
    const result = await run('community-join', () => api.joinCommunity(wallet?.address), 'You joined the contributor pool. Connect Nimiq Pay only when you claim or sponsor work.');
    if (result?.joined) {
      setCommunityJoined(true);
      await refreshProduct();
    }
  }

  async function logout() {
    await run('logout', api.logout);
    window.location.reload();
  }

  const myActiveClaim = useMemo(() => selectedBounty?.claims?.find((claim) => claim.status === 'ACTIVE' && claim.contributor_user_id === user?.id), [selectedBounty, user]);

  if (booting) return <main className="splash"><strong>MergeEarn</strong><span>Loading secure workspace…</span></main>;

  if (!user) {
    return (
      <main className="landing-shell landing-premium">
        <nav className="landing-nav" aria-label="Primary">
          <a className="landing-wordmark" href="/" aria-label="MergeEarn home">
            <span className="brand-mark">M</span>
            <span>MergeEarn</span>
          </a>
          <div className="landing-nav-meta">
            <span className="landing-live"><i aria-hidden="true" /> Live · verified E2E</span>
            <a className="landing-nav-link" href="https://github.com/Saidur-droid/MergeEarn" target="_blank" rel="noreferrer">Source ↗</a>
            <a className="landing-nav-cta" href={signInUrl}>Sign in with GitHub</a>
          </div>
        </nav>

        <section className="landing-hero-grid">
          <div className="landing-copy">
            <div className="landing-kicker">
              <span className="kicker-mark" aria-hidden="true">M</span>
              <span>For open-source maintainers & contributors · Nimiq powered</span>
            </div>
            <h1>Funded before work.<span>Verified before payout.</span></h1>
            <p className="landing-lede">
              MergeEarn turns real GitHub issues into funded NIM bounties. Funding, merged work, and payout are independently re-checked before the lifecycle can advance.
            </p>
            <div className="landing-actions">
              <a className="landing-primary" href={availableFundedBounties.length ? '#live-bounties' : signInUrl}>
                {availableFundedBounties.length ? 'Claim funded bounty' : 'Join next funded bounty'} <span aria-hidden="true">→</span>
              </a>
              <a className="landing-secondary" href="#sponsor-bounties">
                Sponsor work <span aria-hidden="true">↓</span>
              </a>
            </div>
            <div className="first-time-chooser" aria-label="Choose how you want to use MergeEarn">
              <article>
                <span>Contributor</span>
                <strong>Earn NIM for merged GitHub work</strong>
                <p>Join with GitHub now. Connect Nimiq Pay only when you claim a funded bounty or need a payout address.</p>
                <a href={signInUrl}>Join free with GitHub</a>
              </article>
              <article>
                <span>Sponsor</span>
                <strong>Put 5 NIM behind a real issue</strong>
                <p>Pick a small open task, approve one Nimiq Pay transaction, and MergeEarn verifies it before work begins.</p>
                <a href="#sponsor-bounties">See sponsor tasks</a>
              </article>
            </div>
            <div className="landing-microcopy">
              <span className="micro-check" aria-hidden="true">✓</span>
              <span>No screenshot approvals. No browser-trusted <code>FUNDED</code> or <code>PAID</code> state.</span>
            </div>
            <button className="landing-share-button" type="button" onClick={shareMergeEarn}>Invite a developer / Share MergeEarn</button>
            <div className="landing-utility-links">
              <a href={signInUrl}>Continue with GitHub <span aria-hidden="true">→</span></a>
              <a href="https://youtube.com/shorts/xf0TRhqKeUE" target="_blank" rel="noreferrer">Watch 60s demo <span aria-hidden="true">↗</span></a>
              <a href={nimiqPayDeepLink} onClick={() => acquisitionSource && sessionStorage.setItem('mergeearn_acquisition_source', acquisitionSource)}>Open in Nimiq Pay <span aria-hidden="true">↗</span></a>
            </div>
          </div>

          <aside className="proof-window" aria-label="Verified bounty lifecycle example">
            <div className="proof-chrome">
              <div className="proof-dots" aria-hidden="true"><i /><i /><i /></div>
              <span>Verified bounty lifecycle</span>
              <span className="proof-paid">PAID</span>
            </div>
            <div className="proof-body">
              <div className="proof-title-row">
                <div>
                  <span className="proof-overline">Release evidence</span>
                  <h2>Issue → merge → verified payout</h2>
                </div>
                <span className="proof-amount">NIM</span>
              </div>

              <div className="proof-timeline">
                <div className="proof-step">
                  <span className="proof-check">✓</span>
                  <div><strong>Funding confirmed</strong><small>Nimiq transaction re-checked server-side</small></div>
                  <span className="proof-source">NIMIQ</span>
                </div>
                <div className="proof-step">
                  <span className="proof-check">✓</span>
                  <div><strong>Contributor claimed</strong><small>GitHub identity + payout address recorded</small></div>
                  <span className="proof-source">CLAIM</span>
                </div>
                <div className="proof-step">
                  <span className="proof-check">✓</span>
                  <div><strong>Pull request merged</strong><small>Expected repository and base branch verified</small></div>
                  <a className="proof-source proof-link" href="https://github.com/Saidur-droid/MergeEarn/pull/5" target="_blank" rel="noreferrer">PR #5 ↗</a>
                </div>
                <div className="proof-step">
                  <span className="proof-check">✓</span>
                  <div><strong>Maintainer approved</strong><small>Repository permission checked again</small></div>
                  <span className="proof-source">GITHUB</span>
                </div>
                <div className="proof-step final">
                  <span className="proof-check">✓</span>
                  <div><strong>Payout confirmed</strong><small>Sender, recipient, amount and inclusion verified</small></div>
                  <span className="proof-source">NIMIQ</span>
                </div>
              </div>

              <div className="proof-footer">
                <span><b>GitHub</b> proves the work</span>
                <span className="proof-divider" aria-hidden="true" />
                <span><b>Nimiq</b> proves the money</span>
              </div>
            </div>
          </aside>
        </section>

        <section className="judge-strip" aria-label="Judge quick proof">
          <div>
            <span className="proof-overline">Judge in under 60 seconds</span>
            <strong>Open a real bounty → inspect GitHub merge → inspect confirmed Nimiq proof.</strong>
          </div>
          <div className="judge-strip-metrics" aria-label="Live product totals">
            {metrics ? <>
              <span><b>{metrics.funded}</b> funded</span>
              <span><b>{metrics.verifiedMerged}</b> merged</span>
              <span><b>{metrics.paid}</b> paid</span>
              <span><b>{metrics.verifiedWallets}</b> verified wallets</span>
              <span><b>{metrics.activeContributors}</b> paid-flow contributors</span>
              <span><b>{metrics.registeredUsers}</b> GitHub users</span>
              <span><b>{metrics.newUsers48h}</b> new in 48h</span>
              <span><b>{metrics.contributorPool}</b> in contributor pool</span>
            </> : <span>Live metrics loading…</span>}
          </div>
        </section>

        <section className="first-time-flow" aria-labelledby="first-time-flow-title">
          <p className="process-eyebrow">First time here?</p>
          <h2 id="first-time-flow-title">Three steps. No guessing.</h2>
          <div className="first-time-flow-grid">
            <article><span>1</span><strong>Choose</strong><p>Earn NIM from funded work, or sponsor a task you want completed.</p></article>
            <article><span>2</span><strong>Connect only when needed</strong><p>GitHub proves identity and work. Nimiq Pay is used only for funding, claiming or payout.</p></article>
            <article><span>3</span><strong>Follow verified state</strong><p>FUNDED, merged and PAID states are checked against GitHub or Nimiq—not screenshots.</p></article>
          </div>
        </section>

        <section className="public-market" id="live-bounties" aria-labelledby="live-bounties-title">
          <div className="public-market-heading">
            <div>
              <p className="process-eyebrow">Live product · no login required</p>
              <h2 id="live-bounties-title">Browse real bounty state before you connect anything.</h2>
            </div>
            <span className="public-market-note">GitHub work + Nimiq payment state, independently verified</span>
          </div>

          {metrics?.acquisitionSources?.length ? (
            <div className="acquisition-proof" aria-label="Aggregate acquisition funnel">
              <strong>Genuine acquisition funnel</strong>
              <div>
                {metrics.acquisitionSources.map((item) => (
                  <span key={item.source}><b>{item.source}</b> · {item.registeredUsers} signup{item.registeredUsers === 1 ? '' : 's'} · {item.contributorPool} pool</span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="public-market-toolbar" aria-label="Public bounty filters">
            <div className="public-filters" role="group" aria-label="Filter bounties">
              {(['all','open','paid'] as PublicBountyFilter[]).map((filter) => (
                <button
                  className={publicFilter === filter ? 'active' : ''}
                  key={filter}
                  onClick={() => setPublicFilter(filter)}
                  type="button"
                  aria-pressed={publicFilter === filter}
                >
                  {filter === 'all' ? 'All' : filter === 'open' ? 'Open' : 'Paid'}
                </button>
              ))}
            </div>
            {metrics ? (
              <div className="public-live-metrics" aria-label="Live product proof">
                <span><strong>{metrics.funded}</strong> funded</span>
                <span><strong>{metrics.verifiedMerged}</strong> merged</span>
                <span><strong>{metrics.paid}</strong> paid</span>
                <span><strong>{metrics.verifiedWallets}</strong> wallets</span>
                <span><strong>{metrics.availableFunded}</strong> available now</span>
                <span><strong>{metrics.registeredUsers}</strong> GitHub users</span>
                <span><strong>{metrics.newUsers48h}</strong> new / 48h</span>
                <span><strong>{metrics.contributorPool}</strong> pool</span>
              </div>
            ) : null}
          </div>

          {!availableFundedBounties.length ? (
            <div className="public-availability" role="status">
              <div>
                <strong>No FUNDED bounty is open right now.</strong>
                <span>That is the current growth bottleneck—not a Vercel outage. Join with GitHub now so you are registered and ready when a sponsor funds the next task.</span>
              </div>
              <a href={signInUrl}>Join contributor pool →</a>
            </div>
          ) : null}

          {visiblePublicBounties.length ? (
            <div className="public-bounty-grid">
              {visiblePublicBounties.map((bounty) => {
                const funding = bounty.payment_transactions?.find((tx) => tx.type === 'FUNDING' && tx.status === 'CONFIRMED');
                const payout = bounty.payment_transactions?.find((tx) => tx.type === 'PAYOUT' && tx.status === 'CONFIRMED');
                const submission = bounty.submissions?.[0];
                const progress = publicLifecycleProgress(bounty.status);
                const onboardingHint = contributorOnboardingHint(bounty.status);
                const checkState = checkStates[bounty.id];
                return (
                  <article className={`public-bounty-card ${selectedBountyId === bounty.id ? 'featured' : ''}`} id={`bounty-${bounty.id}`} key={bounty.id} aria-labelledby={`bounty-title-${bounty.id}`}>
                    <div className="public-bounty-topline">
                      <Status value={bounty.status} />
                      <strong aria-label={`Reward: ${bounty.reward_amount_nim} NIM`}>{bounty.reward_amount_nim} NIM</strong>
                    </div>
                    <h3 id={`bounty-title-${bounty.id}`}>{bounty.title}</h3>
                    <p>{publicBountySummary(bounty.description)}</p>
                    <div className="public-bounty-meta">
                      <span>{bounty.github_repositories?.full_name || 'GitHub repository'}</span>
                      <span>Issue #{bounty.source_issues?.issue_number || '—'}</span>
                      {submission ? <span className={`ci-state ci-${checkState?.state || 'unknown'}`} aria-label={`GitHub CI status: ${checkState?.state || 'unknown'}`}>CI: {checkState?.state || 'unknown'}</span> : null}
                    </div>
                    <div className="public-progress" aria-label={`Lifecycle progress: ${progress.label}`}>
                      <div className="public-progress-copy">
                        <strong>{progress.label}</strong>
                        <span>{progress.step}/{progress.total}</span>
                      </div>
                      <div className="public-progress-track" aria-hidden="true">
                        <i style={{ width: `${Math.round((progress.step / progress.total) * 100)}%` }} />
                      </div>
                    </div>
                    <div className="public-proof-links" aria-label={`Proof links for ${bounty.title}`}>
                      {bounty.source_issues?.html_url ? <a href={bounty.source_issues.html_url} target="_blank" rel="noreferrer" aria-label={`View GitHub issue for ${bounty.title}`}>Issue ↗</a> : null}
                      {submission?.html_url ? <a href={submission.html_url} target="_blank" rel="noreferrer" aria-label={`View pull request for ${bounty.title}`}>Pull request ↗</a> : null}
                      {funding?.providerReference ? (
                        <span className="public-proof-group">
                          <a href={nimiqExplorerUrl(funding.providerReference)} target="_blank" rel="noreferrer" aria-label={`View confirmed funding transaction for ${bounty.title} on Nimiq explorer`}>Funding tx ↗</a>
                          <button className="public-proof-copy" type="button" onClick={() => copyTxProof(funding.providerReference!, 'funding transaction')} aria-label={`Copy confirmed funding transaction link for ${bounty.title}`}>
                            {copiedTxHash === funding.providerReference ? 'Copied ✓' : 'Copy'}
                          </button>
                        </span>
                      ) : null}
                      {payout?.providerReference ? (
                        <span className="public-proof-group">
                          <a href={nimiqExplorerUrl(payout.providerReference)} target="_blank" rel="noreferrer" aria-label={`View confirmed payout transaction for ${bounty.title} on Nimiq explorer`}>Payout tx ↗</a>
                          <button className="public-proof-copy" type="button" onClick={() => copyTxProof(payout.providerReference!, 'payout transaction')} aria-label={`Copy confirmed payout transaction link for ${bounty.title}`}>
                            {copiedTxHash === payout.providerReference ? 'Copied ✓' : 'Copy'}
                          </button>
                        </span>
                      ) : null}
                    </div>
                    {onboardingHint ? (
                      <div className="public-onboarding-note" aria-label="Contributor workflow">
                        <span className="onboarding-flow-tag">Workflow</span>
                        <span>{onboardingHint}</span>
                      </div>
                    ) : null}
                    <div className="public-bounty-actions">
                      <div className="public-share-actions">
                        <a className="public-view-link" href={`/?bounty=${encodeURIComponent(bounty.id)}#live-bounties`} aria-label={`Open verified proof for ${bounty.title}`}>Open proof <span aria-hidden="true">→</span></a>
                        <button className="public-copy-link" type="button" onClick={() => shareBounty(bounty)} aria-label={`Share bounty ${bounty.title}`}>
                          Share
                        </button>
                        <button className="public-copy-link" type="button" onClick={() => copyBountyLink(bounty.id)} aria-label={`Copy link for ${bounty.title}`}>
                          {copiedBountyId === bounty.id ? 'Copied ✓' : 'Copy link'}
                        </button>
                        <a className="public-view-link" href={nimiqPayDeepLink} aria-label={`Open MergeEarn in Nimiq Pay for ${bounty.title}`} onClick={() => sessionStorage.setItem('mergeearn_bounty', bounty.id)}>Open in Nimiq Pay ↗</a>
                      </div>
                      {bounty.status === 'FUNDED' ? (
                        <a className="public-claim-link" href={signInUrl} onClick={() => sessionStorage.setItem('mergeearn_bounty', bounty.id)} aria-label={`Claim ${bounty.title} with GitHub`}>Claim & earn</a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="public-empty">
              <strong>{publicFilter === 'open' ? 'No open bounties right now.' : publicFilter === 'paid' ? 'No paid proof in this view yet.' : 'The public board is ready.'}</strong>
              <span>
                {publicFilter === 'open'
                  ? 'Sponsor one of the community issues below or switch to Paid to inspect completed proof.'
                  : publicFilter === 'paid'
                    ? 'Switch to All to inspect the current lifecycle, or sponsor a community issue to create the next proof.'
                    : 'Published bounties appear here automatically as soon as their server-verified lifecycle begins.'}
              </span>
              {publicFilter !== 'all' ? <button className="public-empty-action" type="button" onClick={() => setPublicFilter('all')}>Show all bounties</button> : null}
            </div>
          )}

          {selectedBounty ? (
            <div className="public-selected-proof" aria-label="Selected bounty proof">
              <div>
                <span className="proof-overline">Selected evidence</span>
                <strong>{selectedBounty.title}</strong>
              </div>
              <a href={`/?bounty=${encodeURIComponent(selectedBounty.id)}#live-bounties`}>Shareable bounty URL ↗</a>
            </div>
          ) : null}
        </section>

        <section className="proof-glossary-section trust-history-section" aria-labelledby="transaction-history-title">
          <div className="public-market-heading">
            <div>
              <p className="process-eyebrow">Verified money trail</p>
              <h2 id="transaction-history-title">Confirmed transaction history.</h2>
            </div>
            <span className="public-market-note">Only server-confirmed Nimiq funding and payout proofs appear here.</span>
          </div>
          {transactionHistory.length ? (
            <div className="trust-history-grid">
              {transactionHistory.map((item) => (
                <article className="trust-history-card" key={item.id}>
                  <span>{item.type}</span>
                  <strong>{item.amountNim} NIM</strong>
                  <p>{item.bountyTitle}</p>
                  <a href={item.explorerUrl} target="_blank" rel="noreferrer">Verified Nimiq proof ↗</a>
                </article>
              ))}
            </div>
          ) : <div className="public-empty"><strong>No confirmed transactions yet.</strong><span>Confirmed funding and payout records will appear here automatically.</span></div>}
        </section>

        <section className="proof-glossary-section trust-history-section" aria-labelledby="contributor-reliability-title">
          <div className="public-market-heading">
            <div>
              <p className="process-eyebrow">Evidence-based contributor history</p>
              <h2 id="contributor-reliability-title">Reliability without invented scores.</h2>
            </div>
            <span className="public-market-note">Signals come only from GitHub-verified merges and completed MergeEarn payout lifecycles.</span>
          </div>
          {contributorSignals.length ? (
            <div className="trust-history-grid">
              {contributorSignals.map((signal) => (
                <article className="trust-history-card" key={signal.login}>
                  <span>GitHub contributor</span>
                  <strong>@{signal.login}</strong>
                  <p>{signal.verifiedMerges} verified merge{signal.verifiedMerges === 1 ? '' : 's'} · {signal.paidCompletions} paid completion{signal.paidCompletions === 1 ? '' : 's'}</p>
                  <small>{signal.paidCompletions > 0 ? 'Verified MergeEarn completion history' : 'First verified contribution; no paid completion yet'}</small>
                </article>
              ))}
            </div>
          ) : <div className="public-empty"><strong>No verified contributor history yet.</strong><span>Signals appear only after GitHub verifies a linked merge.</span></div>}
        </section>

        <section className="proof-glossary-section" aria-labelledby="proof-glossary-title">
          <div className="public-market-heading">
            <div>
              <p className="process-eyebrow">What the status means</p>
              <h2 id="proof-glossary-title">Plain language proof states.</h2>
            </div>
            <span className="public-market-note">Each important state has an external source of truth.</span>
          </div>
          <div className="proof-glossary-grid">
            {publicProofGlossary().map((entry) => (
              <article className="proof-glossary-card" key={entry.term}>
                <span>{entry.term.replaceAll('_', ' / ')}</span>
                <h3>{entry.title}</h3>
                <p>{entry.description}</p>
                <small>{entry.authority} verifies this state</small>
              </article>
            ))}
          </div>
        </section>

        <section className="sponsor-market" id="sponsor-bounties" aria-labelledby="sponsor-market-title">
          <div className="public-market-heading">
            <div>
              <p className="process-eyebrow">Community funded · zero maintainer spend</p>
              <h2 id="sponsor-market-title">Sponsor the next MergeEarn bounty.</h2>
            </div>
            <span className="public-market-note">Each approved task becomes a real 5 NIM bounty only after Nimiq confirms the sponsor payment.</span>
          </div>
          <div className="sponsor-grid">
            {sponsorIssues.map((issueNumber) => (
              <article className={`sponsor-card ${sponsorTarget === issueNumber ? 'featured' : ''}`} id={`sponsor-${issueNumber}`} key={issueNumber}>
                <span className="sponsor-number">Issue #{issueNumber}</span>
                <h3>{issueNumber === 66 ? 'Open shared bounties in Nimiq Pay' : issueNumber === 67 ? 'Track privacy-safe signup sources' : issueNumber === 68 ? 'Add aggregate acquisition funnel metrics' : 'Add current README judge screenshots'}</h3>
                <p>Small, contributor-friendly MergeEarn task. Server-created bounty, fixed 5 NIM reward, chain-verified funding.</p>
                <div className="sponsor-actions">
                  <a href={`https://github.com/Saidur-droid/MergeEarn/issues/${issueNumber}`} target="_blank" rel="noreferrer">View issue ↗</a>
                  <button className="sponsor-share" type="button" onClick={() => shareSponsorIssue(issueNumber)}>Share</button>
                  <button onClick={() => sponsorIssue(issueNumber)} disabled={Boolean(busy)} aria-label={`Sponsor issue #${issueNumber} with 5 NIM`}>{busy?.startsWith('sponsor') ? 'Working…' : 'Sponsor 5 NIM'}</button>
                </div>
              </article>
            ))}
          </div>
          <div className="sponsor-footnote">
            <span>Maintainer cost: <strong>0 NIM</strong></span>
            <span>Sponsor approves their own wallet transaction. MergeEarn never fabricates funding or wallet activity.</span>
          </div>
        </section>


        <section className="landing-process" aria-labelledby="landing-process-title">
          <div className="process-heading">
            <p className="process-eyebrow">One clean loop</p>
            <h2 id="landing-process-title">From issue to payout, without trusting a screenshot.</h2>
          </div>
          <div className="process-grid">
            <article>
              <span>01</span>
              <h3>Fund the issue</h3>
              <p>A maintainer chooses a real GitHub issue and funds the exact NIM reward through Nimiq Pay.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Ship the fix</h3>
              <p>A contributor claims the bounty and links the real pull request—nothing is self-reported as complete.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Verify the merge</h3>
              <p>MergeEarn checks the repository, expected base branch and merged state directly with GitHub.</p>
            </article>
            <article>
              <span>04</span>
              <h3>Release payout</h3>
              <p>Only verified work can be approved; the Nimiq payment is checked again before the bounty becomes paid.</p>
            </article>
          </div>
        </section>

        <section className="landing-trust" aria-label="Trust model">
          <div>
            <p className="process-eyebrow">The difference</p>
            <h2>Two independent sources of truth.</h2>
          </div>
          <div className="trust-statements">
            <p><span>GitHub</span> is authoritative for repository permission, pull-request identity, branch and merge state.</p>
            <p><span>Nimiq</span> is authoritative for funding and payout. Client-side success never creates money-sensitive state.</p>
          </div>
        </section>

        <footer className="landing-footer">
          <span>MergeEarn · Fund issues. Reward merges.</span>
          <div>
            <a href="https://github.com/Saidur-droid/MergeEarn" target="_blank" rel="noreferrer">Open source ↗</a>
            <a href="https://youtube.com/shorts/xf0TRhqKeUE" target="_blank" rel="noreferrer">Demo ↗</a>
          </div>
        </footer>
      </main>
    );
  }

  return (
    <main className="app-shell production-shell">
      <header className="topbar sticky">
        <a className="brand" href="#top"><span className="brand-mark">M</span><span>MergeEarn</span></a>
        <div className="top-actions">
          <span className="github-user">@{user.login}</span>
          <button className="wallet-button" onClick={connectWallet} disabled={busy === 'wallet'}>{wallet ? shortNimiqAddress(wallet.address) : busy === 'wallet' ? 'Connecting…' : 'Connect Nimiq Pay'}</button>
          <button className="text-button" onClick={logout}>Sign out</button>
        </div>
      </header>

      <section className="hero compact-hero" id="top">
        <p className="eyebrow">Issue → Fund → Fix → PR → Verify → Pay</p>
        <h1>Real bounties. Objective verification. Safe payouts.</h1>
        <p className="hero-copy">Create a bounty from an authorized GitHub repository, verify the merged pull request on the server, then release payment through Nimiq.</p>
      </section>

      <section className="contributor-pool-card" aria-labelledby="contributor-pool-title">
        <div>
          <span className="proof-overline">New contributor</span>
          <h2 id="contributor-pool-title">{communityJoined ? 'You are in the contributor pool.' : 'Want to earn NIM from future GitHub bounties?'}</h2>
          <p>{communityJoined ? 'Watch the public board for FUNDED work. Your GitHub identity is registered; connect Nimiq Pay only when a claim or sponsor action needs a wallet.' : 'Join with your GitHub identity now. Nimiq Pay is not required to join the pool; connect it later only for claiming, funding, or payout.'}</p>
        </div>
        <div className="contributor-pool-actions">
          {!communityJoined ? <button className="primary" type="button" onClick={joinContributorPool} disabled={busy === 'community-join'}>{busy === 'community-join' ? 'Joining…' : 'Join contributor pool'}</button> : <span className="pool-ready">Ready for funded work ✓</span>}
          {!wallet ? <button className="secondary" type="button" onClick={connectWallet}>Connect Nimiq Pay later</button> : null}
        </div>
      </section>

      {!wallet ? (
        <section className={`nimiq-connect-card ${walletHelp ? 'attention' : ''}`} aria-label="Nimiq Pay connection">
          <div>
            <strong>Nimiq Pay is required for funding and payout</strong>
            <span>Inside Nimiq Pay, Connect reads your public wallet address and native payment requests stay user-approved.</span>
          </div>
          <div className="nimiq-connect-actions">
            <button className="secondary" onClick={connectWallet} disabled={busy === 'wallet'}>{busy === 'wallet' ? 'Connecting…' : 'Try connect'}</button>
            <a className="primary button-link" href={nimiqPayDeepLink}>Open in Nimiq Pay</a>
          </div>
        </section>
      ) : (
        <div className="notice wallet-ready" role="status">Nimiq Pay connected: <strong>{shortNimiqAddress(wallet.address)}</strong></div>
      )}

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
              {selectedBounty.status === 'READY_TO_FUND' && user && selectedBounty.creator_user_id === user.id ? <>
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
