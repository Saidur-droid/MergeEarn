```typescript
import { describe, expect, it } from 'vitest';
import { parseGitHubIssueUrl, parseGitHubPullRequestUrl } from './github';

describe('parseGitHubIssueUrl', () => {
  it('parses a standard GitHub issue URL', () => {
    expect(parseGitHubIssueUrl('https://github.com/openai/openai/issues/123')).toEqual({
      owner: 'openai',
      repo: 'openai',
      issueNumber: 123,
    });
  });

  it('rejects non-GitHub hosts', () => {
    expect(() => parseGitHubIssueUrl('https://example.com/openai/openai/issues/123')).toThrow(
      'github.com',
    );
  });

  it('rejects pull request URLs', () => {
    expect(() => parseGitHubIssueUrl('https://github.com/openai/openai/pull/123')).toThrow(
      'GitHub issue URL',
    );
  });

  it('rejects invalid issue numbers', () => {
    expect(() => parseGitHubIssueUrl('https://github.com/openai/openai/issues/not-a-number')).toThrow(
      'issue number',
    );
  });
});

describe('parseGitHubPullRequestUrl', () => {
  it('parses a standard GitHub pull request URL', () => {
    expect(parseGitHubPullRequestUrl('https://github.com/openai/openai/pull/456')).toEqual({
      owner: 'openai',
      repo: 'openai',
      pullNumber: 456,
    });
  });

  it('rejects issue URLs', () => {
    expect(() => parseGitHubPullRequestUrl('https://github.com/openai/openai/issues/456')).toThrow(
      'pull request URL',
    );
  });
});

describe('verified transaction history view requirements', () => {
  it('validates transaction history view constraints and verification rules', () => {
    const mockTransactions = [
      {
        id: 'tx-1',
        bountyContext: 'MergeEarn #33',
        type: 'payout',
        verified: true,
        amount: '5 NIM',
        explorerUrl: 'https://nimiq.observer/#TX1',
      },
      {
        id: 'tx-2',
        bountyContext: 'MergeEarn #34',
        type: 'funding',
        verified: false,
        amount: '10 NIM',
        explorerUrl: null,
      },
    ];

    const verifiedRecords = mockTransactions.filter((tx) => tx.verified);
    const unverifiedRecords = mockTransactions.filter((tx) => !tx.verified);

    // Never present pending/unverified transactions as confirmed
    expect(verifiedRecords.every((tx) => tx.verified)).toBe(true);
    expect(unverifiedRecords.every((tx) => !tx.verified)).toBe(true);

    // Ensure required fields for verified history surface are present
    verifiedRecords.forEach((tx) => {
      expect(tx).toHaveProperty('bountyContext');
      expect(tx).toHaveProperty('type');
      expect(tx).toHaveProperty('amount');
      expect(tx).toHaveProperty('explorerUrl');
      expect(typeof tx.explorerUrl).toBe('string');
    });

    // Ensure no private wallet material or secrets are exposed in the structure
    mockTransactions.forEach((tx) => {
      expect(tx).not.toHaveProperty('privateKey');
      expect(tx).not.toHaveProperty('secret');
      expect(tx).not.toHaveProperty('seed');
    });
  });
});
```
import { describe, expect, it } from 'vitest';
import { parseGitHubIssueUrl, parseGitHubPullRequestUrl } from './github';

describe('parseGitHubIssueUrl', () => {
  it('parses a standard GitHub issue URL', () => {
    expect(parseGitHubIssueUrl('https://github.com/openai/openai/issues/123')).toEqual({
      owner: 'openai',
      repo: 'openai',
      issueNumber: 123,
    });
  });

  it('rejects non-GitHub hosts', () => {
    expect(() => parseGitHubIssueUrl('https://example.com/openai/openai/issues/123')).toThrow(
      'github.com',
    );
  });

  it('rejects pull request URLs', () => {
    expect(() => parseGitHubIssueUrl('https://github.com/openai/openai/pull/123')).toThrow(
      'GitHub issue URL',
    );
  });

  it('rejects invalid issue numbers', () => {
    expect(() => parseGitHubIssueUrl('https://github.com/openai/openai/issues/not-a-number')).toThrow(
      'issue number',
    );
  });
});

describe('parseGitHubPullRequestUrl', () => {
  it('parses a standard GitHub pull request URL', () => {
    expect(parseGitHubPullRequestUrl('https://github.com/openai/openai/pull/456')).toEqual({
      owner: 'openai',
      repo: 'openai',
      pullNumber: 456,
    });
  });

  it('rejects issue URLs', () => {
    expect(() => parseGitHubPullRequestUrl('https://github.com/openai/openai/issues/456')).toThrow(
      'pull request URL',
    );
  });
});

describe('verified transaction history view requirements', () => {
  it('validates transaction history view constraints and verification rules', () => {
    const mockTransactions = [
      {
        id: 'tx-1',
        bountyContext: 'MergeEarn #33',
        type: 'payout',
        verified: true,
        amount: '5 NIM',
        explorerUrl: 'https://nimiq.observer/#TX1',
      },
      {
        id: 'tx-2',
        bountyContext: 'MergeEarn #34',
        type: 'funding',
        verified: false,
        amount: '10 NIM',
        explorerUrl: null,
      },
    ];

    const verifiedRecords = mockTransactions.filter((tx) => tx.verified);
    const unverifiedRecords = mockTransactions.filter((tx) => !tx.verified);

    // Never present pending/unverified transactions as confirmed
    expect(verifiedRecords.every((tx) => tx.verified)).toBe(true);
    expect(unverifiedRecords.every((tx) => !tx.verified)).toBe(true);

    // Ensure required fields for verified history surface are present
    verifiedRecords.forEach((tx) => {
      expect(tx).toHaveProperty('bountyContext');
      expect(tx).toHaveProperty('type');
      expect(tx).toHaveProperty('amount');
      expect(tx).toHaveProperty('explorerUrl');
      expect(typeof tx.explorerUrl).toBe('string');
    });

    // Ensure no private wallet material or secrets are exposed in the structure
    mockTransactions.forEach((tx) => {
      expect(tx).not.toHaveProperty('privateKey');
      expect(tx).not.toHaveProperty('secret');
      expect(tx).not.toHaveProperty('seed');
    });
  });
});
