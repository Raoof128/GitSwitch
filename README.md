# Gitswitch

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Electron](https://img.shields.io/badge/Electron-33.0-blue)
![React](https://img.shields.io/badge/React-19-blue)

**Gitswitch** is a modern, AI-powered Git client designed for developers who manage multiple accounts and repositories. Built with Electron and React, it offers a seamless experience or switching identities, managing diffs, and generating semantic commit messages using Google Gemini AI.

## 🚀 Features

*   **Multi-Account Management**: Easily switch between GitHub/GitLab accounts (Personal, Work, etc.).
*   **AI Commit Generation**: Automatically generate semantic commit titles and detailed descriptions using the latest **Gemini 3** models.
*   **Smart Diff Viewer**: View staged and unstaged changes with syntax highlighting and large-diff protection.
*   **Security Hardened**: Enforced timeouts, input sanitization, and secure OS-keychain storage for all secrets.
*   **Drag & Drop**: Add repositories by simply dragging folders.
*   **Privacy First**: API keys are redacted from logs and wiped from memory immediately after use.
*   **Dark Mode**: Sleek, modern URL-inspired interface with Cyberpunk aesthetics.

## 🛠️ Tech Stack

*   **Core**: [Electron](https://www.electronjs.org/), [TypeScript](https://www.typescriptlang.org/)
*   **Frontend**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/), [TailwindCSS](https://tailwindcss.com/)
*   **State Management**: [Zustand](https://github.com/pmndrs/zustand)
*   **AI**: [Google Generative AI SDK](https://github.com/google/google-genai)
*   **Git**: [Simple-Git](https://github.com/steveukx/git-js)

## 📦 Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/raoof/gitswitch.git
    cd gitswitch
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Start the development app**:
    ```bash
    npm run dev
    ```

## 🏗️ Building

To create a production-ready installer for your current OS:

```bash
npm run dist
```

Alternatively, build specifically for a target platform:

```bash
# macOS (.dmg)
npm run build:mac

# Windows (.exe)
npm run build:win

# Linux (.AppImage, .deb)
npm run build:linux
```

All build commands automatically run type-checking and linting to ensure production quality. Built artifacts are located in the `dist/` directory.

## 📐 Architecture & Security

For a high-level overview of the application's structure, security model, and data flow, please read our [Architecture Guide](ARCHITECTURE.md).

## 🤖 AI Configuration

1.  Get a generic API Key from [Google AI Studio](https://aistudio.google.com/).
2.  Open **Settings** in Gitswitch.
3.  Select **Cloud (Gemini)** provider.
4.  Enter your API Key.
5.  (Optional) Customize the "Persona" to adjust the tone of commit messages.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to submit Pull Requests and report issues.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
