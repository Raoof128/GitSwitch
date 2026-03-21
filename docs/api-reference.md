# API Reference

GitSwitch exposes a typed IPC API to the renderer process as `window.api`. Every method in this surface crosses the Electron `contextBridge` boundary and executes exclusively in the main process. The renderer is treated as untrusted: it cannot touch the filesystem, invoke shell commands, run git operations, or access decrypted secrets under any circumstances.

This architecture follows the principle of least privilege. The preload script (`src/preload/index.ts`) defines a narrow, fully typed contract using Electron's `contextBridge.exposeInMainWorld`. Each call maps to a dedicated IPC channel, and the main process validates every input before performing privileged work.

---

## Security Design Principles

| Principle | Implementation |
| --- | --- |
| **Process isolation** | `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`. The renderer has no access to Node.js APIs. |
| **Input validation at the trust boundary** | Every IPC handler validates inputs with `assertString`, `assertNumber`, `assertBoolean`, and `assertKeys` before dispatch. Prototype pollution is blocked by rejecting `__proto__`, `constructor`, and `prototype` keys. |
| **No secret exposure** | Secret-related methods return boolean presence flags (`hasAiKey`, `hasGitHubToken`, `hasGitLabToken`) and structured error messages, never decrypted material. |
| **Repository access gating** | A repository path must be explicitly approved by the user through a system dialog before any git operation is permitted. Paths are normalized via `realpath()` with `..` traversal blocked. |
| **Diff size guards** | Diff payloads are checked via `--shortstat` before loading full content. An IPC hard limit of 512 KB prevents oversized payloads from degrading the Electron event loop or renderer performance. |
| **Allowlisted external URLs** | `openExternal` validates URLs against an explicit hostname allowlist (GitHub, GitLab) with HTTPS-only enforcement, preventing phishing and arbitrary URL opening. |

---

## Repository and Git Operations

These methods manage the core git workflow. All git commands execute through `simple-git` or `spawn()` with argument arrays (no shell interpolation), and SSH key material is written to temporary `0600` files that are cleaned up immediately after use.

| Method | Signature | Purpose |
| --- | --- | --- |
| `selectFolder` | `() => Promise<string \| null>` | Opens the native OS directory picker and returns the selected repository path, or `null` if the user cancels. The main process validates the path and prompts for repository access approval before any subsequent operations. |
| `getGitStatus` | `(repoPath: string) => Promise<GitStatus>` | Returns the current branch name, ahead/behind counts relative to the tracking remote, changed files, and staged files. Response is capped at 1,000 files to prevent IPC saturation. |
| `getGitDiff` | `(repoPath: string, mode: DiffMode, options?: GitDiffOptions) => Promise<string>` | Returns a staged or unstaged diff string. The main process applies configurable size guards (default: 80 KB / 400 lines) and checks `--shortstat` before loading full content, protecting both the IPC channel and the renderer from oversized payloads. |
| `gitCommit` | `(repoPath: string, title: string, body?: string) => Promise<CommitResult>` | Creates a commit using the validated message payload. The title and body are sanitized in the main process before execution. Commit body size limits prevent oversized payloads. |
| `gitStageAll` | `(repoPath: string) => Promise<{ ok: boolean }>` | Stages all tracked and untracked changes in the repository. The repository path is validated against the approved access list before execution. |
| `gitGetRemotes` | `(repoPath: string) => Promise<Array<{ name: string; url: string }>>` | Returns the list of configured remotes and their URLs for the given repository. |
| `gitSetRemoteOrigin` | `(repoPath: string, url: string) => Promise<{ ok: boolean }>` | Adds or updates the `origin` remote. The URL is validated against accepted prefixes (`git@`, `https://`, `ssh://`) before execution, preventing injection of malicious remote targets. |
| `gitIgnore` | `(repoPath: string, filePath: string) => Promise<{ ok: boolean }>` | Safely appends a file path to `.gitignore`. The file path is validated to prevent directory traversal. |
| `gitPush` | `(repoPath: string, accountId: string) => Promise<PushResult>` | Pushes to the remote using the specified SSH identity. The private key is decrypted from `safeStorage`, written to a temporary `0600` file, injected via `GIT_SSH_COMMAND`, and deleted in a `finally` block. |
| `gitPull` | `(repoPath: string, accountId: string) => Promise<string>` | Pulls from the remote using the specified SSH identity. Follows the same temporary key lifecycle as `gitPush`. |
| `gitFetch` | `(repoPath: string, accountId: string) => Promise<{ ok: boolean }>` | Fetches remote updates without mutating the working tree. Uses the same secure SSH identity flow. |
| `gitListBranches` | `(repoPath: string) => Promise<BranchSummary[]>` | Returns local branches, capped at 500 entries to bound IPC payload size. |
| `gitCheckoutBranch` | `(repoPath: string, branchName: string) => Promise<{ current: string \| null }>` | Switches to the specified branch. Branch names are validated against git naming rules, rejecting shell metacharacters, `..` sequences, spaces, and control characters. |
| `gitCreateBranch` | `(repoPath: string, branchName: string, fromBranch?: string) => Promise<{ current: string \| null }>` | Creates and checks out a new branch, optionally from a specified base. Both branch name arguments are validated. |
| `gitDiscardChanges` | `(repoPath: string) => Promise<{ ok: boolean }>` | Discards all unstaged tracked changes in the working tree. |
| `gitHardReset` | `(repoPath: string) => Promise<{ ok: boolean }>` | Hard-resets the repository to `HEAD`, discarding both staged and unstaged changes. This is a destructive operation. |
| `gitUnwatchRepo` | `(repoPath: string) => Promise<{ ok: boolean }>` | Stops the file watcher for the repository and revokes its access approval. The repository must be re-added and re-approved before future operations. |

---

## AI Commit Generation and Pull Requests

AI orchestration runs entirely in the main process. The renderer sends a repository path and receives a structured commit message or pull-request result. It never sees raw API keys, diff content sent to providers, or intermediate AI responses.

| Method | Signature | Purpose |
| --- | --- | --- |
| `generateCommitMessage` | `(repoPath: string) => Promise<CommitMessage>` | Generates a commit title and optional body using the configured AI provider. The pipeline is: (1) collect the staged diff, (2) apply configurable redaction (emails, URLs, AWS keys, SSH keys, platform tokens), (3) truncate to size limits, (4) enforce rate limiting (15 requests/minute), (5) check cloud consent if applicable, (6) dispatch to the selected provider (offline heuristics, local LLM, or cloud API via Gemini/OpenAI/Anthropic), (7) validate the response for hallucinated file paths. |
| `createPullRequest` | `(repoPath: string, options: PullRequestOptions) => Promise<PullRequestResult>` | Creates a GitHub pull request or GitLab merge request from the current branch context. The hosting token is loaded from `safeStorage`, used for the API call, and wiped from memory after the request completes. |
| `openExternal` | `(url: string) => Promise<{ ok: boolean }>` | Opens a URL in the system browser, but only if the URL passes the allowlist check: HTTPS protocol required, hostname must match `github.com` or `gitlab.com` (including subdomains). All other URLs are rejected. |

---

## Audit, Updates, and Data Management

These methods support compliance workflows (GDPR right of access, right to erasure), structured audit logging, and secure auto-update delivery.

| Method | Signature | Purpose |
| --- | --- | --- |
| `exportAuditLog` | `() => Promise<string>` | Returns the full structured audit log as a JSONL string. The log captures security-relevant events: key access/save/delete, AI cloud requests, consent changes, PR creation, push/pull/fetch, settings updates, and data exports. Log files rotate automatically at 5 MB. |
| `exportData` | `() => Promise<{ data: Record<string, unknown>; auditLog: string }>` | Returns all settings and account metadata as a JSON payload, combined with the audit log. Private keys and decrypted tokens are excluded. This supports GDPR data portability (Art. 20). |
| `deleteAllData` | `() => Promise<{ ok: boolean }>` | Permanently erases all SSH keys, API tokens, settings, and audit logs from disk and the OS keychain. This is irreversible and supports GDPR right to erasure (Art. 17). |
| `installUpdate` | `() => Promise<void>` | Quits the application and applies a previously downloaded update via `electron-updater`. |
| `onUpdateAvailable` | `(callback: (info: { version: string }) => void) => () => void` | Subscribes to update-available notifications from `electron-updater`. Returns an unsubscribe function for cleanup. Checks run on startup and every 4 hours. |
| `onUpdateDownloaded` | `(callback: (info: { version: string }) => void) => () => void` | Subscribes to update-downloaded notifications. Returns an unsubscribe function. The renderer uses this to display an install prompt. |

---

## Settings

### `getSettings()`

**Signature:** `() => Promise<SettingsPublic>`

Returns the public settings payload. Note that the `has*` flags are derived server-side from the presence of encrypted secrets in the keychain. They are read-only in the renderer.

```ts
type SettingsPublic = {
  aiCloudModel: string            // Selected cloud model identifier (e.g., "gemini-3-flash")
  aiLocalModel: string            // Local LLM model name (e.g., "qwen2.5-coder:7b")
  aiLocalUrl: string              // Local LLM endpoint (SSRF-validated before use)
  aiProvider: 'offline' | 'local' | 'cloud'
  aiCloudConsented: boolean       // Cloud AI consent gate — must be true for cloud requests
  aiPersona: 'standard' | 'cybersecurity'
  aiRedactionEnabled: boolean     // Redacts secrets from diffs before AI transmission
  aiTimeoutSec: number            // Timeout for AI provider requests
  autoPush: boolean               // Auto-push after commit
  defaultAccountId?: string | null
  defaultBaseBranch: 'main' | 'master'
  diffLimitKb: number             // Max diff size in KB for AI context
  diffLimitLines: number          // Max diff lines for AI context
  hasAiKey: boolean               // Read-only: derived from keychain presence
  hasGitHubToken: boolean         // Read-only: derived from keychain presence
  hasGitLabToken: boolean         // Read-only: derived from keychain presence
  likeApp: boolean
  reducedMotion: boolean          // Accessibility: reduces UI animations
  strictHostKeyChecking: boolean  // SSH StrictHostKeyChecking enforcement
  theme: 'dark'
}
```

### `updateSettings(input)`

**Signature:** `(input: SettingsUpdateInput) => Promise<SettingsPublic>`

Accepts a partial update of the public settings shape. The derived `has*` flags are excluded from the input type and cannot be set by the renderer. All input keys are validated against the allowed schema, and prototype pollution keys are rejected. The updated settings are persisted and the full `SettingsPublic` payload is returned.

---

## Secret Management

Secret management is the most security-sensitive surface in the API. All encryption and decryption happens via Electron's `safeStorage`, which delegates to the OS keychain (macOS Keychain, Windows Credential Manager, or Linux Secret Service). The renderer never receives decrypted material.

| Method | Signature | Purpose |
| --- | --- | --- |
| `listSecrets` | `() => Promise<SecretsResult>` | Returns configured SSH accounts (metadata only: ID, name, email) and boolean presence flags for AI keys, GitHub tokens, and GitLab tokens. No decrypted secrets cross the IPC boundary. |
| `saveSecret` | `(input: SecretsSaveInput) => Promise<SecretsResult>` | Saves an AI API key, GitHub token, GitLab token, or SSH account (private key + metadata). The secret is encrypted with `safeStorage` and written to `~/.gitswitch/keys/*.enc`. The operation is recorded in the audit log. |
| `deleteSecret` | `(input: SecretsDeleteInput) => Promise<SecretsResult>` | Removes a stored key or account. The encrypted file is deleted from disk and the metadata is removed from `electron-store`. The deletion is recorded in the audit log. |
| `onStatusChange` | `(callback: (payload: GitStatusPayload) => void) => () => void` | Subscribes to real-time repository status updates emitted by the file watcher subsystem. The watcher debounces filesystem events at 500 ms, enforces a directory depth limit of 4, and backs off for 30 seconds after 5 consecutive errors. Returns an unsubscribe function. |

### Secret Result Contract

Every secret operation returns a consistent result envelope:

```ts
type SecretsResult = {
  ok: boolean
  error?: string
  secrets: {
    accounts: Account[]       // SSH account metadata (no private keys)
    hasAiKey: boolean          // Presence flag only
    hasGitHubToken: boolean    // Presence flag only
    hasGitLabToken: boolean    // Presence flag only
  }
}
```

When `ok` is `false`, the `error` field contains a user-facing message that the renderer must surface. The renderer should never silently ignore a failed secret operation, as it may indicate a keychain lockout, a corrupted store, or a permissions issue that requires user action.

<!-- GAPS:
- The `CommitResult`, `PushResult`, `PullRequestResult`, and `PullRequestOptions` type definitions are not documented inline. Adding their shapes would make this reference self-contained.
- The `GitDiffOptions` type is referenced in `getGitDiff` but not described.
- The `DiffMode` enum/union values ("staged" vs "unstaged"?) are not documented.
- The `SecretsSaveInput` and `SecretsDeleteInput` type shapes are not shown. Documenting what fields each accepts (e.g., type discriminator for AI key vs SSH account vs GitHub token) would improve clarity.
- The `Account` type shape (id, name, email, etc.) is not documented.
- The `GitStatus` and `GitStatusPayload` type shapes are not documented.
- Error handling conventions across methods are inconsistent in the docs — some methods return `{ ok: boolean }`, others return richer result types. A unified error-handling section would help.
- The `BranchSummary` type shape is not documented.
- The SSRF validation rules for `aiLocalUrl` (blocked hosts, HTTPS requirement for non-localhost) are mentioned in the threat model but not in this API reference.
- Rate limiting behavior (15 req/min, process-local, resets on restart) is described for `generateCommitMessage` but not formally specified as part of the API contract.
-->
