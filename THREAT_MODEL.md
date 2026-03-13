# Threat Model

GitSwitch is an Electron desktop application that manages git repositories, SSH keys, API tokens, and AI-assisted commit generation. This document describes the trust boundaries, threat surfaces, and mitigations in place.

## Trust Boundaries

```
┌─────────────────────────────────────────────────┐
│  Renderer (UNTRUSTED)                           │
│  React UI, Zustand state, user input            │
│  sandbox: true, nodeIntegration: false          │
├─────────────────────────────────────────────────┤
│  Preload Bridge (NARROW)                        │
│  contextBridge + typed IPC calls only           │
├─────────────────────────────────────────────────┤
│  Main Process (TRUSTED)                         │
│  IPC validation, git ops, secret storage,       │
│  file system, child processes, network calls    │
├─────────────────────────────────────────────────┤
│  OS / Filesystem / Network (EXTERNAL)           │
│  Keychain (safeStorage), git binary, SSH agent, │
│  GitHub/GitLab APIs, AI provider APIs           │
└─────────────────────────────────────────────────┘
```

## Threat Categories

### T1: Renderer Compromise

**Risk:** XSS or malicious content in a diff could execute code in the renderer.

**Mitigations:**
- `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`
- Production CSP restricts `script-src` to `'self'`
- `will-navigate` event blocked for non-app origins
- `setWindowOpenHandler` denies all new windows; only trusted URLs opened externally
- Renderer has no filesystem, shell, or network access

### T2: IPC Abuse

**Risk:** A compromised renderer sends malicious IPC payloads (path traversal, injection).

**Mitigations:**
- Every IPC handler validates inputs with `assertString`, `assertNumber`, `assertBoolean`, `assertKeys`
- Repository paths normalized via `realpath()` with `..` traversal blocked
- Branch names validated against git naming rules (no shell metacharacters)
- Repository access requires explicit user dialog approval before first operation
- Allowed IPC channel keys are explicitly whitelisted per handler

### T3: Command Injection via Git

**Risk:** Untrusted branch names, file paths, or remote URLs injected into shell commands.

**Mitigations:**
- `simple-git` library handles argument escaping for most operations
- `pushWithIdentity` uses `spawn()` with argument array (no shell interpolation)
- `GIT_SSH_COMMAND` temp key paths validated against `[a-zA-Z0-9/_.\-]` pattern
- Remote URL format validated: only `git@`, `https://`, `ssh://` prefixes accepted
- Branch names validated against control characters, `..`, spaces, and shell metacharacters

### T4: Secret Leakage

**Risk:** SSH private keys, API tokens, or credentials exposed to renderer, logs, or disk.

**Mitigations:**
- Private keys encrypted with `safeStorage` (OS keychain) and stored under `~/.gitswitch/keys/*.enc`
- Renderer receives only boolean presence flags (`hasAiKey`, `hasGitHubToken`)
- Private keys zeroed from variables immediately after temp file creation
- Temp SSH key files created with `0600` permissions, cleaned up in `finally` blocks
- `process.on('exit')` cleanup for crash scenarios
- Error messages redact commit hashes and user home paths
- AI diff content optionally redacted before transmission

### T5: Temp File Persistence

**Risk:** SSH key material lingers on disk after crash or abnormal termination.

**Mitigations:**
- `activeTempKeys` Set tracks all live temp files
- `cleanupTempKey()` removes both file and parent directory
- `process.on('exit')` synchronous cleanup as last resort
- Temp files created in OS temp directory with unique prefix
- Temp path length validated and shell-safe characters enforced

### T6: External URL Phishing

**Risk:** Renderer tricked into opening malicious URLs disguised as GitHub/GitLab.

**Mitigations:**
- `isAllowedExternalUrl()` validates against explicit hostname whitelist
- Only HTTPS protocol allowed
- Subdomain matching uses `endsWith` with dot prefix boundary check
- `will-navigate` blocks renderer navigation to non-app origins
- `setWindowOpenHandler` denies all popup windows

### T7: AI Provider Data Exfiltration

**Risk:** Sensitive code in diffs sent to external AI APIs without user awareness.

**Mitigations:**
- `aiRedactionEnabled` setting applies regex-based secret redaction before API calls
- Diff truncation limits data sent to AI (configurable KB and line limits)
- AI hallucination detection blocks responses referencing files not in the diff
- Rate limiting (15 requests/minute) prevents abuse
- Local LLM option keeps all data on-device

### T8: Denial of Service

**Risk:** Large repositories, rapid polling, or excessive IPC calls degrade performance.

**Mitigations:**
- File watcher debounced at 300ms with error backoff (5 errors -> 30s pause)
- Git status limited to 1000 files per IPC response
- Diff size checked via `--shortstat` before loading full content
- IPC hard limit of 512KB for diff payloads
- UI truncates diff display at 50 files
- Auto-fetch interval at 30 seconds (not continuous polling)

## Known Limitations

- `safeStorage` requires a working OS keychain; fallback is graceful failure, not plaintext storage
- Self-hosted GitHub Enterprise and GitLab instances are not supported (hardcoded `.com` domains)
- macOS notarization is currently disabled in the build configuration
- The offline commit generator uses heuristic pattern matching, not semantic analysis
- Rate limiting is process-local and resets on app restart

## Reporting

Report security vulnerabilities privately via the process described in [SECURITY.md](SECURITY.md).
