import { simpleGit } from 'simple-git'
import type { PullRequestOptions, PullRequestResult } from '../../index'
import {
  fetchWithTimeout,
  detectGitProvider,
  parseGitHubRepo,
  parseGitLabProjectPath
} from './git-utils'

type PrSettings = {
  githubToken: string
  gitlabToken: string
}

const FETCH_TIMEOUT_MS = 8000

async function getOriginUrl(repoPath: string): Promise<string | null> {
  const git = simpleGit({ baseDir: repoPath })
  try {
    const config = await git.getConfig('remote.origin.url')
    return config.value ?? null
  } catch {
    return null
  }
}

export async function createPullRequest(
  repoPath: string,
  options: PullRequestOptions,
  settings: PrSettings
): Promise<PullRequestResult> {
  const remote = await getOriginUrl(repoPath)
  if (!remote) {
    return { success: false, error: 'Remote origin URL not found.' }
  }

  const provider = detectGitProvider(remote)

  if (provider === 'github') {
    let githubToken = settings.githubToken
    if (!githubToken) {
      return { success: false, error: 'Missing GitHub token.' }
    }
    const repo = parseGitHubRepo(remote)
    if (!repo) {
      return { success: false, error: 'Unable to parse GitHub repository.' }
    }

    const response = await fetchWithTimeout(
      `https://api.github.com/repos/${repo.owner}/${repo.repo}/pulls`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json'
        },
        body: JSON.stringify({
          title: options.title,
          body: options.body ?? '',
          head: options.headBranch,
          base: options.baseBranch,
          draft: Boolean(options.draft)
        })
      },
      FETCH_TIMEOUT_MS
    )
    githubToken = ''

    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: text || 'GitHub PR creation failed.' }
    }

    const data = (await response.json()) as { html_url?: string }
    return { success: true, url: data.html_url }
  }

  if (provider === 'gitlab') {
    let gitlabToken = settings.gitlabToken
    if (!gitlabToken) {
      return { success: false, error: 'Missing GitLab token.' }
    }
    const projectPath = parseGitLabProjectPath(remote)
    const project = projectPath ? encodeURIComponent(projectPath) : null

    if (!project) {
      return { success: false, error: 'GitLab project path is required.' }
    }

    const response = await fetchWithTimeout(
      `https://gitlab.com/api/v4/projects/${project}/merge_requests`,
      {
        method: 'POST',
        headers: {
          'PRIVATE-TOKEN': gitlabToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source_branch: options.headBranch,
          target_branch: options.baseBranch,
          title: options.title,
          description: options.body ?? ''
        })
      },
      FETCH_TIMEOUT_MS
    )
    gitlabToken = ''

    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: text || 'GitLab MR creation failed.' }
    }

    const data = (await response.json()) as { web_url?: string }
    return { success: true, url: data.web_url }
  }

  return { success: false, error: 'Provider not supported.' }
}
