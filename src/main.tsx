import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">MergeEarn</p>
        <h1>Fund issues. Reward merges.</h1>
        <p className="subtitle">
          Turn a GitHub issue into paid, verified work. Contributors fix it,
          submit a pull request, and get paid after the work is merged.
        </p>

        <div className="flow" aria-label="How MergeEarn works">
          {['Issue', 'Fund', 'Fix', 'Pull Request', 'Merge', 'Pay'].map((step) => (
            <span className="flow-step" key={step}>{step}</span>
          ))}
        </div>

        <div className="actions">
          <button className="primary" type="button">Connect GitHub</button>
          <button className="secondary" type="button">Browse bounties</button>
        </div>
      </section>

      <section className="roles" aria-label="Ways to use MergeEarn">
        <article>
          <span className="role-label">For maintainers</span>
          <h2>Turn an issue into a bounty.</h2>
          <p>Pick an issue, set the reward, fund it, review the pull request, then pay.</p>
        </article>
        <article>
          <span className="role-label">For contributors</span>
          <h2>Fix it. Merge it. Get paid.</h2>
          <p>Choose a funded issue, complete the work, link your pull request, and track payout status.</p>
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
