/// <reference types="vite/client" />

/// <reference types="react/jsx-runtime" />

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
} from '../../index'

declare global {
  interface Window {
    api: {
      selectFolder: () => Promise<string | null>
      getGitStatus: (repoPath: string) => Promise<GitStatus>
      getGitDiff: (repoPath: string, mode: DiffMode) => Promise<string>
      gitCommit: (repoPath: string, title: string, body?: string) => Promise<CommitResult>
      generateCommitMessage: (repoPath: string) => Promise<CommitMessage>
      gitPush: (repoPath: string, accountId: string) => Promise<PushResult>
      createPullRequest: (
        repoPath: string,
        options: PullRequestOptions
      ) => Promise<PullRequestResult>
      getSettings: () => Promise<{
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
      }>
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
      ) => Promise<{
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
      }>
      listSecrets: () => Promise<SecretsResult>
      saveSecret: (input: SecretsSaveInput) => Promise<SecretsResult>
      deleteSecret: (input: SecretsDeleteInput) => Promise<SecretsResult>
      onStatusChange: (callback: (payload: GitStatusPayload) => void) => () => void
    }
  }
}
