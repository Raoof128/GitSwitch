# Contributing to GitSwitch

Thank you for your interest in contributing to GitSwitch. This project is a security-first Electron desktop Git client built with React 19, TypeScript, Zustand, and Tailwind CSS. Every contribution strengthens a tool that developers rely on to manage repositories, identities, and secrets safely.

GitSwitch is maintained as a production desktop application. Treat every change as if it ships directly to end users --- because it does.

## Prerequisites

| Tool | Minimum Version | Purpose |
| --- | --- | --- |
| Node.js | 20+ | Runtime and build toolchain |
| npm | 10+ | Dependency management |
| Git | 2.40+ | Core version-control operations |
| OS keychain | macOS Keychain / Windows Credential Manager / libsecret | Required for testing secret storage |

## Local Setup

```bash
git clone https://github.com/Raoof128/GitSwitch.git
cd GitSwitch
npm install
npm run dev
```

The development server starts Electron with hot-reload enabled. Changes to main-process code require a restart; renderer changes apply automatically.

## Architecture at a Glance

GitSwitch enforces a strict process boundary between its Electron main process and the sandboxed renderer. Understanding this boundary is essential for every contribution:

- **Main process** --- Owns all privileged operations: filesystem access, shell execution, Git commands, SSH key management, and OS keychain interactions.
- **Renderer process** --- Runs in a sandboxed environment with context isolation enabled and Node integration disabled. Communicates with the main process exclusively through a typed preload bridge.
- **Preload bridge** --- The only sanctioned IPC surface. Every channel is explicitly typed and validated.

For the full architecture, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Development Standards

These standards exist to protect end users, maintain the security model, and keep the codebase healthy.

### Security Model

- **Keep privileged operations in the main process.** Never move filesystem, shell, Git, or secret work into the renderer. This is the most important architectural rule in the project.
- **Preserve Electron sandboxing.** The renderer must remain sandboxed with context isolation enabled and Node integration disabled. Do not weaken these settings.
- **Protect the AI consent gate.** Cloud AI changes must preserve the consent gate --- never bypass `aiCloudConsented`. No user data leaves the machine without explicit opt-in.
- **Audit sensitive operations.** Key access, push, pull, fetch, PR creation, and AI requests must include audit log calls. If you add a new sensitive operation, add the corresponding audit entry.

### Code Quality

- Add or update tests with every non-trivial change.
- Update documentation when behavior, workflows, or configuration changes.
- Do not commit secrets, personal keys, or generated build artifacts.

## Branch and Commit Guidance

- Use focused branches: `feat/<topic>`, `fix/<topic>`, `refactor/<topic>`, `docs/<topic>`.
- Follow [Conventional Commits](https://www.conventionalcommits.org/) with a scoped subject:
  ```
  fix(git): harden remote URL validation
  feat(ai): add Anthropic provider support
  docs(privacy): update data retention section
  ```
- Keep commit messages imperative, concise, and meaningful.

## Verification Before Opening a PR

Run the full verification suite before submitting:

```bash
npm run lint          # Code style and static analysis
npm run typecheck     # TypeScript strict-mode compilation
npm test              # Unit and integration test suites
npm run test:coverage # Coverage thresholds enforcement
npm run build         # Production build verification
```

All commands must pass cleanly. Coverage thresholds are enforced at 12/8/8/12 for statements/branches/functions/lines.

## Pull Request Guidelines

Every pull request should include:

- **A clear description** of the change and its motivation
- **User-facing impact** --- Describe any behavioral changes visible to end users
- **Security impact** --- Note whether the change touches IPC, secrets, authentication, packaging, external URLs, or Git execution
- **Linked issues** if applicable
- **Updated tests and documentation** where relevant

Use the pull request template provided in `.github/PULL_REQUEST_TEMPLATE.md`.

## Security-Sensitive Changes

Changes involving IPC channels, secret storage, authentication flows, packaging configuration, external URL handling, or Git command execution receive additional scrutiny. These changes should include:

- **Threat analysis** --- Consider how the change could be abused. What happens if input is malicious? What happens if a downstream service is compromised?
- **Negative-path tests** --- Test error cases, invalid input, and boundary conditions, not just the happy path.
- **PR description note** --- Explicitly describe the risk and the mitigation strategy in the pull request description.

For guidance on the project's existing security controls, see [SECURITY.md](SECURITY.md).

## Reporting Bugs and Feature Requests

- **Bugs, UX issues, and feature requests** --- Use [GitHub Issues](https://github.com/Raoof128/GitSwitch/issues).
- **Security vulnerabilities** --- Do **not** open a public issue. Follow the private disclosure process described in [SECURITY.md](SECURITY.md).

## Related Documentation

| Document | Purpose |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design and process boundary reference |
| [SECURITY.md](SECURITY.md) | Security controls and vulnerability reporting |
| [PRIVACY.md](PRIVACY.md) | Data handling and privacy-by-design practices |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community standards and expectations |

---

Thank you for contributing to GitSwitch. Every improvement to this project raises the bar for security-conscious developer tooling.

<!-- GAPS:
- Consider adding a CLA (Contributor License Agreement) section if external contributions grow.
- Consider adding a "First-Time Contributors" section with good-first-issue labels and onboarding guidance.
- Consider documenting the local LLM setup process for contributors testing AI features without cloud API keys.
- Consider adding a "Development Environment Troubleshooting" section for common setup issues (keychain access on CI, headless Electron testing, etc.).
-->
