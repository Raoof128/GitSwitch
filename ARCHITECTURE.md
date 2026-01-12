# Architecture & Design Overview

## High-Level Architecture

Gitswitch is built on the **Electron** framework, utilizing a standard multi-process architecture to ensure security, stability, and performance.

### 1. Main Process (`src/main`)
*   **Role:** The entry point of the application. It manages the application lifecycle, creates browser windows, and handles all privileged operations (filesystem access, Git commands, OS keychain interaction).
*   **Key Responsibilities:**
    *   **Window Management:** Creating and managing the main application window.
    *   **IPC Handling:** Listening for events and commands from the Renderer process via `ipcMain`.
    *   **Git Operations:** Executing `simple-git` commands in a controlled environment.
    *   **AI Integration:** Orchestrating requests to Gemini/OpenAI/Anthropic APIs via the `AiProvider` interface.
    *   **Security:** Managing secure storage (`safeStorage`) for API keys and tokens.
*   **Tech:** Node.js, TypeScript, Electron Main API.

### 2. Preload Scripts (`src/preload`)
*   **Role:** The security bridge between the Main and Renderer processes.
*   **Key Responsibilities:**
    *   Exposing a limited, type-safe API (`window.api`) to the Renderer using `contextBridge`.
    *   **Isolation:** Ensuring `nodeIntegration` is disabled in the Renderer.
*   **Tech:** Electron Context Bridge.

### 3. Renderer Process (`src/renderer`)
*   **Role:** The user interface. It runs in a sandboxed environment with no direct Node.js access.
*   **Key Responsibilities:**
    *   **UI/UX:** React components for the sidebar, diff viewer, settings, and commit panel.
    *   **State Management:** `Zustand` store (`useRepoStore`) manages application state (repos, status, settings).
    *   **Interactivity:** Handling user inputs and communicating with the Main process via `window.api`.
*   **Tech:** React 19, Vite, TailwindCSS, Framer Motion.

## Security Model

Security is a primary design constraint.

*   **Sandboxing:** The Renderer process is fully sandboxed (`sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`).
*   **IPC Allow-list:** The Main process strictly validates all IPC inputs using helper functions (`assertString`, `assertBoolean`, etc.). Arbitrary command execution is impossible.
*   **Secrets Management:**
    *   API keys (Gemini, GitHub, GitLab) are **never** saved to disk in plain text.
    *   They are encrypted using Electron's `safeStorage` API (backed by macOS Keychain, Windows DPAPI, or Linux Secret Service).
    *   Keys are decrypted only in memory within the Main process and wiped immediately after use.
*   **Content Security Policy (CSP):** A strict CSP is applied in production builds to prevent XSS.
*   **External Links:** All external URLs are validated against an allowlist (GitHub/GitLab) before being opened in the default browser.

## Data Flow

1.  **Action:** User clicks "Commit" in the Renderer.
2.  **Bridge:** `useRepoStore` calls `window.api.gitCommit()`.
3.  **IPC:** Electron transmits the message to the Main process.
4.  **Execution:** `ipcMain` handler receives the request, validates the repo path and input strings, and calls `git-service.ts`.
5.  **Result:** `simple-git` executes the command; the result is returned via IPC to the Renderer.
6.  **Update:** The UI updates to reflect the success/failure state.

## Directory Structure

```
/
├── .github/            # CI/CD workflows
├── build/              # Electron build assets (icons, etc.)
├── src/
│   ├── main/           # Main process code
│   │   ├── ai/         # AI providers and prompt engineering
│   │   ├── git/        # Git service and watcher logic
│   │   └── secure/     # Key management and settings
│   ├── preload/        # Context bridge scripts
│   └── renderer/       # React frontend
│       ├── components/ # UI Components
│       ├── store/      # Zustand state
│       └── assets/     # CSS and static files
└── electron.vite.config.ts # Build configuration
```
