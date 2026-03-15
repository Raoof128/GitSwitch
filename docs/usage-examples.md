# Usage Examples

## Add a Repository

1. Launch GitSwitch.
2. Use the sidebar action or `Cmd/Ctrl+O`.
3. Select a local Git repository.
4. Approve repository access when prompted by the main process.

## Configure a Default SSH Account

1. Open **Settings**.
2. Go to **Accounts**.
3. Save an SSH private key with a descriptive account name.
4. Set that account as the default identity.

Once configured, push, pull, and background fetch can all use the default account even after restarting the app.

## Generate a Commit Message

1. Stage files if you want to review the staged diff.
2. Open **Settings → Integrations** and configure either:
   - Offline mode
   - A local LLM endpoint
   - A Gemini cloud model and API key
3. Return to the main workspace and trigger commit generation.

## Save Hosting Tokens

Use **Settings → Integrations** to store:

- GitHub personal access tokens for pull-request creation
- GitLab access tokens for GitLab merge-request flows

Tokens are stored encrypted in the main process and never returned to the renderer.

## Create a Pull Request

1. Push the active branch.
2. Click **PR** in the header.
3. Review the default title, body, base branch, and head branch.
4. Submit the request and follow the returned URL.

## Large Diff Workflow

If the diff is too large to render safely, GitSwitch returns a guard message instead of sending an oversized payload to the renderer. Reduce the diff size or increase limits in **Settings → Advanced** when appropriate.

## Enable Cloud AI with Consent

1. Open **Settings > Integrations**.
2. Select **Cloud LLM** as the AI provider.
3. Enter your API key and select a model.
4. Read the data disclosure and check the consent box.
5. Cloud AI generation is now enabled. Uncheck to revoke consent at any time.

## Export Your Data

1. Open **Settings > Advanced**.
2. Click **Export Data**.
3. A JSON file downloads containing all settings and account metadata (no private keys).

## Delete All Data

1. Open **Settings > Advanced**.
2. Click **Delete All Data**.
3. Confirm the action. All SSH keys, API tokens, settings, and audit logs are permanently removed.

## Auto-Updates

GitSwitch checks for updates on startup and every 4 hours. When a new version is ready, a banner appears at the top of the window. Click **Restart Now** to apply.
