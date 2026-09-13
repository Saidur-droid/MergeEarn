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
