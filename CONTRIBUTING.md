# Contributing to GitSwitch

GitSwitch is maintained as a production desktop application. Treat every change as if it could ship to end users.

## Prerequisites

- Node.js 20+
- npm 10+
- Git 2.40+
- A workstation with an available system keychain if you are testing secret storage

## Local Setup

```bash
git clone https://github.com/Raoof128/GitSwitch.git
cd GitSwitch
npm install
npm run dev
```

## Development Standards

- Keep privileged operations in the main process. Do not move filesystem, shell, git, or secret work into the renderer.
- Preserve the Electron security model: sandboxed renderer, context isolation, no Node integration.
- Add or update tests with every non-trivial change.
- Update documentation when behavior, workflows, or configuration changes.
- Do not commit secrets, personal keys, or generated build artifacts.

## Branch and Commit Guidance

- Use focused branches such as `feat/<topic>` or `fix/<topic>`.
- Follow conventional commits with a scoped subject, for example `fix(git): harden remote validation`.
- Keep commit messages imperative and concise.

## Verification Before Opening a PR

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
```

## Pull Requests

Every pull request should include:

- A concise description of the change
- Notes about user-facing behavior or security impact
- Linked issues if applicable
- Updated tests and docs where relevant

## Security-Sensitive Changes

Changes involving IPC, secret storage, authentication, packaging, external URLs, or git execution should include:

- Threat or abuse-case consideration
- Negative-path tests where possible
- A note in the PR description explaining the risk and mitigation

## Reporting Bugs and Feature Requests

- Use GitHub Issues for bugs, UX issues, and feature requests.
- Use private email reporting for vulnerabilities as described in [SECURITY.md](SECURITY.md).
