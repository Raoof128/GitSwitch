# Changelog

All notable changes to GitSwitch are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Documentation

- **README claims checked against the code (2026-11-17).** Key material was described as "zeroed from memory"; a JavaScript string cannot be wiped, and the code only drops the reference. "SSRF protections" is now described as what it is: a scheme check, a three-host metadata blocklist and an HTTPS rule for non-local hosts. "GDPR-compliant" and "APP compliance" are labelled as the author's mapping, not a legal assessment. Auto-update, signing and notarization are described as configured and never exercised, since no release has been published. A status line and a Known gaps section were added, including the 52 `npm audit` advisories (27 high, 4 critical) behind the failing weekly `security` workflow. `SECURITY.md` offers GitHub private vulnerability reporting and no longer promises response times.

### Added

- **AI-powered commit generation** with multi-provider support (Google Gemini, OpenAI, Anthropic) and local model fallback via configurable endpoint
- **Hybrid AI pipeline** with 3-stage response parsing (strict JSON, sanitized re-parse, regex extraction), hallucination detection, and file-reference validation to prevent fabricated paths in commit messages
- **Cloud AI consent gate** requiring explicit user opt-in before any data leaves the device, with data disclosure warning in Settings
- **Audit logging system** writing JSONL to `~/.gitswitch/audit.log` with 5 MB rotation, covering key access, AI requests, push, pull, and PR creation events; exportable via IPC
- **Auto-updater** using `electron-updater` with startup and 4-hour interval checks, non-intrusive banner notification, and user-initiated restart
- **Pull and dynamic reconciliation** with background fetch loop, ahead/behind status tracking, and auto-push option after commit
- **Branch management** with create, switch, delete, and merge operations accessible from the command palette
- **Command palette** (Cmd/Ctrl+K) for quick access to branches, repos, settings, and git operations
- **First-run onboarding panel** with step-by-step guidance for new users, dismissable with actionable hints
- **Repository health dashboard** showing branch status, remote configuration, last fetch time, and sync state at a glance
- **Pull request creation** for GitHub and GitLab with provider auto-detection, token-secured API calls, and post-push status badge
- **File watcher** using Chokidar with depth limits, debouncing, LRU eviction (max 50 watchers), and error recovery with backoff
- **Diff viewer** with unified/split modes, size guards (256 KB parse cap, 512 KB IPC hard limit), and pre-flight `--shortstat` estimation
- **Settings persistence** with schema versioning, startup migration, and strict merge against defaults to prevent partial-config bugs
- **GDPR-compliant data controls** including full data export and delete-all functionality in Settings with confirmation flow
- **PRIVACY.md** documenting data handling practices (APP/GDPR compliant), linked from Settings
- **Graceful shutdown** blocking new git operations when the app is quitting to prevent data corruption
- **Playwright E2E test suite** covering window launch, activity rail navigation, tab switching, command palette, and console error assertions
- **Comprehensive documentation suite** including ARCHITECTURE.md, THREAT_MODEL.md, RELEASE_CHECKLIST.md, SECURITY.md, CONTRIBUTING.md, API reference, usage examples, and troubleshooting guide

### Changed

- **Zustand store decomposed** from a 1348-line monolith into 5 domain slices (git, settings, accounts, UI, repos) with unchanged consumer API
- **Nord-to-custom theme migration** with tokenized palette (Jungle Green, Strawberry Red, Pacific Blue, Sand Dune), Liquid Glass surface language, and consistent status/accent colors across all components
- **AI provider architecture rewritten** with `AiProvider` interface, centralized prompts, separated provider modules, and configurable timeout (default 30s)
- **Gemini models updated** to latest generation (Gemini 3 Pro/Flash, 2.5 Pro/Flash, 2.0 Flash) with organized dropdown groups and `gemini-3-flash` as default
- **Background fetch interval tuned** from 60s down to 30s with flicker-free status updates using lightweight comparison before re-render
- **Dependency upgrades** across Electron, Google GenAI SDK, Vite, Tailwind, Framer Motion, and testing libraries with zero audit vulnerabilities
- **CJS-to-ESM migration** for git-service, watcher, and key-manager modules; ESM-only dependencies bundled into Main process CJS build
- **Build scripts unified** with mandatory typecheck and lint gates before any release build
- **Polling replaced with event-driven updates** reducing aggressive 1-second intervals to 30-second reconciliation with change-aware diffing

### Fixed

- **Renderer OOM on large repos** — `getStagedDiff()` now applies the same size guards (byte limit, 512 KB IPC cap) as `getDiff()`
- **File descriptor exhaustion** — Chokidar watcher limited to depth 4 with expanded ignore list (vendor, .cache, .turbo, node_modules, .next)
- **DiffView freeze** — stopped using full diff text as React key (massive string comparison); capped `parseDiff()` input to 256 KB
- **Application freeze on large repo add** — targeted directory watching instead of global recursive watch; debounce raised to 500 ms
- **Rate-limit array memory leak** in commit-generate fixed with shift-based cleanup instead of filter+spread
- **React ErrorBoundary** added wrapping entire app for crash recovery UI
- **Request cancellation** via `loadGeneration` counter abandoning stale diff/status responses on repo switch
- **RemoteConfig setTimeout leak** fixed with useRef + useEffect cleanup
- **Git store refresh chains** deduplicated with `refreshChainInFlight` guard preventing concurrent reloads
- **Status flicker eliminated** by preserving last known ahead/behind status during transient git failures
- **`bufferutil` build error** resolved by externalizing `ws` optional peer dependencies in Rollup config
- **`ElectronStore` constructor error** fixed by bundling ESM-only dependencies into CJS build
- **Git provider lookalike domain attack** — `detectGitProvider` now rejects patterns like `github.com.evil.com`
- **Gemini SDK response drilling** — corrected `result.response.text()` call chain to match actual SDK structure

### Security

- **SSRF protection** — AI local URL validation rejects metadata endpoints and enforces HTTPS for non-localhost targets
- **Path traversal blocked** on `git:ignore` IPC handler rejecting `..` segments and absolute paths
- **Prototype pollution guard** — `assertKeys` rejects `__proto__`, `constructor`, and `prototype` properties
- **CSP hardened** with `frame-ancestors 'none'`, strict connect-src allowlist, and dev/prod policy separation
- **IPC input validation** on all 16+ handlers using `assertString`, `assertBoolean`, `assertNumber`, and `assertKeys`
- **Secrets never exposed to renderer** — API keys encrypted with `safeStorage`, wiped from memory after use, temp SSH keys use 0600 permissions with try/finally cleanup
- **External URL allowlist** restricting `shell.openExternal` to github.com and gitlab.com via main process validation
- **Navigation handler** blocking renderer-initiated navigation attacks via `will-navigate` listener
- **Gemini safety filters raised** from `BLOCK_NONE` to `BLOCK_ONLY_HIGH` for responsible AI integration
- **Git command injection prevented** — hardened push, fetch, pull, and gitignore flows against option injection and shell metacharacters
- **Commit body capped** at 5,000 characters to prevent payload abuse
- **Redaction pipeline expanded** covering AWS keys, emails, URLs, `token=` patterns, and AI response bodies stripped from logs
- **Bounds validation** enforced for `aiTimeoutSec`, `diffLimitKb`, and `diffLimitLines` settings
- **macOS entitlements unified** — removed `dyld-env-vars`, added `disable-library-validation` and `network-client` consistently; notarization enabled

### Performance

- **Large repo stability** — file list capped at 200 DOM nodes, branch list at 500 entries, status at 1,000 files with truncation indicators
- **Rename detection disabled** in `getStatus()` via `diff.renames=false` to eliminate costly computation in monorepos
- **Watcher-driven diff reloads throttled** to max once per 800 ms in renderer, preventing IPC flood
- **Watcher status calls serialized** with `statusInFlight` guard preventing concurrent git index access
- **Diff size pre-flight** using `--shortstat` to estimate cost before loading content into memory

### Documentation

- **Full documentation audit** across 12 project files reflecting current architecture, security model, and API surface
- **THREAT_MODEL.md** covering trust boundaries, 10 threat categories (including SSRF and prototype pollution) with mitigations
- **RELEASE_CHECKLIST.md** with code quality, build, smoke test, security, privacy/compliance, and platform-specific verification steps
- **API reference** documenting all IPC handlers with types, parameters, and security annotations
- **README** upgraded with security highlights, architecture overview, privacy link, and current build instructions

### Accessibility

- **WCAG contrast fixes** — muted text raised to 4.6:1, placeholder to 3.6:1, disabled controls and diff gutters all meet minimum ratios
- **Focus-visible outlines** (2px solid accent) added to all interactive elements: buttons, selects, links, and file list items
- **ARIA attributes** added to activity rail tabs, operation banner (`role="status"`, `aria-live`), and file status indicators with descriptive labels
- **Keyboard navigation** scoped for settings tabs, with platform-aware shortcut display (Cmd on Mac, Ctrl elsewhere)
- **Character counter** on commit title (72/200) with visual warning at conventional limit
- **Tooltips for git terminology** (Ahead/Behind, Working Tree) to reduce jargon barrier for new users
