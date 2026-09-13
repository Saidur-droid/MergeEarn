export type GitHubIssue = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  htmlUrl: string;
  state: string;
  repository: {
    owner: string;
    name: string;
    fullName: string;
  };
};

export type GitHubPullRequest = {
  id: number;
  number: number;
  title: string;
  htmlUrl: string;
  state: string;
  merged: boolean;
  mergedAt: string | null;
  baseBranch: string;
  headSha: string;
  authorLogin: string | null;
  repository: {
    owner: string;
    name: string;
    fullName: string;
  };
};

export type ParsedGitHubIssueUrl = {
  owner: string;
  repo: string;
  issueNumber: number;
};

export type ParsedGitHubPullRequestUrl = {
  owner: string;
  repo: string;
  pullNumber: number;
};

function parseGitHubUrl(value: string, kind: 'issues' | 'pull'): {
  owner: string;
  repo: string;
  number: number;
} {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`Enter a valid GitHub ${kind === 'issues' ? 'issue' : 'pull request'} URL.`);
  }

  if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') {
    throw new Error('The URL must point to github.com.');
  }

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 4 || parts[2] !== kind) {
    throw new Error(
      kind === 'issues'
        ? 'Use a GitHub issue URL like github.com/owner/repo/issues/123.'
        : 'Use a GitHub pull request URL like github.com/owner/repo/pull/123.',
    );
  }

  const number = Number(parts[3]);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`The GitHub ${kind === 'issues' ? 'issue' : 'pull request'} number is invalid.`);
  }

  return { owner: parts[0], repo: parts[1], number };
}

export function parseGitHubIssueUrl(value: string): ParsedGitHubIssueUrl {
  const parsed = parseGitHubUrl(value, 'issues');
  return { owner: parsed.owner, repo: parsed.repo, issueNumber: parsed.number };
}

export function parseGitHubPullRequestUrl(value: string): ParsedGitHubPullRequestUrl {
  const parsed = parseGitHubUrl(value, 'pull');
  return { owner: parsed.owner, repo: parsed.repo, pullNumber: parsed.number };
}

async function githubFetch(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
}

export async function fetchPublicGitHubIssue(issueUrl: string): Promise<GitHubIssue> {
  const parsed = parseGitHubIssueUrl(issueUrl);
  const response = await githubFetch(
    `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/issues/${parsed.issueNumber}`,
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Issue not found, private, or unavailable to anonymous access.');
    }
    throw new Error(`GitHub returned ${response.status}. Try again shortly.`);
  }

  const data = (await response.json()) as {
    id: number;
    number: number;
    title: string;
    body: string | null;
    html_url: string;
    state: string;
    pull_request?: unknown;
  };

  if (data.pull_request) {
    throw new Error('That URL points to a pull request, not an issue.');
  }

  return {
    id: data.id,
    number: data.number,
    title: data.title,
    body: data.body,
    htmlUrl: data.html_url,
    state: data.state,
    repository: {
      owner: parsed.owner,
      name: parsed.repo,
      fullName: `${parsed.owner}/${parsed.repo}`,
    },
  };
}

export async function fetchPublicGitHubPullRequest(
  pullRequestUrl: string,
  expectedRepositoryFullName?: string,
): Promise<GitHubPullRequest> {
  const parsed = parseGitHubPullRequestUrl(pullRequestUrl);
  const fullName = `${parsed.owner}/${parsed.repo}`;

  if (expectedRepositoryFullName && fullName.toLowerCase() !== expectedRepositoryFullName.toLowerCase()) {
    throw new Error(`The pull request must belong to ${expectedRepositoryFullName}.`);
  }

  const response = await githubFetch(
    `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/pulls/${parsed.pullNumber}`,
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Pull request not found, private, or unavailable to anonymous access.');
    }
    throw new Error(`GitHub returned ${response.status}. Try again shortly.`);
  }

  const data = (await response.json()) as {
    id: number;
    number: number;
    title: string;
    html_url: string;
    state: string;
    merged: boolean;
    merged_at: string | null;
    base: { ref: string };
    head: { sha: string };
    user: { login: string } | null;
  };

  return {
    id: data.id,
    number: data.number,
    title: data.title,
    htmlUrl: data.html_url,
    state: data.state,
    merged: data.merged,
    mergedAt: data.merged_at,
    baseBranch: data.base.ref,
    headSha: data.head.sha,
    authorLogin: data.user?.login ?? null,
    repository: {
      owner: parsed.owner,
      name: parsed.repo,
      fullName,
    },
  };
}
