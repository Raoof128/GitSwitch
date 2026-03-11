# Security Policy

## Supported Versions

Security fixes are applied to the current `main` branch and the latest published release line.

| Version | Supported |
| --- | --- |
| `main` | Yes |
| Latest release | Yes |
| Older releases | Best effort only |

## Reporting a Vulnerability

Do not open a public issue for a suspected vulnerability.

1. Email `raoof.r12@gmail.com` with the subject `GitSwitch security report`.
2. Include a clear description, affected version or commit, reproduction steps, impact, and any suggested mitigation.
3. If you have a proof of concept, share the smallest safe reproduction possible.

## Response Targets

- Initial acknowledgement within 2 business days
- Triage status within 5 business days
- Remediation plan or workaround after validation

## Disclosure Expectations

- Please allow a reasonable remediation window before public disclosure.
- Coordinate with the maintainer before publishing advisories, blog posts, or exploit details.

## Security Controls in This Repository

- Sandboxed Electron renderer with a typed preload bridge
- Main-process-only secret handling and repository operations
- `safeStorage` encryption for tokens and private keys
- IPC payload validation and repository access approval prompts
- Trusted-host validation for external links
- Diff-size limits and timeout guards around git and network operations
