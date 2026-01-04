export type RepoSummary = {
  path: string
  name: string
}

export type GitStatusFile = {
  path: string
  index: string
  working_dir: string
}

export type GitStatus = {
  current: string | null
  ahead: number
  behind: number
  files: GitStatusFile[]
  staged: string[]
}

export type GitStatusPayload = {
  repoPath: string
  status: GitStatus
}

export type DiffMode = 'staged' | 'unstaged'

export type PushResult = {
  stdout: string
  stderr: string
}

export type CommitResult = {
  hash: string
  summary?: {
    changes: number
    insertions: number
    deletions: number
  }
}

export type CommitMessage = {
  title: string
  body?: string
}

export type PrProvider = 'github' | 'gitlab' | 'none'

export type PullRequestOptions = {
  title: string
  body?: string
  baseBranch: string
  headBranch: string
  draft?: boolean
}

export type PullRequestResult = {
  success: boolean
  url?: string
  error?: string
}

export type PublishStatus = {
  exists: boolean
  provider: 'github' | 'gitlab'
  state?: 'draft' | 'merged' | 'open'
  url?: string
}

export type AiCloudModel = 'gpt-4o-mini' | 'gpt-4o' | 'gemini-2.0-flash-exp'

export type Account = {
  id: string
  name: string
  createdAt: string
  publicKeyFingerprint?: string
}

export type SecretsSnapshot = {
  accounts: Account[]
  hasAiKey: boolean
  hasGitHubToken: boolean
  hasGitLabToken: boolean
}

export type SecretsSaveInput =
  | { type: 'ai' | 'github' | 'gitlab'; value: string }
  | { type: 'ssh'; action: 'add'; name: string; privateKey: string }
  | { type: 'ssh'; action: 'rename'; id: string; name: string }

export type SecretsDeleteInput = { type: 'ai' | 'github' | 'gitlab' } | { type: 'ssh'; id: string }

export type SecretsResult = {
  ok: boolean
  secrets: SecretsSnapshot
}
