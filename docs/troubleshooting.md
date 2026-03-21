# Troubleshooting

This guide covers common issues encountered when using GitSwitch, organized by symptom. Each section explains the root cause in the context of GitSwitch's security architecture and provides targeted resolution steps.

---

## Secure Storage Is Unavailable

**Symptoms:**
- Saving an API key, SSH key, or hosting token fails.
- Token or account presence status does not update after saving.
- An error referencing "secure storage," "keychain," or "credential manager" appears in Settings.

**Root cause:** GitSwitch encrypts all secrets using Electron's `safeStorage` API, which delegates to the operating system keychain (macOS Keychain, Windows Credential Manager, or Linux Secret Service via `libsecret`). If the keychain is locked, inaccessible, or the desktop session was started without a graphical login (e.g., SSH-only sessions), `safeStorage` cannot encrypt or decrypt, and all secret operations fail. GitSwitch does not fall back to plaintext storage under any circumstances -- this is a deliberate security decision.

**Resolution:**
1. Ensure the system keychain or credential manager is unlocked. On macOS, open **Keychain Access** and verify the login keychain is unlocked. On Linux, confirm that `gnome-keyring` or `kwallet` is running.
2. Log out and log back in to the desktop session normally (not via SSH).
3. Check the exact error message surfaced in **Settings**. The `SecretsResult.error` field contains a specific message from the OS keychain layer.
4. On Linux, ensure `libsecret` development packages are installed if running from source.

---

## Repository Access Denied

**Symptoms:**
- A repository path appears valid but GitSwitch refuses to perform git operations on it.
- Git commands (status, diff, commit, push) return permission or access errors.

**Root cause:** GitSwitch requires explicit user approval before operating on any repository path. This is a security gate: the main process normalizes the path via `realpath()`, rejects paths containing `..` traversal sequences, and presents an approval dialog. If the approval was never granted, was revoked via `gitUnwatchRepo`, or the path has changed (e.g., the repository was moved on disk), the access record is invalid.

**Resolution:**
1. Remove the repository from the sidebar and re-add it through the standard flow (**Cmd/Ctrl+O** or the sidebar action). Approve the access prompt when it appears.
2. Verify that the folder contains a valid `.git` directory. GitSwitch validates this before granting access.
3. Avoid symlinked paths that resolve outside the intended directory. Path normalization uses `realpath()`, so the resolved absolute path must match the approved path.
4. If the repository was moved or renamed on disk, remove and re-add it.

---

## Push, Pull, or Fetch Fails

**Symptoms:**
- The Push, Pull, or Fetch buttons fail silently or return an error.
- Remote status in the sidebar stops updating.
- Error messages reference SSH authentication, host key verification, or remote connectivity.

**Root cause:** These operations require a valid SSH identity. GitSwitch decrypts the private key from `safeStorage`, writes it to a temporary file with `0600` permissions, injects the path via `GIT_SSH_COMMAND`, executes the git command, and deletes the temporary file in a `finally` block. Failures occur when no account is configured, the SSH key is not authorized with the remote host, the remote URL is invalid, or `strictHostKeyChecking` rejects an unknown host.

**Resolution:**
1. Verify that either a selected account or a default account is configured in **Settings > Accounts**. If no identity is available, push/pull/fetch cannot authenticate.
2. Confirm the SSH key is authorized with the remote host. For GitHub, check **Settings > SSH and GPG keys** in your GitHub account. For GitLab, check **Preferences > SSH Keys**.
3. Check the remote URL in the repository settings. Only `git@`, `https://`, and `ssh://` URL formats are accepted.
4. If you receive a host key verification error, the remote host's key may not be in your `known_hosts` file. Either add the host key manually (`ssh-keyscan github.com >> ~/.ssh/known_hosts`) or temporarily disable strict checking in **Settings > Advanced** (not recommended for production use).
5. Ensure the remote is reachable from your network (firewalls, VPNs, proxy configurations).

---

## Diff Is Too Large

**Symptoms:**
- The diff view displays a guard message (e.g., "Diff too large") instead of the actual content.
- AI commit generation returns a truncated or empty context warning.

**Root cause:** GitSwitch enforces diff size limits at multiple levels to protect application stability. The main process checks `git diff --shortstat` before loading full content. If the diff exceeds the configurable soft limits (default: 80 KB / 400 lines), it is truncated. If it exceeds the IPC hard limit of 512 KB, it is blocked entirely. For AI context, diffs exceeding 5x the configured line limit are rejected outright to prevent sending catastrophically large payloads to AI providers.

**Resolution:**
1. Stage a smaller subset of files to reduce the diff size, then review or generate commits incrementally.
2. Split very large changes into smaller, focused commits.
3. If the full diff is genuinely needed, increase the soft limits in **Settings > Advanced** by adjusting `diffLimitKb` and `diffLimitLines`. The IPC hard limit of 512 KB cannot be changed.
4. For AI generation specifically, consider whether the full diff is necessary for a meaningful commit message, or whether a subset of staged files provides sufficient context.

---

## Cloud AI Generation Blocked

**Symptoms:**
- AI commit generation returns the message "Cloud AI consent required."
- The AI provider is set to Cloud but generation does not produce results.

**Root cause:** GitSwitch implements a consent gate for cloud AI providers as a privacy-by-design control. The `aiCloudConsented` setting must be explicitly set to `true` before any diff data is transmitted to Gemini, OpenAI, or Anthropic APIs. This is not a bug -- it is an intentional GDPR Art. 6(1)(a) consent mechanism that prevents accidental data exfiltration.

**Resolution:**
1. Open **Settings > Integrations**.
2. In the Cloud LLM section, read the data disclosure notice and check the consent checkbox.
3. Ensure a valid API key is saved (the `hasAiKey` presence flag should show as active).
4. Ensure a model is selected (e.g., `gemini-3-flash`, `gpt-4o`, `claude-sonnet-4-20250514`).
5. To revoke consent at any time, uncheck the consent box. This immediately prevents all future cloud AI requests.

---

## AI Rate Limit Exceeded

**Symptoms:**
- AI commit generation returns the message "Rate limit exceeded."
- Rapid successive generation attempts are rejected.

**Root cause:** GitSwitch enforces a process-local rate limit of 15 AI generation requests per 60-second window. This protects against runaway API costs and accidental abuse. The rate limit resets when the application is restarted.

**Resolution:**
1. Wait approximately one minute before retrying.
2. If you need rapid iteration on commit messages, consider switching to offline or local LLM mode, which are not subject to the cloud rate limit.

---

## AI Hallucination Detected

**Symptoms:**
- AI commit generation returns the message "AI Hallucination Detected."
- The generated commit message is blocked despite the AI provider responding successfully.

**Root cause:** GitSwitch validates AI-generated commit messages against the actual files in the diff. If the AI response references file paths that do not exist in the staged or working-tree changes, the response is rejected as a hallucination. This prevents fabricated file references from entering your commit history.

**Resolution:**
1. Retry generation. Non-deterministic AI outputs may produce a valid result on the next attempt.
2. If the issue persists, check whether the staged diff provides sufficient context for the AI model. Very small or ambiguous diffs may cause models to infer file paths that do not exist.
3. Consider using a different model or switching to offline mode for straightforward commits.

---

## Packaging Failures

**Symptoms:**
- `npm run dist` or platform-specific packaging commands fail.
- Errors reference missing assets, native module compilation, or signing failures.

**Root cause:** Electron packaging via `electron-builder` requires that the application builds cleanly (lint, typecheck, and bundling), that native dependencies are compiled for the target platform, and that platform-specific assets (icons, entitlements) exist in the expected locations.

**Resolution:**
1. Run `npm run build` first to verify that linting, typechecking, and bundling all pass independently.
2. Run `npm install` to ensure native dependencies are rebuilt for your current platform and Node.js version.
3. On macOS, verify that packaging assets exist under `resources/` (icons, entitlements files). macOS notarization requires valid Apple Developer credentials configured in the build environment.
4. On Windows, ensure that the Windows SDK is installed if code signing is configured.
5. Check `electron-builder.yml` for configuration errors, particularly in the `publish`, `mac`, `win`, and `linux` sections.

---

## Coverage Command Fails

**Symptoms:**
- `npm run test:coverage` reports a missing coverage provider.
- Coverage reports are not generated after a test run.

**Root cause:** GitSwitch uses Vitest with `@vitest/coverage-v8` for code coverage instrumentation. If the coverage provider package is missing from `node_modules` (e.g., after a partial install or a lockfile change), Vitest cannot instrument the source code.

**Resolution:**
1. Run `npm install` to restore all dependencies, including dev dependencies.
2. Confirm that `@vitest/coverage-v8` is listed in `devDependencies` in `package.json`.
3. If the issue persists after reinstalling, delete `node_modules` and `package-lock.json`, then run `npm install` for a clean dependency resolution.

---

## Auto-Update Not Working

**Symptoms:**
- No update banner appears after a new release is published.
- The application does not prompt to restart for an update.

**Root cause:** Auto-update via `electron-updater` only functions in production builds packaged with `electron-builder`. Development builds (`npm run dev`) skip update checks entirely because there is no packaged application to replace. Additionally, the updater polls GitHub Releases, so the release must be properly published with the expected asset names.

**Resolution:**
1. Confirm you are running a production build (packaged `.dmg`, `.exe`, or `.AppImage`), not a development build.
2. Verify that a newer version exists on the GitHub Releases page for the repository.
3. Check that `electron-builder.yml` has a valid `publish` configuration pointing to the correct GitHub repository.
4. Allow up to 4 hours for the background check to detect the new release, or restart the application to trigger an immediate check.
5. Check network connectivity and firewall rules -- the updater needs HTTPS access to `github.com` and the GitHub Releases CDN.

---

## File Watcher Stopped Updating

**Symptoms:**
- Changed files do not appear in the sidebar after saving.
- The repository status appears stale or frozen.

**Root cause:** GitSwitch uses `chokidar` for filesystem watching with several protective limits. The watcher debounces events at 500 ms, limits directory depth to 4 levels, and maintains an expanded ignore list (skipping `node_modules`, `.git`, build artifacts, and other high-churn paths). If the watcher encounters 5 consecutive errors, it enters a 30-second backoff period during which no status updates are emitted. This prevents cascading failures from corrupted repositories, permission errors, or filesystem instability from overwhelming the application.

**Resolution:**
1. Wait 30 seconds for the automatic backoff to expire. The watcher resets its error count and attempts recovery automatically.
2. Check the developer console (**View > Toggle Developer Tools**) for watcher error messages that indicate the underlying cause (permission denied, path not found, etc.).
3. Remove the repository from the sidebar and re-add it. This destroys the existing watcher and creates a fresh one with a clean error state.
4. If the repository has an unusually deep directory structure (beyond 4 levels of nesting), files in deeply nested directories will not trigger watcher events by design. This is a resource-protection measure.
5. Verify that the total number of watched repositories has not exceeded 50. GitSwitch caps the watcher pool at 50 with LRU eviction, so the least-recently-used repository watcher may have been stopped.

<!-- GAPS:
- No troubleshooting entry for SSRF validation errors when configuring a local LLM URL (e.g., blocked metadata endpoints like 169.254.169.254).
- No troubleshooting entry for SSH key format issues (e.g., unsupported key types, passphrase-protected keys).
- No troubleshooting entry for GitHub/GitLab token scope issues (e.g., token missing `repo` scope for PR creation).
- No troubleshooting entry for pull-request creation failures (API errors, branch not pushed, base branch mismatch).
- No troubleshooting entry for audit log rotation or disk space issues related to the 5 MB rotation threshold.
- No troubleshooting entry for settings migration issues when upgrading between schema versions.
- No troubleshooting entry for the "strict host key checking" setting and its interaction with unknown remote hosts.
- No troubleshooting entry for the `openExternal` URL allowlist rejecting a legitimate URL (e.g., self-hosted GitHub Enterprise or GitLab instances, which are not currently supported).
- No troubleshooting entry for reduced-motion accessibility settings or theme-related display issues.
-->
