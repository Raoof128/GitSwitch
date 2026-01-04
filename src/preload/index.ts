import { contextBridge, ipcRenderer } from 'electron'
import type {
  CommitMessage,
  CommitResult,
  DiffMode,
  GitStatus,
  GitStatusPayload,
  PullRequestOptions,
  PullRequestResult,
  PushResult,
  SecretsDeleteInput,
  SecretsResult,
  SecretsSaveInput
} from '../index'

// Custom APIs for renderer
const api = {
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:openDirectory'),
  getGitStatus: (repoPath: string): Promise<GitStatus> =>
    ipcRenderer.invoke('git:status', repoPath),
  getGitDiff: (repoPath: string, mode: DiffMode): Promise<string> =>
    ipcRenderer.invoke('git:diff', repoPath, mode),
  gitCommit: (repoPath: string, title: string, body?: string): Promise<CommitResult> =>
    ipcRenderer.invoke('git:commit', repoPath, title, body),
  generateCommitMessage: (repoPath: string): Promise<CommitMessage> =>
    ipcRenderer.invoke('git:generateCommitMessage', repoPath),
  gitPush: (repoPath: string, accountId: string): Promise<PushResult> =>
    ipcRenderer.invoke('git:push', repoPath, accountId),
  createPullRequest: (repoPath: string, options: PullRequestOptions): Promise<PullRequestResult> =>
    ipcRenderer.invoke('git:createPullRequest', repoPath, options),
  getSettings: (): Promise<{
    aiCloudModel: string
    aiLocalModel: string
    aiLocalUrl: string
    aiProvider: 'offline' | 'local' | 'cloud'
    aiRedactionEnabled: boolean
    aiTimeoutSec: number
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
  }> => ipcRenderer.invoke('settings:get'),
  updateSettings: (
    input: Partial<{
      aiCloudModel: string
      aiLocalModel: string
      aiLocalUrl: string
      aiProvider: 'offline' | 'local' | 'cloud'
      aiRedactionEnabled: boolean
      aiTimeoutSec: number
      defaultAccountId?: string | null
      defaultBaseBranch: 'main' | 'master'
      diffLimitKb: number
      diffLimitLines: number
      likeApp: boolean
      reducedMotion: boolean
      strictHostKeyChecking: boolean
      theme: 'dark'
    }>
  ) => ipcRenderer.invoke('settings:update', input),
  listSecrets: (): Promise<SecretsResult> => ipcRenderer.invoke('secrets:list'),
  saveSecret: (input: SecretsSaveInput): Promise<SecretsResult> =>
    ipcRenderer.invoke('secrets:save', input),
  deleteSecret: (input: SecretsDeleteInput): Promise<SecretsResult> =>
    ipcRenderer.invoke('secrets:delete', input),
  onStatusChange: (callback: (payload: GitStatusPayload) => void): (() => void) => {
    const listener: (event: unknown, payload: unknown) => void = (
      _event: unknown,
      payload: unknown
    ) => {
      const typedPayload = payload as GitStatusPayload
      callback(typedPayload)
    }
    ipcRenderer.on('git:status-changed', listener)
    return () => ipcRenderer.removeListener('git:status-changed', listener)
  },
  openExternal: (url: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('shell:openExternal', url)
}

contextBridge.exposeInMainWorld('api', api)
