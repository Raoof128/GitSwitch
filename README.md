# GitSwitch

GitSwitch is a desktop Git client for developers who work across multiple repositories and identities. It combines a sandboxed Electron shell, a React renderer, secure secret storage, repository-aware diff tooling, and AI-assisted commit generation for Gemini or local models.

## Highlights

- Sandboxed Electron architecture with `contextIsolation`, disabled `nodeIntegration`, and IPC-only privileged operations.
- Multi-account SSH workflow with encrypted private-key storage via Electron `safeStorage`.
- Staged and unstaged diff views with large-diff guards to keep the renderer responsive.
- AI-assisted commit generation with offline, local, and cloud modes.
- GitHub and GitLab pull-request support with secure token handling.
- Cross-platform packaging through `electron-builder`.
- Automatic updates via GitHub Releases.
- Structured audit logging for enterprise compliance.
- GDPR-compliant data export and deletion.

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- Git 2.40 or newer
- macOS, Windows, or Linux

## Quick Start

```bash
git clone https://github.com/Raoof128/GitSwitch.git
cd GitSwitch
npm install
npm run dev
```

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
```

## Packaging

```bash
npm run dist
```

Platform-specific packaging commands are also available:

```bash
npm run build:mac
npm run build:win
npm run build:linux
```

## Core Workflows

1. Add a repository from the sidebar or with `Cmd/Ctrl+O`.
2. Configure a default SSH identity in Settings if you work across multiple accounts.
3. Review unstaged or staged diffs before generating or writing a commit message.
4. Push, pull, and open a pull request from the main workspace once tokens are configured.

Detailed walkthroughs live in [docs/usage-examples.md](docs/usage-examples.md).

## Documentation

- [Architecture overview](ARCHITECTURE.md)
- [Threat model](THREAT_MODEL.md)
- [Release checklist](RELEASE_CHECKLIST.md)
- [Preload and IPC API reference](docs/api-reference.md)
- [Usage examples](docs/usage-examples.md)
- [Troubleshooting guide](docs/troubleshooting.md)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Privacy policy](PRIVACY.md)
- [Code of conduct](CODE_OF_CONDUCT.md)

## Repository Layout

```text
.
├── .devcontainer/          # Reproducible contributor environment
├── .github/                # CI, security, ownership, and automation config
├── docs/                   # API reference, workflow examples, troubleshooting
├── resources/              # Icons and packaging assets
├── src/
│   ├── main/               # Main-process IPC, git, AI, security, and watchers
│   ├── preload/            # Typed context bridge for the renderer
│   ├── renderer/           # React application and UI tests
│   └── index.ts            # Shared application types
├── electron-builder.yml    # Packaging and release metadata
├── electron.vite.config.ts # Electron/Vite build configuration
└── vitest.config.ts        # Test runner and coverage configuration
```

## Security Notes

- Secrets are stored only in the main process and encrypted with `safeStorage`.
- Repository access is gated through explicit approval and validated IPC handlers.
- External links are restricted to trusted GitHub and GitLab HTTPS hosts.
- Cloud AI features require explicit consent. See [PRIVACY.md](PRIVACY.md).
- Structured audit logging records security-relevant events for enterprise compliance.
- SSRF protections validate local LLM endpoint URLs before any network call.
- Prototype pollution is blocked on all IPC input via `assertKeys` validation.
- Graceful shutdown guards ensure secrets and temp files are cleaned up on quit.

Report vulnerabilities privately via [SECURITY.md](SECURITY.md).
