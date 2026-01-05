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

*   **API Keys**: Never commit API keys (Gemini, GitHub Tokens) to the repository. The application uses secure storage for sensitive data.
*   **Dependencies**: We regularly audit dependencies for vulnerabilities using `npm audit`.
*   **Input Validation**: All AI inputs and Git commands are sanitized to prevent injection attacks.
