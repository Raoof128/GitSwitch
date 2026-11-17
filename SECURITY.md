# Security Policy

GitSwitch is a security-first Electron desktop application that manages Git repositories, SSH keys, API tokens, and AI-assisted commit generation. This policy describes supported versions, vulnerability reporting procedures, and the security controls in place.

For the full architectural context, see [ARCHITECTURE.md](ARCHITECTURE.md). For a detailed threat-by-threat analysis, see [THREAT_MODEL.md](THREAT_MODEL.md).

## Supported Versions

Security fixes are applied to the current `master` branch and the latest published release. Older releases receive fixes on a best-effort basis.

| Version | Supported |
|---------|-----------|
| `master` branch | Yes -- actively maintained |
| Latest release | Yes -- patch releases for critical vulnerabilities |
| Older releases | Best effort only |

## Reporting a Vulnerability

**Do not open a public issue for a suspected vulnerability.** Public disclosure before a fix is available puts all users at risk.

### Process

1. **Report privately** through GitHub's private vulnerability reporting (the *Report a vulnerability* button on this repository's Security tab), or email `raoof.r12@gmail.com` with the subject line `GitSwitch security report`.
2. **Include** the following in your report:
   - A clear description of the vulnerability
   - Affected version, branch, or commit hash
   - Step-by-step reproduction instructions
   - Assessed impact (what an attacker could achieve)
   - Any suggested mitigation or fix, if available
3. **Proof of concept:** If you have one, provide the smallest safe reproduction possible. Avoid running exploits against production systems or other users' data.

### Response

This is a personal project maintained by one person. Reports are read and answered as time allows; there is no guaranteed response time.

### Coordinated Disclosure

- Please allow a reasonable remediation window (typically 90 days) before public disclosure.
- Coordinate with the maintainer before publishing advisories, blog posts, conference talks, or exploit details.
- Credit will be given to reporters in the changelog and release notes, unless anonymity is preferred.

## Security Architecture Summary

GitSwitch enforces a defense-in-depth security model across four trust boundaries. The controls below work in concert -- no single layer is relied upon in isolation.

### Process Isolation and Sandboxing

- **Sandboxed renderer:** `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false` on all `BrowserWindow` instances. The renderer cannot access Node.js APIs, the filesystem, or the network directly.
- **Minimal preload bridge:** The preload script (~120 lines) uses `contextBridge` to expose a typed `window.api` surface. Raw `ipcRenderer` methods are never exposed to the renderer.
- **Main-process privilege:** All filesystem, Git, network, and cryptographic operations execute exclusively in the main process.

### Input Validation and IPC Hardening

- **Type assertions:** Every IPC handler validates parameters with `assertString`, `assertNumber`, `assertBoolean`, and `assertKeys` before any logic executes.
- **Prototype pollution blocking:** `assertKeys()` explicitly rejects `__proto__`, `constructor`, and `prototype` keys in IPC payloads.
- **Path normalization:** Repository paths are resolved with `realpath()` and checked for `..` traversal to prevent directory escape.
- **Repository access approval:** A user dialog is required before GitSwitch operates on any repository path for the first time.

### Secret Management

- **Encryption at rest:** SSH private keys and API tokens are encrypted using Electron's `safeStorage` API (backed by OS keychain) and stored under `~/.gitswitch/keys/*.enc`.
- **Renderer isolation:** The renderer receives only boolean presence flags (`hasAiKey`, `hasGitHubToken`). Decrypted secrets never cross the IPC boundary.
- **Temp file lifecycle:** SSH key material is written to temporary `0600` files only for the duration of a single Git operation, then removed in `finally` blocks with `process.on('exit')` as a fallback.
- **Memory hygiene:** Key variables are zeroed immediately after temp file creation to minimize the in-memory exposure window.

### Content Security Policy

- **Production CSP:** `script-src 'self'` blocks inline scripts and eval. `frame-ancestors 'none'` prevents clickjacking via framing.
- **Navigation lockdown:** `will-navigate` is blocked for non-app origins. `setWindowOpenHandler` denies all popup windows.
- **Trusted-host validation:** External URLs are validated against an explicit hostname allowlist with HTTPS enforcement and subdomain boundary checking.

### Network Security

- **SSRF protection:** The user-configurable local LLM endpoint (`aiLocalUrl`) is validated against a blocked-hosts list (including cloud metadata endpoints) and requires HTTPS for non-localhost targets.
- **Cloud AI consent gate:** No data is transmitted to cloud AI providers (Gemini, OpenAI, Anthropic) without explicit user opt-in via the `aiCloudConsented` setting, enforced at the orchestration layer.
- **Content redaction:** When enabled, regex-based redaction strips emails, URLs, AWS access keys, and token patterns from diff content before AI API transmission.

### Resource Protection

- **Diff-size limits:** IPC payloads capped at 512 KB, `parseDiff` input capped at 256 KB, pre-flight `--shortstat` check before loading full diffs.
- **Watcher limits:** File watchers debounced at 500 ms, depth-limited to 4 levels, capped at 50 concurrent watchers with LRU eviction.
- **Commit body size limits:** Prevents oversized payloads from being sent through IPC.
- **Rate limiting:** AI requests capped at 15 per minute to prevent abuse.

### Audit and Update

- **Structured audit logging:** Security-relevant events (key operations, AI generation, push, pull, PR workflows) are recorded in JSONL format with automatic rotation at 5 MB.
- **Auto-updater:** `electron-updater` checks GitHub Releases on a 4-hour interval. macOS builds are code-signed and notarized. Updates are user-initiated, never silent.
- **Graceful shutdown:** Exit handlers ensure secrets and temporary files are cleaned up on application quit, including abnormal termination scenarios.

## Security Testing

GitSwitch includes targeted security tests as part of its test suite:

- **Input validation tests:** Verify that IPC handlers reject malformed types, prototype pollution payloads, and path traversal attempts.
- **Security helper tests:** Cover URL validation, path normalization, and branch name sanitization.
- **Test framework:** Vitest for unit tests (57 tests), Playwright for end-to-end tests.

## Further Reading

- [ARCHITECTURE.md](ARCHITECTURE.md) -- System architecture, runtime boundaries, and subsystem design
- [THREAT_MODEL.md](THREAT_MODEL.md) -- Detailed threat enumeration, risk matrix, and known limitations
- [PRIVACY.md](PRIVACY.md) -- GDPR compliance, data handling, and privacy-by-design principles
- [CONTRIBUTING.md](CONTRIBUTING.md) -- Contribution guidelines, including security-related code review expectations
