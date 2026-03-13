import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  BranchSummary,
  SettingsPublic,
  SettingsUpdateInput,
  CommitMessage,
  CommitResult,
  DiffMode,
  GitDiffOptions,
  GitStatus,
  GitStatusPayload,
  PullRequestOptions,
  PullRequestResult,
  PushResult,
  SecretsResult,
  SecretsSaveInput,
  SecretsDeleteInput
} from '../index'

/** IPC API exposed to the renderer process */
export interface PreloadApi {
  selectFolder: () => Promise<string | null>
  getGitStatus: (repoPath: string) => Promise<GitStatus>
  getGitDiff: (repoPath: string, mode: DiffMode, options?: GitDiffOptions) => Promise<string>
  gitListBranches: (repoPath: string) => Promise<BranchSummary[]>
  gitCheckoutBranch: (repoPath: string, branchName: string) => Promise<{ current: string | null }>
  gitCreateBranch: (
    repoPath: string,
    branchName: string,
    fromBranch?: string
  ) => Promise<{ current: string | null }>
  gitDiscardChanges: (repoPath: string) => Promise<{ ok: boolean }>
  gitHardReset: (repoPath: string) => Promise<{ ok: boolean }>
  gitCommit: (repoPath: string, title: string, body?: string) => Promise<CommitResult>
  generateCommitMessage: (repoPath: string) => Promise<CommitMessage>
  gitStageAll: (repoPath: string) => Promise<{ ok: boolean }>
  gitGetRemotes: (repoPath: string) => Promise<Array<{ name: string; url: string }>>
  gitSetRemoteOrigin: (repoPath: string, url: string) => Promise<{ ok: boolean }>
  gitIgnore: (repoPath: string, filePath: string) => Promise<{ ok: boolean }>
  gitPush: (repoPath: string, accountId: string) => Promise<PushResult>
  gitPull: (repoPath: string, accountId: string) => Promise<string>
  gitFetch: (repoPath: string, accountId: string) => Promise<{ ok: boolean }>
  createPullRequest: (repoPath: string, options: PullRequestOptions) => Promise<PullRequestResult>
  getSettings: () => Promise<SettingsPublic>
  updateSettings: (input: SettingsUpdateInput) => Promise<SettingsPublic>
  listSecrets: () => Promise<SecretsResult>
  saveSecret: (input: SecretsSaveInput) => Promise<SecretsResult>
  deleteSecret: (input: SecretsDeleteInput) => Promise<SecretsResult>
  onStatusChange: (callback: (payload: GitStatusPayload) => void) => () => void
  gitUnwatchRepo: (repoPath: string) => Promise<{ ok: boolean }>
  openExternal: (url: string) => Promise<{ ok: boolean }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: PreloadApi
  }
}
