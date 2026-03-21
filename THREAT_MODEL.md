# Threat Model

GitSwitch is a security-first Electron desktop application that manages Git repositories, SSH keys, API tokens, and AI-assisted commit generation across multiple developer identities. This document enumerates the trust boundaries, threat surfaces, and mitigations that protect users and their credentials.

This threat model follows an asset-centric approach: GitSwitch handles high-value assets (SSH private keys, API tokens, source code diffs, repository credentials), and the mitigations are designed to protect those assets across every boundary they cross. For the architectural context behind these decisions, see [ARCHITECTURE.md](ARCHITECTURE.md). For reporting policies, see [SECURITY.md](SECURITY.md).

## Trust Boundaries

GitSwitch enforces four distinct trust zones. Every data flow that crosses a boundary is subject to validation, and no zone trusts another implicitly.

```
+---------------------------------------------------+
|  Renderer (UNTRUSTED)                             |
|  React 19 UI, Zustand state, user input           |
|  sandbox: true, nodeIntegration: false            |
+===================================================+
|  Preload Bridge (NARROW)                          |
|  contextBridge + typed IPC calls only             |
|  ~120 lines, no Node.js API exposure              |
+===================================================+
|  Main Process (TRUSTED)                           |
|  IPC validation, Git ops, secret storage,         |
|  filesystem, child processes, network calls       |
+===================================================+
|  OS / Filesystem / Network (EXTERNAL)             |
|  Keychain (safeStorage), git binary, SSH agent,   |
|  GitHub/GitLab APIs, AI provider APIs             |
+---------------------------------------------------+
```

**Why four zones, not two?** Many Electron applications treat the renderer as semi-trusted, exposing `nodeIntegration` or broad `ipcRenderer` access through the preload layer. GitSwitch explicitly rejects this pattern. The renderer is fully sandboxed, the preload bridge is intentionally minimal, and the main process validates every input before acting on it. This defense-in-depth approach means that compromising one layer does not grant access to the next.

## Threat Categories

### T1: Renderer Compromise

**Risk:** XSS or malicious content embedded in a diff, commit message, or pull-request body executes code within the renderer process. In a poorly configured Electron app, this could escalate to full filesystem and shell access.

**Impact:** If the renderer were not sandboxed, an attacker could read SSH keys, exfiltrate tokens, or execute arbitrary commands on the user's machine. With GitSwitch's mitigations, impact is confined to UI-level manipulation.

**Mitigations:**

| Control | Implementation | Rationale |
|---------|---------------|-----------|
| Process sandbox | `sandbox: true` on all `BrowserWindow` instances | Prevents renderer from accessing Node.js APIs even if code execution is achieved |
| Context isolation | `contextIsolation: true` | Ensures renderer JavaScript cannot tamper with preload globals or prototype chains |
| Node integration disabled | `nodeIntegration: false` | Blocks `require()` and direct Node.js module access from renderer code |
| Content Security Policy | `script-src 'self'`, `frame-ancestors 'none'` in production | Blocks inline scripts, eval, and framing attacks |
| Navigation lockdown | `will-navigate` blocked for non-app origins | Prevents renderer from navigating to attacker-controlled pages |
| Window control | `setWindowOpenHandler` denies all new windows; trusted URLs opened externally only | Prevents popup-based phishing or redirect chains |
| No direct privilege | Renderer has no filesystem, shell, Git, or network access | Limits blast radius to UI-only impact |

### T2: IPC Abuse

**Risk:** A compromised renderer crafts malicious IPC payloads to exploit the main process -- path traversal to access files outside approved repositories, injection of malformed parameters, or bypassing access controls.

**Impact:** Without IPC validation, a compromised renderer could read or modify arbitrary files, execute Git commands against unauthorized repositories, or extract decrypted secrets from the main process.

**Mitigations:**

| Control | Implementation | Rationale |
|---------|---------------|-----------|
| Type validation | `assertString`, `assertNumber`, `assertBoolean` on every IPC parameter | Rejects type confusion attacks before any logic runs |
| Key whitelisting | `assertKeys` validates allowed keys per handler; rejects `__proto__`, `constructor`, `prototype` | Blocks prototype pollution and unexpected parameter injection |
| Path normalization | `realpath()` resolution with `..` traversal detection | Prevents directory escape via symbolic links or relative paths |
| Branch validation | Names checked against Git naming rules, control characters, `..`, spaces, shell metacharacters | Prevents injection via crafted branch names |
| Access approval | User dialog required before first operation on any repository path | Ensures the user explicitly authorizes which directories GitSwitch may access |
| Channel whitelisting | IPC channel keys explicitly enumerated per handler | Prevents discovery or invocation of unintended IPC endpoints |

### T3: Command Injection via Git

**Risk:** Untrusted branch names, file paths, or remote URLs are interpolated into shell commands, allowing an attacker to execute arbitrary commands on the host system.

**Impact:** Full host compromise -- arbitrary code execution with the privileges of the GitSwitch process.

**Mitigations:**

| Control | Implementation | Rationale |
|---------|---------------|-----------|
| Library escaping | `simple-git` handles argument escaping for standard operations | Reduces surface area for manual escaping errors |
| Spawn without shell | `pushWithIdentity` uses `spawn()` with argument array, not `exec()` | Eliminates shell interpolation entirely for SSH push operations |
| SSH path validation | `GIT_SSH_COMMAND` temp key paths validated against `[a-zA-Z0-9/_.\-]` | Prevents injection through crafted temporary file paths |
| Remote URL validation | Only `git@`, `https://`, `ssh://` prefixes accepted | Blocks `file://`, `ext::`, and other dangerous Git URL schemes |
| Branch name sanitization | Control characters, `..`, spaces, and shell metacharacters rejected | Prevents injection through branch name parameters |

### T4: Secret Leakage

**Risk:** SSH private keys, API tokens, or credentials are exposed to the renderer, written to logs, persisted in plaintext on disk, or leaked through error messages.

**Impact:** Credential theft enabling unauthorized repository access, API abuse, or lateral movement across the user's Git hosting accounts.

**Mitigations:**

| Control | Implementation | Rationale |
|---------|---------------|-----------|
| Encryption at rest | Private keys encrypted with `safeStorage` (OS keychain); stored as `~/.gitswitch/keys/*.enc` | Leverages OS-level key protection rather than application-level encryption |
| Renderer isolation | Only boolean presence flags (`hasAiKey`, `hasGitHubToken`) cross IPC | Decrypted secrets never enter the untrusted renderer process |
| Memory hygiene | Key variables zeroed immediately after temp file creation | Minimizes window for memory-based extraction |
| Temp file controls | `0600` permissions, `finally`-block cleanup, `process.on('exit')` fallback | Restricts access and ensures cleanup even on abnormal termination |
| Error redaction | Commit hashes and user home paths stripped from error messages | Prevents information leakage through error propagation |
| AI content redaction | Diff content optionally redacted (emails, URLs, AWS keys, tokens) before AI transmission | Prevents inadvertent secret leakage to third-party AI providers |
| Audit trail | All key access, save, and delete operations logged | Provides forensic visibility into credential lifecycle |

### T5: Temp File Persistence

**Risk:** SSH key material written to temporary files lingers on disk after a crash, abnormal termination, or power loss, creating a window for extraction by other processes or users.

**Impact:** Plaintext SSH private key recovery from the filesystem, enabling unauthorized access to Git hosting accounts.

**Mitigations:**

| Control | Implementation | Rationale |
|---------|---------------|-----------|
| Active tracking | `activeTempKeys` Set maintains references to all live temp files | Enables comprehensive cleanup without relying on filesystem scanning |
| Structured cleanup | `cleanupTempKey()` removes both file and parent directory | Eliminates the temp directory as well, leaving no artifacts |
| Exit handler | `process.on('exit')` performs synchronous cleanup as last resort | Catches termination scenarios that bypass normal `finally` blocks |
| Temp directory isolation | Files created in OS temp directory with unique prefix | Avoids collision with other applications and simplifies identification |
| Path validation | Temp path length validated; shell-safe characters enforced | Prevents path manipulation during cleanup operations |

### T6: External URL Phishing

**Risk:** An attacker crafts content (e.g., in a commit message or PR description) that tricks the renderer into opening a malicious URL disguised as a legitimate GitHub or GitLab page, potentially capturing credentials via a lookalike login form.

**Impact:** Credential phishing -- user may enter GitHub/GitLab credentials on an attacker-controlled site.

**Mitigations:**

| Control | Implementation | Rationale |
|---------|---------------|-----------|
| Hostname allowlist | `isAllowedExternalUrl()` validates against explicit trusted hostnames | Only pre-approved domains (github.com, gitlab.com, and related) are permitted |
| HTTPS enforcement | Only `https://` protocol accepted for external URLs | Blocks `http://`, `javascript:`, `data:`, and other dangerous schemes |
| Subdomain boundary | `endsWith` with dot prefix check (`.github.com`, not just `github.com`) | Prevents `evil-github.com` from matching the allowlist |
| Navigation lockdown | `will-navigate` blocks renderer navigation to non-app origins | Prevents silent redirects to phishing pages |
| Popup blocking | `setWindowOpenHandler` denies all new windows | Eliminates popup-based phishing vectors |

### T7: AI Provider Data Exfiltration

**Risk:** Sensitive source code, credentials embedded in diffs, or proprietary logic is sent to external AI provider APIs (Gemini, OpenAI, Anthropic) without the user's informed consent or awareness.

**Impact:** Intellectual property leakage, credential exposure to third-party services, potential compliance violations (GDPR, corporate data policies).

**Mitigations:**

| Control | Implementation | Rationale |
|---------|---------------|-----------|
| Consent gate | `aiCloudConsented` setting enforced at orchestration layer before any network call | No data leaves the device without explicit user opt-in -- enforced server-side, not just in UI |
| Content redaction | `aiRedactionEnabled` applies regex-based redaction (emails, URLs, AWS keys, token patterns) | Strips common secret patterns before API transmission |
| Diff truncation | Configurable KB and line-count limits on data sent to AI providers | Bounds data exposure and controls API costs |
| Hallucination detection | Responses referencing files not in the provided diff are blocked | Prevents misleading commit messages derived from model confabulation |
| Rate limiting | 15 requests per minute cap | Prevents runaway API calls from abuse or UI bugs |
| Local-first option | Local LLM path keeps all data on-device | Provides a zero-exfiltration alternative for sensitive codebases |
| SSRF protection | Local LLM endpoint validated against blocked hosts and protocol requirements | Prevents local LLM URL from being weaponized (see [T9](#t9-ssrf-via-local-llm-url)) |

### T8: Denial of Service

**Risk:** Large repositories, rapid filesystem changes, excessive IPC calls, or oversized diffs degrade application performance to the point of unresponsiveness, potentially causing data loss if operations are interrupted.

**Impact:** Application hang or crash, degraded user experience, potential loss of in-progress work.

**Mitigations:**

| Control | Implementation | Rationale |
|---------|---------------|-----------|
| Watcher debouncing | 500 ms debounce with error backoff (5 errors triggers 30 s pause) | Coalesces rapid events and prevents tight error loops |
| Watcher depth limit | Maximum directory depth of 4 levels | Prevents recursive traversal of deep dependency trees |
| Watcher count cap | Maximum 50 concurrent watchers with LRU eviction | Bounds file descriptor and memory usage |
| File list cap | Renderer file list limited to 200 items | Prevents UI freeze on repositories with thousands of changed files |
| Diff input limit | `parseDiff` capped at 256 KB | Protects diff parser from pathological inputs |
| Git status limit | 1,000 files per IPC response | Prevents oversized status payloads from blocking the event loop |
| Pre-flight size check | `--shortstat` query before loading full diff content | Avoids loading multi-megabyte diffs into memory |
| IPC payload limit | Hard cap of 512 KB for diff payloads | Prevents IPC serialization from blocking the main process |
| UI truncation | Diff display capped at 50 files | Keeps the renderer responsive even with large changesets |
| Fetch interval | 30-second auto-fetch cycle (not continuous polling) | Balances freshness with resource consumption |

### T9: SSRF via Local LLM URL

**Risk:** The user-configurable `aiLocalUrl` setting could be pointed at internal services, cloud metadata endpoints (e.g., `169.254.169.254` for AWS/GCP instance metadata), or other sensitive network resources, turning GitSwitch into an SSRF proxy.

**Impact:** Internal service enumeration, cloud credential theft via metadata APIs, or unintended data exfiltration to attacker-controlled endpoints.

**Mitigations:**

| Control | Implementation | Rationale |
|---------|---------------|-----------|
| Blocked hosts | `169.254.169.254`, `metadata.google.internal` explicitly denied | Prevents access to cloud provider metadata endpoints |
| Protocol enforcement | HTTPS required for non-localhost URLs | Blocks plaintext HTTP to remote hosts, reducing MITM risk |
| URL parsing | URL is parsed and validated before any request is issued | Prevents URL manipulation techniques (e.g., `http://localhost@evil.com`) |

### T10: Prototype Pollution via IPC

**Risk:** An attacker sends IPC payloads containing `__proto__`, `constructor`, or `prototype` keys, potentially modifying the Object prototype chain in the main process and corrupting application state or bypassing security checks.

**Impact:** Security control bypass, unexpected behavior in settings processing, potential escalation if polluted prototype properties affect authorization logic.

**Mitigations:**

| Control | Implementation | Rationale |
|---------|---------------|-----------|
| Key rejection | `assertKeys()` explicitly blocks `__proto__`, `constructor`, `prototype` keys before processing | Eliminates the pollution vector at the earliest possible point in the IPC pipeline |

## Risk Summary Matrix

| Threat | Severity | Likelihood | Residual Risk | Primary Control |
|--------|----------|------------|---------------|-----------------|
| T1: Renderer Compromise | High | Medium | Low | Process sandbox + CSP |
| T2: IPC Abuse | High | Medium | Low | Type validation + path normalization |
| T3: Command Injection | Critical | Low | Low | Spawn without shell + input sanitization |
| T4: Secret Leakage | Critical | Medium | Low | safeStorage + renderer isolation |
| T5: Temp File Persistence | Medium | Low | Low | Active tracking + exit handlers |
| T6: URL Phishing | Medium | Medium | Low | Hostname allowlist + HTTPS enforcement |
| T7: AI Data Exfiltration | High | Medium | Low | Consent gate + content redaction |
| T8: Denial of Service | Medium | Medium | Low | Multi-layer resource caps |
| T9: SSRF via Local LLM | Medium | Low | Low | Blocked hosts + protocol enforcement |
| T10: Prototype Pollution | Medium | Low | Very Low | Key rejection at IPC boundary |

## Known Limitations

These items represent accepted risks or constraints that users and contributors should be aware of.

- **Keychain dependency:** `safeStorage` requires a functional OS keychain. If the keychain is unavailable, GitSwitch fails gracefully rather than falling back to plaintext storage. This is intentional -- silent degradation to plaintext would undermine the entire secret management model.
- **Hosting scope:** Self-hosted GitHub Enterprise and GitLab instances are not currently supported. Domain validation is scoped to `github.com` and `gitlab.com`. Expanding this requires a configurable trusted-domain list.
- **macOS notarization:** macOS builds require Apple Developer credentials at build time for notarization. Without notarization, macOS Gatekeeper will block installation.
- **Update distribution:** The auto-updater depends on GitHub Releases for update delivery. Users behind corporate proxies that block GitHub may not receive automatic updates.
- **Offline AI quality:** The offline commit generator uses heuristic pattern matching rather than semantic analysis. It produces reasonable messages for common change patterns but lacks the nuance of cloud AI providers.
- **Rate limiting scope:** Request rate limits are process-local and reset on application restart. A determined attacker with renderer access could restart the app to reset limits, though this would also trigger exit cleanup handlers.

## Revision History

This threat model should be reviewed and updated whenever new IPC channels are added, new external integrations are introduced, or the trust boundary architecture changes.

## Reporting

Report security vulnerabilities privately via the process described in [SECURITY.md](SECURITY.md). Do not open public issues for suspected vulnerabilities.
