// -------------------------------------------------------------------------- //
//                                   IMPORTS                                  //
// -------------------------------------------------------------------------- //

import { simpleGit } from 'simple-git'
import type { PublishStatus } from '../../index'
import {
  fetchWithTimeout,
  detectGitProvider,
  parseGitHubRepo,
  parseGitLabProjectPath
} from './git-utils'

// -------------------------------------------------------------------------- //
//                                  CONSTANTS                                 //
// -------------------------------------------------------------------------- //

const FETCH_TIMEOUT_MS = 6000

// -------------------------------------------------------------------------- //
//                                   HELPERS                                  //
// -------------------------------------------------------------------------- //

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
