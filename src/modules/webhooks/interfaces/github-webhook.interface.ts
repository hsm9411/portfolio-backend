export interface GithubPullRequest {
  title: string;
  body: string | null;
  html_url: string;
  merged: boolean;
}

export interface GithubRepository {
  name: string;
}

export interface GithubPullRequestPayload {
  action: string;
  pull_request: GithubPullRequest;
  repository: GithubRepository;
}
