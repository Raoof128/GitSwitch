# GitSwitch

**A security-first Electron desktop Git client for developers managing multiple repositories and identities.**

Most Git GUIs treat security as an afterthought -- tokens stored in plaintext, renderer processes with full Node.js access, no input validation on IPC channels. GitSwitch was built from the ground up to prove that a desktop Git client can be both powerful and hardened. Every architectural decision, from the sandboxed renderer to the encrypted keychain integration, reflects a privacy-by-design philosophy that treats the renderer as untrusted code and keeps secrets where they belong: in the main process, encrypted at rest.

GitSwitch combines multi-account SSH management, repository-aware diff tooling, multi-provider AI commit generation, and GitHub/GitLab PR workflows into a single cross-platform application -- with structured audit logging and GDPR compliance built in from day one.

---

## Why GitSwitch Exists

Developers who contribute to multiple organizations -- personal projects, open-source work, client repositories -- constantly juggle SSH keys, API tokens, and Git identities. Existing tools either ignore this workflow or handle credentials insecurely. GitSwitch solves three problems simultaneously:

1. **Identity management across repositories.** Switch between SSH keys and Git identities without manual config file editing.
2. **Secure credential lifecycle.** SSH private keys and API tokens are encrypted via the OS keychain (`safeStorage`), never exposed to the renderer, and cleaned up on quit.
3. **AI-assisted commit generation with data sovereignty.** Choose between offline heuristics, local LLM endpoints, or cloud providers (Gemini, OpenAI, Anthropic) -- with explicit consent gates, diff redaction, and no telemetry.

---

## Key Features

### Security-First Architecture
- Sandboxed Electron renderer with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`
- All privileged operations (filesystem, git, network, secrets) isolated to the main process behind validated IPC handlers
- Strict Content Security Policy with `frame-ancestors 'none'` and hardened external link allowlist
- Prototype pollution blocked on all IPC input via `assertKeys` validation
- SSRF protections validate local LLM endpoint URLs before any network call

### Encrypted Secret Management
- SSH private keys and API tokens encrypted at rest using Electron `safeStorage` (OS keychain)
- Renderer receives only boolean presence flags (`hasAiKey`, `hasGitHubToken`) -- never raw secrets
- Temporary SSH key files created with `0600` permissions, zeroed from memory immediately, and removed in `finally` blocks
- Graceful shutdown guards ensure secrets and temp files are cleaned up even on crash

### Multi-Provider AI Commit Generation
- Four provider backends: Google Gemini, OpenAI, Anthropic, and local LLM endpoints
- Offline heuristic mode for fully air-gapped environments
- Diff content optionally redacted (emails, URLs, AWS keys, token patterns) before cloud transmission
- Cloud AI requires explicit user consent before any data leaves the device
- AI hallucination detection blocks responses referencing files not present in the diff
- Rate-limited to 15 requests per minute with configurable diff size limits

### Repository and Diff Tooling
- Staged and unstaged diff views with large-diff guards (256 KB parse cap, 512 KB IPC hard limit)
- File watcher with 500 ms debounce, depth-limited to 4 levels, capped at 50 active watchers with LRU eviction
- Git status limited to 1,000 files per response; UI truncates at 50 files for renderer performance

### GitHub and GitLab Integration
- Pull request and merge request creation with secure token handling
- External links restricted to trusted GitHub and GitLab HTTPS hosts via allowlist validation

### Compliance and Audit
- Structured JSONL audit logging for security-relevant events (key access, commits, pushes, AI requests)
- Automatic log rotation at 5 MB to bound disk usage
- GDPR-compliant data export, deletion, and consent management
- Australian Privacy Principles (APP) compliance
- Zero telemetry -- no analytics, no crash reporters, no background data collection

### Cross-Platform Distribution
- macOS, Windows, and Linux packaging via `electron-builder`
- Automatic updates through `electron-updater` and GitHub Releases
- macOS notarization and code signing support

---

## Technical Highlights

This section captures the engineering decisions behind GitSwitch -- the kind of depth that distinguishes a portfolio project from a tutorial app.

### Electron Security Model

Electron's default configuration is notoriously insecure: `nodeIntegration` enabled, no sandbox, no context isolation. GitSwitch inverts every default. The renderer is treated as untrusted UI -- it cannot touch the filesystem, spawn processes, or access decrypted secrets. Every operation flows through a typed preload bridge (`contextBridge`) into validated IPC handlers in the main process. This is the same trust boundary model recommended by the Electron security documentation, implemented end to end.

### IPC Input Validation

Every IPC handler validates its payload before dispatch. `assertString`, `assertNumber`, `assertBoolean`, and `assertKeys` guard against type confusion and prototype pollution. Repository paths are normalized via `realpath()` with `..` traversal blocked. Branch names are validated against git naming rules to prevent shell metacharacter injection. Repository access requires an explicit user approval dialog before the first operation on any new path.

### Secret Lifecycle

The secret management layer was designed around the principle that private key material should exist in memory for the shortest possible duration. Keys are decrypted from `safeStorage`, written to a temporary file with `0600` permissions for the git operation, and immediately deleted in a `finally` block. A process-level exit handler provides a second cleanup pass. The renderer never sees key material -- it receives only boolean flags indicating whether credentials are configured.

### AI Provider Abstraction

The AI subsystem uses a provider pattern that abstracts Gemini, OpenAI, Anthropic, and local LLM endpoints behind a common interface. Adding a new provider requires implementing a single function. Diff content passes through a redaction pipeline before cloud transmission, and a consent gate blocks all cloud AI calls until the user explicitly opts in. This architecture demonstrates how to integrate third-party AI services without compromising user privacy.

### State Management

The renderer uses Zustand with five domain-specific slices (`accountsSlice`, `gitSlice`, `reposSlice`, `settingsSlice`, `uiSlice`) to maintain separation of concerns. Default settings are defined in the main process and mirrored during renderer hydration to avoid stale startup values.

### Testing Strategy

The test suite includes 57 unit tests across 10 test files, covering security helpers, git operations, AI generation, audit logging, URL policy enforcement, file watchers, and store logic. E2E tests are configured with Playwright. Coverage reporting uses Vitest with V8 instrumentation.

---

## Architecture Preview

```
Renderer (React 19 + Zustand 5)          -- untrusted, sandboxed
    |
    | window.api (typed contextBridge)
    v
Preload Bridge                            -- narrow, typed IPC surface
    |
    | validated IPC channels
    v
Main Process (Electron 39 + TypeScript)   -- trusted, privileged
    |
    +-- Git Services (simple-git)         -- status, diff, commit, push, pull
    +-- Secret Storage (safeStorage)      -- encrypted keys and tokens
    +-- AI Orchestration                  -- 4 providers + offline mode
    +-- Repo Watchers (chokidar)          -- debounced filesystem events
    +-- Audit Logger                      -- structured JSONL event log
    +-- Auto-Updater (electron-updater)   -- GitHub Releases integration
```

Full architecture documentation: [ARCHITECTURE.md](ARCHITECTURE.md)
Threat model with 10 identified threat categories and mitigations: [THREAT_MODEL.md](THREAT_MODEL.md)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Shell | Electron 39 |
| Renderer | React 19, TypeScript 5.9, Tailwind CSS 3 |
| State | Zustand 5 (5 domain slices) |
| Git | simple-git, chokidar |
| AI | Gemini, OpenAI, Anthropic, local LLM |
| Build | Vite 7, electron-vite, electron-builder |
| Test | Vitest 4, Testing Library, Playwright |
| Security | safeStorage, contextIsolation, IPC validation |

---

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- Git 2.40 or newer
- macOS, Windows, or Linux

### Quick Start

```bash
git clone https://github.com/Raoof128/GitSwitch.git
cd GitSwitch
npm install
npm run dev
```

### Verification

```bash
npm run lint          # ESLint
npm run typecheck     # TypeScript (node + web configs)
npm test              # 57 unit tests via Vitest
npm run test:coverage # Coverage report (V8)
npm run build         # Production build
```

### Packaging

```bash
npm run dist          # Full build + platform package
npm run build:mac     # macOS
npm run build:win     # Windows
npm run build:linux   # Linux
```

---

## Core Workflows

1. **Add a repository** from the sidebar or with `Cmd/Ctrl+O`.
2. **Configure an SSH identity** in Settings to manage multiple accounts.
3. **Review diffs** -- staged and unstaged -- before generating or writing a commit message.
4. **Push, pull, and create a pull request** from the main workspace once tokens are configured.

Detailed walkthroughs: [docs/usage-examples.md](docs/usage-examples.md)

---

## Repository Layout

```text
.
├── .github/                # CI workflows, CODEOWNERS, PR template
├── docs/                   # API reference, usage examples, troubleshooting
├── e2e/                    # Playwright end-to-end tests
├── resources/              # Icons and packaging assets
├── src/
│   ├── main/               # Main-process: IPC handlers, git services, AI providers,
│   │                       #   secret management, audit logging, watchers, auto-updater
│   ├── preload/            # Typed contextBridge for the renderer
│   ├── renderer/           # React application: 18 components, 5 Zustand slices, UI tests
│   └── index.ts            # Shared application types
├── electron-builder.yml    # Packaging and release configuration
├── electron.vite.config.ts # Electron + Vite build configuration
├── playwright.config.ts    # E2E test configuration
└── vitest.config.ts        # Unit test and coverage configuration
```

---

## Security Model

GitSwitch's security posture is documented in detail across [THREAT_MODEL.md](THREAT_MODEL.md) and [SECURITY.md](SECURITY.md). The key controls:

- **Process isolation.** Secrets never cross the IPC boundary. The renderer receives only presence flags.
- **Encryption at rest.** All keys and tokens encrypted via `safeStorage` (OS keychain integration).
- **Input validation.** Every IPC handler validates type, shape, and content. Prototype pollution, path traversal, and shell injection are blocked at the boundary.
- **Network hardening.** SSRF protections on local LLM URLs. External links restricted to trusted HTTPS hosts. CSP blocks framing attacks.
- **Data minimisation.** Cloud AI receives only the relevant diff, optionally redacted. No telemetry. No crash reporters.
- **Audit trail.** Structured JSONL logging of security-relevant events for enterprise compliance review.
- **Graceful degradation.** If `safeStorage` is unavailable, the application fails gracefully rather than falling back to plaintext storage.

Report vulnerabilities privately via [SECURITY.md](SECURITY.md).

---

## Documentation

| Document | Description |
|---|---|
| [Architecture Overview](ARCHITECTURE.md) | System diagram, runtime boundaries, key subsystems |
| [Threat Model](THREAT_MODEL.md) | 10 threat categories with mitigations and known limitations |
| [API Reference](docs/api-reference.md) | Preload bridge and IPC channel documentation |
| [Usage Examples](docs/usage-examples.md) | Step-by-step workflow walkthroughs |
| [Troubleshooting](docs/troubleshooting.md) | Common issues and diagnostic steps |
| [Release Checklist](RELEASE_CHECKLIST.md) | Pre-release verification process |
| [Contributing](CONTRIBUTING.md) | Development setup, conventions, and PR process |
| [Security Policy](SECURITY.md) | Vulnerability reporting and response targets |
| [Privacy Policy](PRIVACY.md) | Data handling, GDPR compliance, zero telemetry |
| [Code of Conduct](CODE_OF_CONDUCT.md) | Community standards |

---

## Project Metrics

| Metric | Value |
|---|---|
| Source lines (TypeScript) | ~10,500 |
| React components | 18 |
| Zustand state slices | 5 |
| AI providers | 4 + offline mode |
| Unit tests | 57 |
| Test files | 10 |
| Threat categories modeled | 10 |

---

## License

[MIT](LICENSE)

---

**Built by [Raouf](https://github.com/Raoof128)** -- security-first desktop tooling for the multi-identity developer workflow.
