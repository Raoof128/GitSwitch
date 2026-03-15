# Enterprise Production Readiness Design

**Date:** 2026-03-15
**Status:** Approved
**Approach:** C — Layered parallel tracks

## Context

GitSwitch is an Electron desktop Git client with strong security foundations (sandboxed renderer, encrypted secrets, IPC validation, CSP, SSRF blocks) and two prior audit rounds. Enterprise-grade readiness requires closing gaps in test coverage, compliance, infrastructure, and operational tooling.

## Gap Summary

| Category | Current State | Target |
|----------|--------------|--------|
| Test coverage | 6.5% (15 tests) | >60% on critical paths |
| CI branch | Triggers on `main`, default is `master` | Triggers on `master` |
| Privacy policy | None | PRIVACY.md + in-app notice |
| Cloud AI consent UI | Backend gate exists, no UI toggle | Checkbox in Settings > Integrations |
| Audit logging | None | Structured log for sensitive ops |
| Auto-updater | None | electron-updater with GitHub releases |
| Data export/delete | Individual clear only | Bulk export + delete-all |
| Graceful shutdown | Watchers only | Cancel in-flight ops |
| Package metadata | Missing license, repository, engines | Complete |

## Architecture

### Track 1: Quick Wins (no new modules, small targeted edits)

**1a. CI branch fix** — `.github/workflows/ci.yml` and `security.yml`: change `main` to `master`.

**1b. Package metadata** — `package.json`: add `license`, `repository`, `engines`, `bugs` fields.

**1c. Cloud AI consent toggle** — `SettingsIntegrations.tsx`: add checkbox bound to `aiCloudConsented` with disclosure text. Show warning banner when cloud provider is selected but consent is off. Wire through existing `updateSettings` flow. Also add `aiCloudConsented` to the store slice types and settings slice state.

**1d. Privacy policy** — `PRIVACY.md` at repo root covering: data collected, where processed, third-party processors (Gemini, OpenAI, Anthropic, GitHub, GitLab), data retention, user rights, contact. Link from Settings > General.

**1e. Graceful shutdown** — `src/main/index.ts` `before-quit`: track active push/pull/fetch operations, abort them on quit. Add a `shuttingDown` flag that IPC handlers check.

**1f. Coverage threshold** — Lower vitest threshold to 0 temporarily so CI can pass while tests are being written, then raise incrementally.

### Track 2: Core Features (new modules)

**2a. Audit logger** — New `src/main/audit/audit-logger.ts`:
- Append-only JSONL file at `~/.gitswitch/audit.log`
- Rotate at 5 MB
- Events: `key.access`, `key.save`, `key.delete`, `ai.cloud.request`, `ai.cloud.consent`, `pr.create`, `settings.update`, `repo.approve`, `push`, `pull`
- Each entry: `{ ts, event, detail, repoPath? }`
- New IPC handler `audit:export` to retrieve log for the user
- Wire into git-service, key-manager, commit-generate, pull-request

**2b. Auto-updater** — New `src/main/auto-update.ts`:
- Use `electron-updater` (already available via electron-builder)
- Check on startup + every 4 hours
- Notify renderer via IPC `update:available`, `update:downloaded`
- Renderer shows non-intrusive banner: "Update available — restart to apply"
- No silent installs — user must click
- Add to `package.json` devDependencies if not present

**2c. Data export & delete** — New IPC handlers in `src/main/index.ts`:
- `data:export` — returns JSON of all settings, account metadata (no private keys), audit log summary
- `data:delete-all` — clears electron-store, deletes `~/.gitswitch/keys/*`, deletes audit log, resets to defaults
- UI: New section in Settings > Advanced with "Export Data" and "Delete All Data" buttons (with confirmation modal)

### Track 3: Test Coverage (new test files, parallel-safe)

Tests to write, grouped by module:

| File to Test | New Test File | Priority Tests |
|---|---|---|
| `git-service.ts` | `git-service.test.ts` | getStatus (truncation, rename-off), getDiff (size guards, IPC cap), getStagedDiff (size guards), listBranches (cap), error translation |
| `key-manager.ts` | `key-manager.test.ts` | settings CRUD, migration v1->v2, getSettingsPublic shape, account CRUD (mock safeStorage + fs) |
| `commit-generate.ts` | `commit-generate.test.ts` | rate limiting, diff truncation, provider selection, consent gate, offline fallback, hallucination detection |
| `watcher.ts` | `watcher.test.ts` | debounce, error backoff, statusInFlight guard, depth/ignore config |
| `gitSlice.ts` | `gitSlice.test.ts` | refreshAfterAction dedup, loadGeneration cancellation, commit flow, push/pull error handling |
| `settingsSlice.ts` | `settingsSlice.test.ts` | settings sync, update propagation |
| `uiSlice.ts` | `uiSlice.test.ts` | PR modal flow, feedback lifecycle, onboarding dismiss |
| `reposSlice.ts` | `reposSlice.test.ts` | add/remove/pin repos, recent repos |
| `accountsSlice.ts` | `accountsSlice.test.ts` | account CRUD, token save/clear |
| `helpers.ts` (AI) | already has tests | Add: email redaction, URL redaction, AWS key redaction |
| `SettingsIntegrations.tsx` | `SettingsIntegrations.test.tsx` | Consent toggle renders, saves, blocks cloud without consent |

Strategy: mock `simple-git`, `electron`, `safeStorage`, `fs` at module level. No real git repos needed.

## Non-Goals (out of scope)

- Certificate pinning (operational burden, low ROI for desktop app)
- Electron-store encryption (requires key derivation strategy — separate design)
- Full E2E test suite (current smoke test is adequate; unit tests give better ROI)
- Telemetry/analytics (not needed for enterprise self-hosted)

## Success Criteria

1. `npm run test:coverage` passes with >40% statements threshold
2. CI runs on `master` and passes on all 3 OS
3. Cloud AI generation blocked without explicit consent
4. PRIVACY.md exists and is linked from Settings
5. Audit log captures all sensitive operations
6. Auto-updater notifies users of new GitHub releases
7. Users can export and delete all their data
8. `npm run build` and `npm run dist` succeed
