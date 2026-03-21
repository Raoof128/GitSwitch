# Usage Examples

This guide walks through the core workflows in GitSwitch, with brief notes on what happens in the security architecture behind each interaction. Every user action in the renderer triggers a validated IPC call to the main process, where all filesystem, git, network, and secret operations execute in isolation.

---

## Add a Repository

1. Launch GitSwitch.
2. Use the sidebar action or press `Cmd/Ctrl+O` to open the directory picker.
3. Select a local Git repository.
4. Approve the repository access prompt when it appears.

**Under the hood:** The renderer calls `selectFolder()`, which invokes Electron's native `dialog.showOpenDialog` in the main process. The selected path is normalized via `realpath()` to resolve symlinks and reject `..` traversal. Before any git operations are permitted, the main process presents an explicit approval dialog, and the decision is logged to the structured audit log (`repo.approve`). The file watcher starts only after approval, debouncing filesystem events at 500 ms and limiting directory depth to 4 levels to prevent resource exhaustion from deeply nested repositories.

---

## Configure a Default SSH Account

1. Open **Settings > Accounts**.
2. Enter a descriptive account name and paste your SSH private key.
3. Save the account.
4. Set the saved account as the default identity.

Once configured, push, pull, and background fetch operations use the default account automatically, even across application restarts.

**Under the hood:** The renderer calls `saveSecret()` with the SSH key material. The main process encrypts the private key using Electron's `safeStorage` (backed by the OS keychain: macOS Keychain, Windows Credential Manager, or Linux Secret Service) and writes it to `~/.gitswitch/keys/<uuid>.enc` with `0600` permissions. The renderer receives only the account metadata (ID, name, email) and a boolean `hasAiKey` / `hasGitHubToken` presence flag. The decrypted key never crosses the IPC boundary. Every save and delete operation is recorded in the audit log (`key.save`, `key.delete`).

---

## Generate a Commit Message

1. Stage the files you want included in the commit (or leave them unstaged for a full working-tree diff).
2. Open **Settings > Integrations** and configure your preferred AI provider:
   - **Offline** for pattern-based heuristic generation (no network, no data leaves the machine)
   - **Local LLM** for a self-hosted model endpoint (e.g., Ollama at `localhost:11434`)
   - **Cloud** for Gemini, OpenAI, or Anthropic models with an API key
3. Return to the main workspace and trigger commit generation.

**Under the hood:** The renderer calls `generateCommitMessage(repoPath)`. The main process executes a multi-stage pipeline entirely server-side:

1. **Context collection** -- the staged diff is loaded via `simple-git`, checked against `--shortstat` to avoid loading oversized diffs, and truncated to configurable limits (default: 80 KB / 400 lines).
2. **Secret redaction** -- if `aiRedactionEnabled` is true (default), regex patterns strip SSH/PEM keys, GitHub/GitLab/OpenAI/AWS tokens, email addresses, and inline URLs from the diff before any further processing.
3. **Consent enforcement** -- cloud providers require `aiCloudConsented` to be true; otherwise the request is rejected with a clear error message.
4. **Rate limiting** -- requests are capped at 15 per minute (process-local) to prevent API abuse.
5. **Provider dispatch** -- the request is routed to the selected provider. API keys are loaded from `safeStorage`, used for the single request, and wiped from memory immediately after.
6. **Hallucination detection** -- the AI response is validated to ensure it does not reference file paths absent from the actual diff, blocking fabricated content.

The renderer receives only the final `{ title, body }` commit message. It never sees the raw diff sent to providers, the API key, or intermediate responses.

---

## Save Hosting Tokens

1. Open **Settings > Integrations**.
2. Enter your GitHub personal access token (for pull-request creation) or GitLab access token (for merge-request flows).
3. Save the token.

**Under the hood:** Tokens follow the same encrypted storage path as SSH keys. The renderer calls `saveSecret()`, the main process encrypts the token via `safeStorage`, and the renderer receives only a boolean `hasGitHubToken` or `hasGitLabToken` flag in response. The decrypted token is loaded from the keychain only when the user initiates a PR/MR creation, used for that single API call, and wiped from memory afterward. The operation is recorded in the audit log (`key.save`).

---

## Create a Pull Request

1. Push the active branch to the remote.
2. Click the **PR** button in the header toolbar.
3. Review the pre-populated title, body, base branch, and head branch.
4. Submit the request and follow the returned URL to view it on GitHub or GitLab.

**Under the hood:** The renderer calls `createPullRequest(repoPath, options)`. The main process loads the hosting token from `safeStorage`, constructs the API request to the GitHub or GitLab REST API, and submits it. The returned URL is validated against the external URL allowlist (HTTPS only, `github.com` or `gitlab.com` hostnames) before being passed back to the renderer. The PR creation event is recorded in the audit log (`pr.create`). When the user clicks the URL, `openExternal` performs a second allowlist check before invoking the system browser.

---

## Large Diff Workflow

If a diff exceeds the configured size limits, GitSwitch displays a guard message instead of rendering the content.

1. Review which files contribute the most to the diff size.
2. Stage a smaller subset of files, or split changes into smaller commits.
3. If the full diff is genuinely needed, increase the limits in **Settings > Advanced** (`diffLimitKb` and `diffLimitLines`).

**Under the hood:** The main process checks diff size via `git diff --shortstat` before loading the full content. If the diff exceeds the IPC hard limit of 512 KB, or the configurable soft limits (default: 80 KB / 400 lines), a guard message is returned instead. This prevents oversized payloads from blocking the Electron event loop and protects the renderer from attempting to parse or display content that would degrade performance. The same truncation logic applies to diff content sent to AI providers, with an additional 5x hard ceiling that rejects diffs entirely if they are catastrophically large.

---

## Enable Cloud AI with Consent

1. Open **Settings > Integrations**.
2. Select **Cloud** as the AI provider.
3. Enter your API key and select a model (Gemini, OpenAI, or Anthropic).
4. Read the data disclosure notice and check the consent checkbox.
5. Cloud AI generation is now enabled. Uncheck the consent box at any time to immediately revoke consent and stop all cloud data transmission.

**Under the hood:** The consent state is stored as `aiCloudConsented` in `electron-store`. Every call to `generateCommitMessage` checks this flag before dispatching to a cloud provider. If consent is revoked, the request is rejected at the main process level before any data leaves the machine. Consent changes are recorded in the audit log (`ai.cloud.consent`). This design implements GDPR Art. 6(1)(a) consent and Art. 7 withdrawal of consent as first-class application behavior, not a configuration afterthought.

---

## Export Your Data

1. Open **Settings > Advanced**.
2. Click **Export Data**.
3. A JSON file is generated containing all settings, account metadata, and the audit log.

Private SSH keys and decrypted API tokens are excluded from the export.

**Under the hood:** The renderer calls `exportData()`. The main process assembles a payload from `electron-store` (settings and account metadata) and appends the raw audit log (JSONL format). The result is returned to the renderer for download. This supports GDPR right of access (Art. 15) and data portability (Art. 20). The export event itself is recorded in the audit log (`data.export`).

---

## Delete All Data

1. Open **Settings > Advanced**.
2. Click **Delete All Data**.
3. Confirm the action in the confirmation dialog.

All SSH keys, API tokens, settings, preferences, and audit logs are permanently and irreversibly removed.

**Under the hood:** The renderer calls `deleteAllData()`. The main process deletes all encrypted key files from `~/.gitswitch/keys/`, clears the `electron-store` data file, and removes the audit log from disk. This supports GDPR right to erasure (Art. 17). The deletion event is recorded as the final entry in the audit log before the log itself is removed (`data.delete`).

---

## Auto-Updates

GitSwitch checks for updates on startup and every 4 hours via `electron-updater` against GitHub Releases. When a new version is detected:

1. The update is downloaded in the background.
2. A banner appears at the top of the application window indicating the new version.
3. Click **Restart Now** to quit the application and apply the update.

**Under the hood:** The main process uses `electron-updater` to poll GitHub Releases. Update-available and update-downloaded events are forwarded to the renderer via IPC subscriptions (`onUpdateAvailable`, `onUpdateDownloaded`). The renderer displays the banner and calls `installUpdate()` when the user confirms. Auto-update only functions in production builds; development builds (`npm run dev`) skip update checks entirely.

<!-- GAPS:
- No workflow example for branch creation and checkout, despite `gitCreateBranch` and `gitCheckoutBranch` being prominent API methods.
- No workflow example for discarding changes or hard reset, which are destructive operations that would benefit from a clear "what happens" explanation.
- No workflow example for configuring `strictHostKeyChecking` and its security implications.
- No workflow example for viewing or interpreting the audit log after export (what the JSONL entries look like, what events are tracked).
- No workflow example for configuring diff redaction settings or verifying that redaction is working before enabling cloud AI.
- No workflow example for the cybersecurity AI persona (`aiPersona: 'cybersecurity'`) and how it changes commit message generation.
- The local LLM setup could include specifics on supported endpoints (Ollama compatibility, expected API format).
- No workflow for removing a single repository (vs. `deleteAllData`), though `gitUnwatchRepo` exists in the API.
-->
