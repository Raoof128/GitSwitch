# Troubleshooting

## Secure Storage Is Unavailable

Symptoms:

- Saving an API key or SSH key fails
- Token/account status does not update
- You receive a secure-storage or keychain error

Actions:

- Unlock the system keychain or credential manager
- Retry after logging into the desktop session normally
- Check the exact error surfaced in Settings

## Repository Access Denied

Symptoms:

- A repo path appears valid but GitSwitch refuses to operate on it

Actions:

- Re-add the repository through the app and approve the access prompt
- Make sure the folder contains a `.git` directory
- Avoid symlinked or malformed paths that resolve outside the intended repository

## Push/Pull/Fetch Does Not Work

Symptoms:

- Sync buttons fail
- Remote status stops updating

Actions:

- Verify that either a selected account or a default account is configured
- Confirm the SSH key is valid and authorized with GitHub or GitLab
- Check the remote URL in the repository settings

## Diff Is Too Large

Symptoms:

- Diff view shows a guard message instead of content

Actions:

- Stage or review a smaller subset of files
- Increase diff limits in **Settings → Advanced**
- Split very large changes into smaller commits

## Packaging Failures

Symptoms:

- `npm run dist` or platform packaging fails

Actions:

- Run `npm run build` first to verify lint, typecheck, and bundle health
- Ensure native dependencies rebuilt successfully during `npm install`
- On macOS, verify packaging assets exist under `resources/`

## Coverage Command Fails

Symptoms:

- `npm run test:coverage` reports a missing provider

Actions:

- Reinstall dependencies with `npm install`
- Confirm `@vitest/coverage-v8` exists in `devDependencies`
