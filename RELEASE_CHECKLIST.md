# Release Checklist

This checklist governs every GitSwitch release. It covers code quality, build integrity, functional verification, security validation, privacy compliance, and platform-specific packaging. No release ships until every applicable item is confirmed.

---

## Code Quality

- [ ] `npm run lint` passes with zero errors or warnings
- [ ] `npm run typecheck` passes under strict mode
- [ ] `npm test` passes (all test suites)
- [ ] `npm run test:coverage` meets or exceeds threshold minimums (12/8/8/12 for statements/branches/functions/lines)
- [ ] `npm audit --audit-level=high` reports no high or critical vulnerabilities

## Build Verification

- [ ] `npm run build` produces a clean production build with no warnings
- [ ] `npm run build:mac` / `build:win` / `build:linux` packages successfully (at least one target platform)
- [ ] Packaged application launches and displays the main window
- [ ] Preload bridge resolves correctly in the packaged build (IPC channels functional)

## Functional Smoke Tests

These tests verify that core workflows operate correctly in the packaged application.

### Repository Management
- [ ] Add a repository via the folder picker dialog
- [ ] Repository approval dialog appears for new, untrusted paths
- [ ] Git status loads and displays changed/staged files accurately
- [ ] Diff view renders correctly for both staged and unstaged modes

### Branching and Commits
- [ ] Branch list loads; checkout and create branch work
- [ ] Commit with title and body succeeds and appears in the log

### Remote Operations
- [ ] Push/pull/fetch with SSH key identity completes successfully
- [ ] Pull request creation form submits via GitHub integration (requires token)

### AI Commit Generation
- [ ] AI commit generation works in offline/local mode at minimum
- [ ] Cloud AI generation works when consent is granted and a valid API key is configured

### Settings and Identity
- [ ] Settings persist across application restart
- [ ] SSH account add/rename/delete works
- [ ] API key save/clear works for AI, GitHub, and GitLab tokens

### Navigation and Shortcuts
- [ ] Command palette opens (Cmd/Ctrl+K) and executes actions
- [ ] Keyboard shortcuts work (Cmd+O, Cmd+1, Cmd+2, Cmd+R)

## Error Handling and Edge Cases

- [ ] Application handles missing Git binary gracefully (clear error message, no crash)
- [ ] Application handles corrupt or non-Git folder selection
- [ ] Application handles revoked or expired API tokens without crashing
- [ ] Application handles network-offline scenarios (operations degrade gracefully)
- [ ] Application handles large repositories (>1,000 files) without freezing the UI
- [ ] Diff size limits trigger warning messages correctly
- [ ] Error boundary catches and displays renderer crashes
- [ ] File watcher error backoff engages after consecutive failures

## Security Validation

- [ ] Entitlements files in `resources/` are correct and complete
- [ ] Content Security Policy headers include all required domains and no overly permissive directives
- [ ] No secrets, keys, or tokens are visible in console logs during normal operation
- [ ] Temporary SSH key files are cleaned up after push/pull/fetch operations
- [ ] External URL navigation is restricted to trusted GitHub and GitLab hosts
- [ ] IPC payload validation rejects malformed or unexpected input
- [ ] Cloud AI consent gate blocks transmission when consent is not granted

## Privacy and Compliance

- [ ] [PRIVACY.md](PRIVACY.md) is up to date with current data practices
- [ ] Cloud AI consent toggle works in Settings > Integrations
- [ ] Cloud AI generation is blocked when consent is not given
- [ ] Data export downloads valid JSON via Settings > Advanced
- [ ] Delete All Data clears all keys, tokens, settings, and audit log entries
- [ ] Audit log records key access, AI requests, push, pull, and PR operations
- [ ] No telemetry, analytics, or background data collection is present

## Documentation

- [ ] CHANGELOG.md updated with release scope and notable changes
- [ ] README.md reflects the current feature set
- [ ] [ARCHITECTURE.md](ARCHITECTURE.md) matches the actual code structure
- [ ] Version number bumped in `package.json` if applicable

## Auto-Update

- [ ] `electron-builder.yml` has correct publish configuration (`provider: github`)
- [ ] Auto-update check runs on startup (production builds only)
- [ ] Update banner appears when a new version is downloaded
- [ ] "Restart Now" button triggers `quitAndInstall()` cleanly

## Platform-Specific

### macOS
- [ ] App sandbox entitlements in `resources/` are correct
- [ ] Consider enabling notarization for distribution (`notarize: true` in `electron-builder.yml`)
- [ ] DMG artifact name follows project naming convention

### Windows
- [ ] NSIS installer creates desktop shortcut
- [ ] Executable name is lowercase (`gitswitch`)

### Linux
- [ ] AppImage and `.deb` targets build successfully
- [ ] Desktop entry category is set to `Development`

---

## Sign-Off

| Role | Name | Date | Status |
| --- | --- | --- | --- |
| Release engineer | | | |

<!-- GAPS:
- Consider adding a "Rollback Plan" section describing how to revert a bad release (GitHub Release deletion, auto-update behavior for users who already updated).
- Consider adding a "Performance Benchmarks" section with baseline metrics for startup time, large-repo loading, and diff rendering.
- Consider adding a "Signing and Notarization" section with step-by-step instructions for macOS code signing and Windows Authenticode signing.
- Consider integrating this checklist into a GitHub Actions workflow or issue template for automated tracking.
-->
