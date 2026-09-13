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

export type ParsedGitHubIssueUrl = {
  owner: string;
  repo: string;
  issueNumber: number;
};

export function parseGitHubIssueUrl(value: string): ParsedGitHubIssueUrl {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('Enter a valid GitHub issue URL.');
  }

  if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') {
    throw new Error('The URL must point to github.com.');
  }

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 4 || parts[2] !== 'issues') {
    throw new Error('Use a GitHub issue URL like github.com/owner/repo/issues/123.');
  }

  const issueNumber = Number(parts[3]);
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new Error('The GitHub issue number is invalid.');
  }

  return {
    owner: parts[0],
    repo: parts[1],
    issueNumber,
  };
}

export async function fetchPublicGitHubIssue(issueUrl: string): Promise<GitHubIssue> {
  const parsed = parseGitHubIssueUrl(issueUrl);
  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/issues/${parsed.issueNumber}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
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
