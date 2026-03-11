# API Reference

This document describes the preload API exposed to the renderer as `window.api`. All methods cross the Electron IPC boundary and execute in the main process.

## Design Rules

- The renderer never performs direct git, filesystem, shell, or secret operations.
- All methods validate input in the main process before executing privileged work.
- Secret-related methods return status flags and error messages, not decrypted secrets.

## Repository and Git Methods

| Method | Purpose |
| --- | --- |
| `selectFolder()` | Opens the system directory picker and returns a selected repository path or `null`. |
| `getGitStatus(repoPath)` | Returns branch, ahead/behind state, changed files, and staged files. |
| `getGitDiff(repoPath, mode)` | Returns a staged or unstaged diff string with size guards applied. |
| `gitCommit(repoPath, title, body?)` | Creates a commit using the validated message payload. |
| `gitStageAll(repoPath)` | Stages all tracked and untracked changes in the selected repository. |
| `gitGetRemotes(repoPath)` | Lists remotes and URLs for the repository. |
| `gitSetRemoteOrigin(repoPath, url)` | Adds or updates the `origin` remote after URL validation. |
| `gitIgnore(repoPath, filePath)` | Appends a file path to `.gitignore` safely. |
| `gitPush(repoPath, accountId)` | Pushes using the selected or default SSH identity. |
| `gitPull(repoPath, accountId)` | Pulls using the selected or default SSH identity. |
| `gitFetch(repoPath, accountId)` | Fetches remote updates without mutating the working tree. |

## AI and Pull Requests

| Method | Purpose |
| --- | --- |
| `generateCommitMessage(repoPath)` | Produces a commit title/body using offline, local, or cloud AI. |
| `createPullRequest(repoPath, options)` | Creates a GitHub or GitLab pull request from the current branch context. |
| `openExternal(url)` | Opens a trusted GitHub or GitLab HTTPS URL through the main process allowlist. |

## Settings

### `getSettings()`

Returns the public settings payload:

```ts
type SettingsPublic = {
  aiCloudModel: string
  aiLocalModel: string
  aiLocalUrl: string
  aiProvider: 'offline' | 'local' | 'cloud'
  aiPersona: 'standard' | 'cybersecurity'
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
```

### `updateSettings(input)`

Accepts a partial update of the public settings shape, excluding the derived `has*Token` flags.

## Secrets

| Method | Purpose |
| --- | --- |
| `listSecrets()` | Returns configured SSH accounts and secret presence flags. |
| `saveSecret(input)` | Saves AI keys, GitHub tokens, GitLab tokens, or SSH account material. |
| `deleteSecret(input)` | Removes stored keys or accounts. |
| `onStatusChange(callback)` | Subscribes to repository status updates emitted from watchers. |

### Secret Result Contract

```ts
type SecretsResult = {
  ok: boolean
  error?: string
  secrets: {
    accounts: Account[]
    hasAiKey: boolean
    hasGitHubToken: boolean
    hasGitLabToken: boolean
  }
}
```

When `ok` is `false`, the renderer should surface `error` to the user instead of silently ignoring the failure.
