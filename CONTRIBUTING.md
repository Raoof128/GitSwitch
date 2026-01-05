# Contributing to Gitswitch

Thank you for your interest in contributing to Gitswitch! We welcome contributions from everyone.

## Getting Started

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally:
    ```bash
    git clone https://github.com/your-username/gitswitch.git
    cd gitswitch
    ```
3.  **Install dependencies**:
    ```bash
    npm install
    ```
4.  **Create a branch** for your feature or fix:
    ```bash
    git checkout -b feature/amazing-feature
    ```

## Development Workflow

*   **Run Development Server**: `npm run dev`
*   **Type Check**: `npm run typecheck`
*   **Lint**: `npm run lint`
*   **Format**: `npm run format`

## Commit Guidelines

We use conventional commits. Please strictly follow this format:

```
type(scope): subject

body
```

*   **Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
*   **Scope**: e.g., `ui`, `git`, `ai`, `store`.
*   **Subject**: Short imperative summary (no capital, no dot).

## Pull Request Process

1.  Ensure all checks pass (`npm run typecheck`, `npm run lint`).
2.  Update documentation if applicable.
3.  Open a Pull Request against the `main` branch.
4.  Provide a clear description of changes and link related issues.

## Reporting Issues

Please use the GitHub Issue Tracker to report bugs or request features. Provide as much detail as possible, including steps to reproduce and system information.
