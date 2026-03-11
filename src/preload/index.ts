import { contextBridge, ipcRenderer } from 'electron'
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
  SecretsDeleteInput,
  SecretsResult,
  SecretsSaveInput
} from '../index'

// Custom APIs for renderer
const api = {
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:openDirectory'),
  getGitStatus: (repoPath: string): Promise<GitStatus> =>
    ipcRenderer.invoke('git:status', repoPath),
  getGitDiff: (repoPath: string, mode: DiffMode, options?: GitDiffOptions): Promise<string> =>
    ipcRenderer.invoke('git:diff', repoPath, mode, options),
  gitListBranches: (repoPath: string): Promise<BranchSummary[]> =>
    ipcRenderer.invoke('git:listBranches', repoPath),
  gitCheckoutBranch: (repoPath: string, branchName: string): Promise<{ current: string | null }> =>
    ipcRenderer.invoke('git:checkoutBranch', repoPath, branchName),
  gitCreateBranch: (
    repoPath: string,
    branchName: string,
    fromBranch?: string
  ): Promise<{ current: string | null }> =>
    ipcRenderer.invoke('git:createBranch', repoPath, branchName, fromBranch),
  gitDiscardChanges: (repoPath: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('git:discardChanges', repoPath),
  gitHardReset: (repoPath: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('git:hardReset', repoPath),
  gitCommit: (repoPath: string, title: string, body?: string): Promise<CommitResult> =>
    ipcRenderer.invoke('git:commit', repoPath, title, body),
  generateCommitMessage: (repoPath: string): Promise<CommitMessage> =>
    ipcRenderer.invoke('git:generateCommitMessage', repoPath),
  gitStageAll: (repoPath: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('git:stageAll', repoPath),
  gitGetRemotes: (repoPath: string): Promise<Array<{ name: string; url: string }>> =>
    ipcRenderer.invoke('git:getRemotes', repoPath),
  gitSetRemoteOrigin: (repoPath: string, url: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('git:setRemoteOrigin', repoPath, url),
  gitIgnore: (repoPath: string, filePath: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('git:ignore', repoPath, filePath),
  gitPush: (repoPath: string, accountId: string): Promise<PushResult> =>
    ipcRenderer.invoke('git:push', repoPath, accountId),
  gitPull: (repoPath: string, accountId: string): Promise<string> =>
    ipcRenderer.invoke('git:pull', repoPath, accountId),
  gitFetch: (repoPath: string, accountId: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('git:fetch', repoPath, accountId),
  createPullRequest: (repoPath: string, options: PullRequestOptions): Promise<PullRequestResult> =>
    ipcRenderer.invoke('git:createPullRequest', repoPath, options),
  getSettings: (): Promise<SettingsPublic> => ipcRenderer.invoke('settings:get'),
  updateSettings: (input: SettingsUpdateInput): Promise<SettingsPublic> =>
    ipcRenderer.invoke('settings:update', input),
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
