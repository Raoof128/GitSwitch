import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  CommitMessage,
  CommitResult,
  DiffMode,
  GitStatus,
  GitStatusPayload,
  PullRequestOptions,
  PullRequestResult,
  PushResult,
  SecretsResult,
  SecretsSaveInput,
  SecretsDeleteInput
} from '../index'

/** Settings returned from main process (public subset) */
export interface SettingsPublic {
  aiCloudModel: string
  aiLocalModel: string
  aiLocalUrl: string
  aiProvider: 'offline' | 'local' | 'cloud'
  aiRedactionEnabled: boolean
  aiTimeoutSec: number
  autoPush: boolean
  defaultAccountId?: string | null
  defaultBaseBranch: 'main' | 'master'
  diffLimitKb: number
  diffLimitLines: number
  hasAiKey: boolean
  hasGitHubToken: boolean
  hasGitLabToken: boolean
  likeApp: boolean
  reducedMotion: boolean
  strictHostKeyChecking: boolean
  theme: 'dark'
}

/** Settings update payload */
export type SettingsUpdateInput = Partial<
  Omit<SettingsPublic, 'hasAiKey' | 'hasGitHubToken' | 'hasGitLabToken'>
>

/** IPC API exposed to the renderer process */
export interface PreloadApi {
  selectFolder: () => Promise<string | null>
  getGitStatus: (repoPath: string) => Promise<GitStatus>
  getGitDiff: (repoPath: string, mode: DiffMode) => Promise<string>
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
  openExternal: (url: string) => Promise<{ ok: boolean }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: PreloadApi
  }
}
