# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please do NOT open a public issue.

1.  **Email**: Send details to `security@example.com` (Replace with actual if available).
2.  **Encryption**: Please use our PGP key if available.
3.  **Response**: We will acknowledge your report within 48 hours.

## Security Best Practices

*   **Secure Storage**: API keys and tokens (Gemini, GitHub, GitLab) are encrypted at rest using the OS keychain (`safeStorage`) and never exposed to the renderer process.
*   **Memory Hygiene**: Sensitive credentials are scrubbed from memory immediately after use.
*   **Network Security**: All Git operations enforce strict timeouts to prevent denial-of-service via hanging connections.
*   **Input Validation**: All IPC handlers and Git commands are strictly typed and sanitized to prevent injection attacks.
*   **Content Security Policy**: A strict CSP is enforced in production builds.
