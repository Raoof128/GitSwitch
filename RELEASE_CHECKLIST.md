# Release Checklist

Use this checklist before every GitSwitch release.

## Code Quality

- [ ] `npm run lint` passes with no errors
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (all test suites)
- [ ] `npm run test:coverage` meets threshold minimums
- [ ] `npm audit --audit-level=high` reports no high/critical vulnerabilities

## Build Verification

- [ ] `npm run build` produces a clean production build
- [ ] `npm run build:mac` / `build:win` / `build:linux` packages successfully (at least one platform)
- [ ] Packaged app launches and displays the main window
- [ ] Preload bridge resolves correctly in packaged build

## Functional Smoke Tests

- [ ] Add a repository via folder picker dialog
- [ ] Repository approval dialog appears for new paths
- [ ] Git status loads and displays changed/staged files
- [ ] Diff view renders for both staged and unstaged modes
- [ ] Branch list loads; checkout and create branch work
- [ ] Commit with title and body succeeds
- [ ] Push/pull/fetch with SSH key identity completes
- [ ] AI commit generation works (offline mode at minimum)
- [ ] Settings persist across app restart
- [ ] SSH account add/rename/delete works
- [ ] API key save/clear works for AI, GitHub, and GitLab tokens
- [ ] Pull request creation form submits (requires token)
- [ ] Command palette opens (Cmd/Ctrl+K) and executes actions
- [ ] Keyboard shortcuts work (Cmd+O, Cmd+1, Cmd+2, Cmd+R)

## Error and Edge Cases

- [ ] App handles missing git binary gracefully
- [ ] App handles corrupt or non-git folder selection
- [ ] App handles revoked/expired API tokens
- [ ] App handles network-offline scenarios
- [ ] App handles large repositories (>1000 files) without freezing
- [ ] Diff size limits trigger warning messages correctly
- [ ] Error boundary catches and displays renderer crashes
- [ ] Watcher error backoff engages after consecutive failures

## Security

- [ ] Entitlements files are consistent between `build/` and `resources/`
- [ ] CSP headers include all required domains
- [ ] No secrets visible in console logs during normal operation
- [ ] Temp SSH key files are cleaned up after push/pull/fetch
- [ ] External URLs restricted to trusted GitHub/GitLab hosts

## Documentation

- [ ] CHANGELOG.md updated with release scope
- [ ] README.md reflects current feature set
- [ ] ARCHITECTURE.md matches actual code structure
- [ ] Version number bumped in package.json if applicable

## Platform-Specific

### macOS
- [ ] App sandbox entitlements are correct
- [ ] Consider enabling notarization for distribution (`notarize: true` in electron-builder.yml)
- [ ] DMG artifact name follows convention

### Windows
- [ ] NSIS installer creates desktop shortcut
- [ ] Executable name is lowercase (`gitswitch`)

### Linux
- [ ] AppImage and .deb targets build
- [ ] Category set to Development
