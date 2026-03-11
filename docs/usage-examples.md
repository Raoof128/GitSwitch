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
