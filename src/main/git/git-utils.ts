/**
 * Shared Git utilities for pull-request.ts and publish-status.ts
 * Extracted to avoid code duplication
 */

/** Git provider type */
export type GitProvider = 'github' | 'gitlab' | 'unknown'

/** Parsed GitHub repository info */
export interface GitHubRepo {
  owner: string
  repo: string
}

/**
 * Fetch with timeout support using AbortController
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds
 * @returns Response or throws on timeout
 */
export const fetchWithTimeout = async (
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

/**
 * Detect the git provider from a remote URL
 * @param remoteUrl - The remote URL to check
 * @returns The detected provider type
 */
export const detectGitProvider = (remoteUrl: string): GitProvider => {
  if (remoteUrl.includes('github.com')) return 'github'
  if (remoteUrl.includes('gitlab.com')) return 'gitlab'
  return 'unknown'
}

/**
 * Parse a GitHub remote URL to extract owner and repo name
 * @param remote - The remote URL (SSH or HTTPS format)
 * @returns Parsed owner/repo or null if not a valid GitHub URL
 */
export const parseGitHubRepo = (remote: string): GitHubRepo | null => {
  // SSH format: git@github.com:owner/repo.git
  const sshMatch = remote.match(/git@github\.com:(.+?)\/(.+?)(\.git)?$/)
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] }
  }
  // HTTPS format: https://github.com/owner/repo.git
  const httpsMatch = remote.match(/https?:\/\/github\.com\/(.+?)\/(.+?)(\.git)?$/)
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] }
  }
  return null
}

/**
 * Parse a GitLab remote URL to extract the project path
 * @param remote - The remote URL (SSH or HTTPS format)
 * @returns Project path or null if not a valid GitLab URL
 */
export const parseGitLabProjectPath = (remote: string): string | null => {
  // SSH format: git@gitlab.com:group/project.git
  const sshMatch = remote.match(/git@gitlab\.com:(.+?)(\.git)?$/)
  if (sshMatch) {
    return sshMatch[1]
  }
  // HTTPS format: https://gitlab.com/group/project.git
  const httpsMatch = remote.match(/https?:\/\/gitlab\.com\/(.+?)(\.git)?$/)
  if (httpsMatch) {
    return httpsMatch[1]
  }
  return null
}
