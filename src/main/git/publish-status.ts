// -------------------------------------------------------------------------- //
//                                   IMPORTS                                  //
// -------------------------------------------------------------------------- //

import { simpleGit } from 'simple-git'
import type { PublishStatus } from '../../index'

// -------------------------------------------------------------------------- //
//                                    TYPES                                   //
// -------------------------------------------------------------------------- //

type Provider = 'github' | 'gitlab' | 'unknown'

type GitHubRepo = {
  owner: string
  repo: string
}

const FETCH_TIMEOUT_MS = 6000

const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// -------------------------------------------------------------------------- //
//                                   HELPERS                                  //
// -------------------------------------------------------------------------- //

const detectGitProvider = (remoteUrl: string): Provider => {
  if (remoteUrl.includes('github.com')) return 'github'
  if (remoteUrl.includes('gitlab.com')) return 'gitlab'
  return 'unknown'
}

const parseGitHubRepo = (remote: string): GitHubRepo | null => {
  const sshMatch = remote.match(/git@github\.com:(.+?)\/(.+?)(\.git)?$/)
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] }
  }
  const httpsMatch = remote.match(/https?:\/\/github\.com\/(.+?)\/(.+?)(\.git)?$/)
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] }
  }
  return null
}

const parseGitLabProjectPath = (remote: string): string | null => {
  const sshMatch = remote.match(/git@gitlab\.com:(.+?)(\.git)?$/)
  if (sshMatch) {
    return sshMatch[1]
  }
  const httpsMatch = remote.match(/https?:\/\/gitlab\.com\/(.+?)(\.git)?$/)
  if (httpsMatch) {
    return httpsMatch[1]
  }
  return null
}

const getOriginUrl = async (repoPath: string): Promise<string | null> => {
  const git = simpleGit({ baseDir: repoPath })
  try {
    const config = await git.getConfig('remote.origin.url')
    return config.value ?? null
  } catch {
    return null
  }
}

const getCurrentBranch = async (repoPath: string): Promise<string | null> => {
  const git = simpleGit({ baseDir: repoPath })
  const status = await git.status()
  return status.current ?? null
}

// -------------------------------------------------------------------------- //
//                                   EXPORTS                                  //
// -------------------------------------------------------------------------- //

export async function getPublishStatus(
  repoPath: string,
  tokens: { githubToken: string; gitlabToken: string }
): Promise<PublishStatus | null> {
  const remote = await getOriginUrl(repoPath)
  if (!remote) {
    return null
  }

  const provider = detectGitProvider(remote)
  const branch = await getCurrentBranch(repoPath)
  if (!branch) {
    return null
  }

  if (provider === 'github') {
    let githubToken = tokens.githubToken
    if (!githubToken) {
      return null
    }
    const repo = parseGitHubRepo(remote)
    if (!repo) {
      return null
    }

    const head = encodeURIComponent(`${repo.owner}:${branch}`)
    const response = await fetchWithTimeout(
      `https://api.github.com/repos/${repo.owner}/${repo.repo}/pulls?head=${head}&state=open`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json'
        }
      },
      FETCH_TIMEOUT_MS
    )
    githubToken = ''

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as Array<{
      draft?: boolean
      html_url?: string
    }>
    const pr = data[0]

    if (!pr) {
      return {
        exists: false,
        provider
      }
    }

    return {
      exists: true,
      provider,
      state: pr.draft ? 'draft' : 'open',
      url: pr.html_url
    }
  }

  if (provider === 'gitlab') {
    let gitlabToken = tokens.gitlabToken
    if (!gitlabToken) {
      return null
    }
    const projectPath = parseGitLabProjectPath(remote)
    const project = projectPath ? encodeURIComponent(projectPath) : ''
    if (!project) {
      return null
    }

    const response = await fetchWithTimeout(
      `https://gitlab.com/api/v4/projects/${project}/merge_requests?source_branch=${encodeURIComponent(
        branch
      )}&state=opened`,
      {
        headers: {
          'PRIVATE-TOKEN': gitlabToken
        }
      },
      FETCH_TIMEOUT_MS
    )
    gitlabToken = ''

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as Array<{
      web_url?: string
    }>
    const mr = data[0]

    if (!mr) {
      return {
        exists: false,
        provider
      }
    }

    return {
      exists: true,
      provider,
      state: 'open',
      url: mr.web_url
    }
  }

  return null
}
