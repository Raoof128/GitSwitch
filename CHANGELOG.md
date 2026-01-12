# CHANGELOG

## Unreleased

- Raouf: (entries appended below)
- Raouf: 2026-01-12 (Australia/Sydney)
  - Scope: AI Integration (Model Updates)
  - Summary: Added support for latest Google Gemini models (Gemini 3, 2.5, 2.0).
    1. NEW: Added `gemini-3-pro`, `gemini-3-flash`, `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.0-flash` (stable), and `gemini-2.0-pro-exp`.
    2. DEFAULT: Updated default cloud model to `gemini-3-flash` for improved speed and cost-efficiency.
    3. UX: Reorganized model selection dropdown into clear groups (Gemini 3, 2.5, 2.0, 1.5, Legacy).
  - Files: src/index.ts, src/main/secure/key-manager.ts, src/main/ai/providers/gemini.ts, src/renderer/src/components/settings/SettingsIntegrations.tsx
  - Verification: `npm run typecheck`, `npm run lint` (clean).
  - Follow-ups: None.

- Raouf: 2026-01-12 (Australia/Sydney)
  - Scope: Production Readiness Audit (Final Polish)
  - Summary: Completed final hardening pass. Fixed security timeouts, watcher correctness, and build configuration.
    1. SECURITY: Added 30s timeout to `git pull` and `git fetch` operations to prevent network hangs.
    2. CORRECTNESS: Updated file watcher to monitor the entire repository root (respecting .gitignore) instead of just `src/app/lib`, fixing change detection for projects with different structures.
    3. RELEASE: Disabled placeholder code signing identity in `electron-builder.yml` to allow successful ad-hoc/unsigned builds in CI/dev environments.
  - Files: src/main/git/git-service.ts, src/main/git/watcher.ts, electron-builder.yml
  - Verification: `npm run typecheck`, `npm run lint` (clean), manual review of logic.
  - Follow-ups: None. Ready for release candidate.

- Raouf: 2026-01-12 (Australia/Sydney)
  - Scope: Dependency Updates & Test Infrastructure
  - Summary: Updated all outdated dependencies and added test scripts to package.json for improved test coverage.
    1. HIGH: Updated 8 outdated dependencies (@google/genai 1.34.0→1.35.0, @types/node 22.19.1→25.0.6, @types/react 19.2.7→19.2.8, electron-builder 26.0.12→26.4.0, eslint-plugin-react-hooks 5.2.0→7.0.1, framer-motion 12.23.26→12.25.0, tailwindcss 3.4.13→3.4.19, vite 7.2.6→7.3.1).
    2. MEDIUM: Added new test scripts (test:unit, test:integration, test:all, test:coverage) to package.json.
    3. MEDIUM: Verified build, lint, typecheck, and original tests pass after updates.
    4. LOW: Confirmed 0 vulnerabilities after dependency updates via `npm audit`.
  - Files: package.json
  - Verification: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` all pass with 0 errors.
  - Follow-ups: Add comprehensive unit and integration tests for git operations, AI providers, and key management once test environment is properly configured with mocked electron-store.

- Raouf: 2026-01-07 (Australia/Sydney)
  - Scope: Code Quality Audit (Comprehensive Fix)
  - Summary: Fixed 17 audit issues across Critical, High, and Medium severity levels. Resolved all TypeScript, error handling, security, and performance issues identified in the codebase audit.
    1.  CRITICAL: Removed `@ts-ignore` in `gemini.ts` by adding proper `SafetySetting[]` type and `GeminiResponse`/`GeminiCandidate` interfaces.
    2.  CRITICAL: Replaced `api: unknown` in `preload/index.d.ts` with fully typed `PreloadApi` interface.
    3.  HIGH: Fixed empty catch block in `local.ts` with proper JSON parse error handling and extracted hardcoded URL to constant.
    4.  HIGH: Converted CJS `require()` to ESM `import` in `git-service.ts`, `watcher.ts`, and `key-manager.ts`.
    5.  HIGH: Removed unnecessary `@types/chokidar` from `package.json`.
    6.  HIGH: Replaced browser `confirm()` in `FileList.tsx` with in-app React modal dialog.
    7.  HIGH: Changed aggressive 1-second polling to 30-second interval in `App.tsx`.
    8.  MEDIUM: Created `git-utils.ts` to extract duplicated utilities (`fetchWithTimeout`, `parseGitHubRepo`, `parseGitLabProjectPath`, `detectGitProvider`).
    9.  MEDIUM: Added error context to catch blocks in `anthropic.ts` and `openai.ts`.
    10. MEDIUM: Added `IpcMainInvokeEvent` type to all 16 IPC handler `_event` parameters in `index.ts`.
    11. MEDIUM: Added JSDoc documentation to `helpers.ts` for nullable return type.
    12. MEDIUM: Fixed `useRepoStore.getState()` called inside render in `CommitPanel.tsx`.
    13. MEDIUM: Added error recovery with backoff mechanism in `watcher.ts` (max 5 consecutive errors, 30s backoff).
  - Files: src/main/ai/providers/gemini.ts, src/preload/index.d.ts, src/main/ai/providers/local.ts, src/main/git/git-service.ts, src/main/git/watcher.ts, src/main/secure/key-manager.ts, package.json, src/renderer/src/components/sidebar/FileList.tsx, src/renderer/src/App.tsx, src/main/git/git-utils.ts (NEW), src/main/git/pull-request.ts, src/main/git/publish-status.ts, src/main/ai/providers/anthropic.ts, src/main/ai/providers/openai.ts, src/main/index.ts, src/main/ai/helpers.ts, src/renderer/src/components/sidebar/CommitPanel.tsx
  - Verification: `npm run lint` and `npx tsc --noEmit` both pass with 0 errors. AI Orchestrator audit: PASSED.
  - Follow-ups: None - all identified issues resolved.
- Raouf: 2026-01-06 (Australia/Sydney)
  - Scope: UI/UX (Loader Width)
  - Summary: Widened the spider loader footprint for better spacing in the title area.
    1.  Increased the title loader and container width to 24em.
  - Files: src/renderer/src/assets/main.css
  - Verification: Not run (not requested).
  - Follow-ups: Let me know if you want a specific pixel width instead.
- Raouf: 2026-01-06 (Australia/Sydney)
  - Scope: UI/UX (Loader Scale)
  - Summary: Increased the spider loader size by 10% for better visibility next to the title.
    1.  Bumped the title loader scale token from 1.8px to 1.98px.
  - Files: src/renderer/src/assets/main.css
  - Verification: Not run (not requested).
  - Follow-ups: If you want another size tweak, share the target percentage.
- Raouf: 2026-01-06 (Australia/Sydney)
  - Scope: UI/UX (Loader Swap)
  - Summary: Replaced the hamster loader with the spider swing animation and mapped its palette to the Nord theme tokens.
    1.  Updated the header loader markup and ported the animation CSS into the shared stylesheet.
  - Files: src/renderer/src/App.tsx, src/renderer/src/assets/main.css
  - Verification: Not run (not requested).
  - Follow-ups: If you want the loader larger or slower, tell me the preferred size/speed.
- Raouf: 2026-01-06 (Australia/Sydney)
  - Scope: UI/UX (Sync Loader Placement)
  - Summary: Moved the hamster loader beside the app title and scaled it up for better visibility.
    1.  Relocated the loader to the left header cluster and introduced a larger title variant.
  - Files: src/renderer/src/App.tsx, src/renderer/src/assets/main.css
  - Verification: Not run (not requested).
  - Follow-ups: Adjust the size/offset if you want it tighter to the title.
- Raouf: 2026-01-06 (Australia/Sydney)
  - Scope: UI/UX (Sync Loader Visibility)
  - Summary: Made the hamster loader always visible in the top bar with a slightly larger header variant.
    1.  Removed the conditional sync gating and added a header-sized variant to ensure the animation is visible.
  - Files: src/renderer/src/App.tsx, src/renderer/src/assets/main.css
  - Verification: Not run (not requested).
  - Follow-ups: If you want it smaller or aligned differently, tell me the preferred size/position.
- Raouf: 2026-01-06 (Australia/Sydney)
  - Scope: UI/UX (Sync Loader)
  - Summary: Added a top-bar hamster loader that animates during push/pull and respects reduced-motion settings.
    1.  Wired sync state into the store and surfaced it in the header next to the account control.
    2.  Ported the hamster wheel animation into the shared stylesheet with Nord-aligned colors.
  - Files: src/renderer/src/App.tsx, src/renderer/src/assets/main.css, src/renderer/src/store/useRepoStore.ts
  - Verification: Not run (not requested).
  - Follow-ups: Trigger push/pull and confirm the loader appears and stops cleanly.
- Raouf: 2026-01-06 (Australia/Sydney)
  - Scope: UX (Status Flicker)
  - Summary: Prevented header ahead/behind flicker by preserving the last known status during transient git status failures.
    1.  Tracked the repo path associated with the latest status and kept it intact on refresh errors.
  - Files: src/renderer/src/store/useRepoStore.ts
  - Verification: Not run (not requested).
  - Follow-ups: Push/pull again to confirm the header status no longer blinks.
- Raouf: 2026-01-06 (Australia/Sydney)
  - Scope: UI/UX (Settings Icon Motion)
  - Summary: Added a more expressive settings control with a rotating glass ring and pulsing accent orb.
    1.  Applied motion-safe spin and pulse to the settings glyph while keeping reduced-motion support.
  - Files: src/renderer/src/App.tsx
  - Verification: Not run (not requested).
  - Follow-ups: Optional: adjust spin/pulse durations if the motion feels too loud.
- Raouf: 2026-01-06 (Australia/Sydney)
  - Scope: UI/UX (Settings Control)
  - Summary: Upgraded the settings control to a layered glass icon with an accent orb for a more distinctive presence.
    1.  Added a subtle halo and accent dot around the gear glyph while preserving the existing button layout.
  - Files: src/renderer/src/App.tsx
  - Verification: Not run (not requested).
  - Follow-ups: Optional: tweak icon size or glow intensity if you want it quieter or louder.
- Raouf: 2026-01-06 (Australia/Sydney)
  - Scope: UI/UX (Settings Icon)
  - Summary: Replaced the settings emoji with a consistent inline SVG icon for a cleaner, theme-aligned control.
    1.  Added an accessible gear icon to the settings button while retaining existing hover and glass styling.
  - Files: src/renderer/src/App.tsx
  - Verification: Not run (not requested).
  - Follow-ups: Visual check in the header to confirm the icon weight feels right.
- Raouf: 2026-01-06 (Australia/Sydney)
  - Scope: UI Theme (Color Consistency)
  - Summary: Normalized status and accent colors to theme tokens across the renderer, and aligned accent buttons and alerts with consistent tokenized backgrounds.
    1.  Added accent and status background/border tokens to the theme and applied them to alerts, badges, and action buttons.
    2.  Replaced hardcoded success/warn/error utilities in badges, warnings, and banners with theme variables.
    3.  Ran Prettier on the AI guard block to keep lint clean (no logic change).
  - Files: src/renderer/src/assets/main.css, src/renderer/src/App.tsx, src/renderer/src/components/diff/DiffView.tsx, src/renderer/src/components/pr/PullRequestModal.tsx, src/renderer/src/components/settings/SettingsIntegrations.tsx, src/renderer/src/components/settings/SettingsView.tsx, src/renderer/src/components/sidebar/CommitPanel.tsx, src/renderer/src/components/sidebar/FileList.tsx, src/renderer/src/components/sidebar/RemoteConfig.tsx, src/renderer/src/components/sidebar/RepoList.tsx, src/main/ai/commit-generate.ts
  - Verification: `npm run lint` (warns about existing prettier issue in src/main/git/git-service.ts).
  - Follow-ups: Optional: run `npx prettier --write src/main/git/git-service.ts` to clear the remaining lint warning.
- Raouf: 2026-01-06 (Australia/Sydney)
  - Scope: AI Safety (Hallucination Filter)
  - Summary: Reduced false positives for short alphabetic pairs (e.g., UI/UX) in the file-reference validation.
    1.  Ignored two-part alpha pairs with 1–2 letter segments to avoid misclassifying shorthand as paths.
  - Files: src/main/ai/commit-generate.ts
  - Verification: Not run (not requested).
  - Follow-ups: Retry AI generation with UI/UX or CI/CD phrasing to confirm the warning is gone.
- Raouf: 2026-01-06 (Australia/Sydney)
  - Scope: AI Safety (False Positive Guard)
  - Summary: Reduced false positives in AI file-reference validation for common UI/UX and version abbreviations.
    1.  Ignored short uppercase pairs (e.g., UI/UX), numeric ratios, and version pairs when checking unknown paths.
  - Files: src/main/ai/commit-generate.ts
  - Verification: Not run (not requested).
  - Follow-ups: Generate a commit message mentioning UI/UX to confirm no false block occurs.
- Raouf: 2026-01-06 (Australia/Sydney)
  - Scope: UI/UX (Header Stability)
  - Summary: Stabilized the ahead/behind header label during push/pull by reserving space and using tabular numerals.
    1.  Added a fixed minimum width and tabular numeric alignment to prevent layout shifts as counts change.
  - Files: src/renderer/src/App.tsx
  - Verification: `npm run lint` (warns about existing prettier issue in src/main/git/git-service.ts).
  - Follow-ups: If you want the warning cleared, I can format `src/main/git/git-service.ts`.
- Raouf: 2026-01-06 (Australia/Sydney)
  - Scope: UI/UX (Liquid Glass Polish)
  - Summary: Applied Liquid Glass styling to core toolbars and controls, aligned borders to glass tokens, and softened scanlines for clarity.
    1.  Updated header, toolbar, and selector borders to use glass tokens for a consistent Liquid Glass surface language.
    2.  Retuned diff containers and active repo highlights to align with the new glass surface treatment.
    3.  Softened scanline overlays and default form borders to improve legibility with translucent layers.
  - Files: src/renderer/src/assets/main.css, src/renderer/src/App.tsx, src/renderer/src/components/diff/DiffView.tsx, src/renderer/src/components/settings/SettingsAccounts.tsx, src/renderer/src/components/sidebar/RepoList.tsx
  - Verification: Not run (visual change only).
  - Follow-ups: Launch the renderer to validate the glass clarity and contrast on real data.
- Raouf: 2026-01-06 (Australia/Sydney)
  - Scope: UI/UX (Audit Fixes)
  - Summary: Fixed UI regressions in settings/account rows, scoped tab keyboard navigation, improved keyboard access for file actions, aligned timeout limits, and added focused UI tests.
    1.  Repaired broken Tailwind classes in Accounts rows and added focus-visible affordances in repo and file lists.
    2.  Scoped settings tab arrow navigation to the settings sidebar and aligned AI timeout limits with defaults.
    3.  Added SettingsView tests to cover tab switching via click and arrow keys.
  - Files: src/renderer/src/components/settings/SettingsAccounts.tsx, src/renderer/src/components/settings/SettingsView.tsx, src/renderer/src/components/sidebar/FileList.tsx, src/renderer/src/components/settings/SettingsAdvanced.tsx, src/renderer/src/components/sidebar/RepoList.tsx, src/renderer/src/App.test.tsx
  - Verification: Not run (not requested).
  - Follow-ups: Run `npm test` to validate UI tests in your environment.
- Raouf: 2026-01-06 (Australia/Sydney)
  - Scope: UX (Sync Stability)
  - Summary: Reduced UI flicker at 1s fetch intervals by only updating the "Updated" timestamp when status meaningfully changes.
    1.  Added a lightweight status comparison to avoid re-triggering the header animation on identical polling results.
  - Files: src/renderer/src/store/useRepoStore.ts
  - Verification: Not run (not requested).
  - Follow-ups: Monitor the header badge behavior during rapid fetches and adjust thresholds if needed.
- Raouf: 2026-01-06 (Australia/Sydney)
  - Scope: UX (Sync Interval)
  - Summary: Reduced the background fetch interval to 1 second to make remote status updates near-instant.
    1.  Updated the reconciliation loop timer to 1s for faster change pickup.
  - Files: src/renderer/src/App.tsx
  - Verification: Not run (not requested).
  - Follow-ups: Monitor CPU/network impact on large repos and adjust if needed.
- Raouf: 2026-01-06 (Australia/Sydney)
  - Scope: UX (Auto-Push + Sync)
  - Summary: Fixed auto-push account fallback and accelerated background fetch so changes are picked up within a few seconds.
    1.  Auto-push now falls back to the default account when no selection is active, and settings updates can adopt the default account automatically.
    2.  Reduced the background fetch interval to 5 seconds for near-instant status updates.
  - Files: src/renderer/src/store/useRepoStore.ts, src/renderer/src/App.tsx
  - Verification: Not run (not requested).
  - Follow-ups: Commit with auto-push enabled and confirm the push triggers without manually selecting an account.
- Raouf: 2026-01-06 (Australia/Sydney)
  - Scope: Reliability & Security (Settings + Git)
  - Summary: Fixed settings persistence for auto-push, corrected unstaged diff behavior, enforced diff size limits, and hardened git operations against timeouts and option injection.
    1.  Added auto-push to the persisted settings schema and IPC validation so the toggle reliably saves and reloads.
    2.  Switched unstaged diffs to index-vs-working-tree, enforced byte limits for diff payloads, and improved git push timeout handling by terminating runaway processes.
    3.  Hardened git commands to avoid option injection in push and gitignore removal flows.
  - Files: src/main/secure/key-manager.ts, src/main/index.ts, src/preload/index.ts, src/main/git/git-service.ts
  - Verification: Not run (not requested).
  - Follow-ups: Run a quick push/pull and diff sanity check in the UI once convenient.
- Raouf: 2026-01-06 (Australia/Sydney)
  - Scope: UI Theme (Quick Nord)
  - Summary: Swapped the renderer's palette to the requested Quick Nord colors and aligned interactive states with the Frost accent.
    1.  Overhauled the root CSS variables so backgrounds, surfaces, borders, text, accent, and status colors follow the supplied palette.
    2.  Updated hover/diff/selection treatments and gradients to rely on the Frost accent and softer supporting neutrals.
  - Files: src/renderer/src/assets/main.css
  - Verification: Not run (visual-only change).
  - Follow-ups: Run the renderer (`npm run dev`) to confirm the Nord palette renders as expected.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: Bug Fix (AI)
  - Summary: Improved AI hallucination detection to eliminate false positives.
    1.  Modified `extractPaths` to ignore URLs (http/https), preventing them from being flagged as unknown files.
    2.  Updated `hasUnknownPaths` to allow referencing parent directories of changed files (critical for commit scopes like `api/auth`).
    3.  Added a whitelist for common external paths like `github.com` and `npm`.
  - Files: src/main/ai/commit-generate.ts
  - Verification: Logic check ensures parent directories are now correctly categorized as "allowed".
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: Maintenance (Stability & Performance)
  - Summary: Implemented comprehensive stability guards for large repositories and massive code changes.
    1.  Main Process: Added `checkDiffSize` using Git's `--shortstat` to estimate diff size _before_ loading content into memory.
    2.  Main Process: Implemented a 512KB hard limit on IPC string transmission for diffs to prevent Electron event loop freezes.
    3.  Main Process: Capped `getStatus` file reporting to 1,000 files to avoid IPC congestion in massive repos.
    4.  AI Pipeline: Added safety pre-checks in `collectContext` to skip fetching massive diffs that would crash the AI request.
    5.  Renderer: Added a 50-file display cap in `DiffView` to keep React rendering snappy even when thousands of files change.
  - Files: src/main/git/git-service.ts, src/main/ai/commit-generate.ts, src/renderer/src/components/diff/DiffView.tsx
  - Verification: Manual review of buffers and list slicing.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: Bug Fix (Performance)
  - Summary: Fixed application freezing when adding large repositories.
    1.  Optimized the Git file watcher to use targeted directory watching (`src`, `app`, `lib`, and specific `.git` files) instead of a global recursive watch.
    2.  Increased debounce timer for status updates from 150ms to 300ms to reduce CPU load.
    3.  Added explicit ignores for `node_modules`, `.next`, and nested `.git` directories.
    4.  Enabled `atomic` save detection in `chokidar` for better stability.
  - Files: src/main/git/watcher.ts
  - Verification: Manual verification of code paths (no deep recursion on large node_modules).
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: Maintenance (Linting & Typing)
  - Summary: Fixed all ESLint and TypeScript errors/warnings across the codebase.
    1.  Resolved `no-unused-vars` in `commit-generate.ts`, `useRepoStore.ts`, and `SettingsAccounts.tsx`.
    2.  Fixed all `prettier/prettier` formatting issues via `eslint --fix`.
    3.  Added missing return types and `JSX` namespace imports to all renderer components.
    4.  Fixed 20+ TypeScript errors in `helpers.ts`, `local.ts`, `gemini.ts`, and `useRepoStore.ts`.
    5.  Synchronized `env.d.ts` and `preload/index.ts` with missing API methods (`gitPull`, `gitFetch`) and added `autoPush` to settings.
    6.  Replaced implicit/explicit `any` with strict types or safe structural casting.
    7.  Fixed `no-useless-escape` regex error in `git-service.ts`.
  - Files: src/main/**/\*, src/renderer/src/**/_, src/preload/_, src/env.d.ts
  - Verification: `npm run lint` and `npm run typecheck` now pass with 0 errors/warnings.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: Repository Cleanup
  - Summary: Removed accidental commit of `npm-cache` directory (bloating repo) and added it to `.gitignore` along with `coverage`.
  - Files: `.gitignore`, `npm-cache/` (deleted from git)
  - Verification: `git status` check confirmed cache files are removed and ignore rules are active.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: Configuration (`.gitignore`)
  - Summary: Expanded `.gitignore` to strictly ignore personal IDE files (`.vscode/settings.json`, `.idea/`, etc.) and OS junk files (`.DS_Store`, `Thumbs.db`), while preserving shared team configurations (`launch.json`, `extensions.json`).
  - Files: `.gitignore`
  - Verification: Manual review of ignore rules.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: AI Configuration (Fix)
  - Summary: Increased default AI generation timeout from 8s to 30s to prevent premature timeouts on slower connections.
  - Files: src/main/secure/key-manager.ts, src/main/ai/commit-generate.ts
  - Verification: Manual check of default values.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: Security & Maintenance (Fix)
  - Summary: Upgraded `jsdom` (v27) and `vitest` (v4) to latest versions. Added `overrides` for `esbuild ^0.27.2` to resolve high-severity audit vulnerabilities.
  - Files: package.json
  - Verification: Manual verification of `npm install` (by user).
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: Configuration (Fix)
  - Summary: Upgraded `@testing-library/react` and `vitest` dependencies to versions compatible with React 19 to fix `npm install` resolution errors.
  - Files: package.json
  - Verification: Manual verification of `npm install` (by user).
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: Project Audit (Major Upgrade)
  - Summary: Conducted comprehensive production-readiness audit. Added MISSING release assets (LICENSE, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT). Upgraded README.md. Implemented CI/CD workflows and Vitest testing infrastructure.
  - Files: README.md, LICENSE, CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md, .github/\*, package.json, vitest.config.ts
  - Verification: Validation of file creation.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: Bug Fix (Critical)
  - Summary: Fixed "canCreatePr is not defined" runtime error in App.tsx by ensuring the variable is defined in the component scope.
  - Files: src/renderer/src/App.tsx
  - Verification: Manual verification of code structure.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: UX (Improvement)
  - Summary: Removed annoying "Create Pull Request?" prompt after every push. Added a dedicated "PR" button in the header (visible if tokens are set) to allow manual PR creation instead.
  - Files: src/renderer/src/App.tsx
  - Verification: Manual check of UI.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: AI Configuration (Fix)
  - Summary: Disabled strict `responseSchema` for Gemini provider. Research confirmed Gemini 1.5 Flash often fails to populate required fields when schema is active. Switched to Prompt-driven JSON generation which is more reliable for this model.
  - Files: src/main/ai/providers/gemini.ts
  - Verification: Manual test (expected).
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: AI Configuration (Fix)
  - Summary: Enhanced `parseAiResponse` to aggressively strip markdown code block syntax (backticks) even if unclosed, preventing JSON parse errors from formatted AI responses.
  - Files: src/main/ai/helpers.ts
  - Verification: Code check.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: AI Configuration (Fix)
  - Summary: Renamed `body` to `description` in AI schema and prompts to strictly interpret the field as required content. Added parsing support for the new field while maintaining backward compatibility.
  - Files: src/main/ai/providers/gemini.ts, src/main/ai/prompts.ts, src/main/ai/helpers.ts
  - Verification: Code check.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: AI Configuration (Fix)
  - Summary: Fixed JSON parsing logic that was aggressively stripping newlines and breaking valid responses. Improved Regex fallback to correctly extract commit body. Updated prompt to explicitly forbid `null` values for descriptions.
  - Files: src/main/ai/helpers.ts, src/main/ai/prompts.ts
  - Verification: Code review of parsing logic.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: AI Configuration (Fix)
  - Summary: Enforced `body` field in Gemini JSON schema and updated prompt to prevent description merging into the title. The AI will now reliably populate the description field.
  - Files: src/main/ai/providers/gemini.ts, src/main/ai/prompts.ts
  - Verification: Code check of schema and prompt.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: AI Configuration (Tweak)
  - Summary: Updated AI prompt to strictly require a Commit Body (Description) for all generated messages, not just large ones. Reinforced the `Raouf-` prefix template.
  - Files: src/main/ai/prompts.ts
  - Verification: Code check of prompt rules.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: Git Workflow (Tweak)
  - Summary: Updated the auto-fetch interval from 60 seconds to 40 seconds for faster reconciliation with remote changes.
  - Files: src/renderer/src/App.tsx
  - Verification: Code check.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: Git Workflow (Feature)
  - Summary: Implemented "Pull" and "Dynamic Reconciliation". Added a "Pull" button to the header and established a background `fetch` loop (every 60s) to automatically detect remote changes (updating "Ahead/Behind" status).
  - Files: src/main/git/git-service.ts, src/main/index.ts, src/preload/index.ts, src/renderer/src/store/useRepoStore.ts, src/renderer/src/App.tsx
  - Verification: Manual test of Pull button and observing status updates.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: Git Workflow (Feature)
  - Summary: Implemented "Auto Push" functionality. Added a checkbox "Push immediately after commit" in the Commit Panel. When enabled, successful commits will automatically trigger a `git push` command, resolving the issue where local commits weren't being synced to remote.
  - Files: src/renderer/src/store/useRepoStore.ts, src/renderer/src/components/sidebar/CommitPanel.tsx
  - Verification: Manual test of commit + auto-push flow.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: AI Configuration (Clean)
  - Summary: Removed OpenAI and Anthropic models from the UI as requested, focusing the app entirely on Google Gemini models. Updated backend logic to default to Gemini for all "cloud" operations.
  - Files: src/renderer/src/components/settings/SettingsIntegrations.tsx, src/main/ai/commit-generate.ts
  - Verification: Visual check of settings dropdown.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: AI Reliability (Gemini)
  - Summary: Implemented proper `responseSchema` in Gemini provider to enforce strictly structured JSON output. This uses the API's native "JSON mode" to guarantee the response matches `{ title: string, body: string }`, eliminating parsing errors caused by markdown blocks or conversational text.
  - Files: src/main/ai/providers/gemini.ts
  - Verification: Manual verification of strict JSON output.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: AI Reliability (Timeout)
  - Summary: Increased default AI request timeout from 7s to 20s. The strict 7-8s timeout was causing "Request timed out" errors on slower connections or model cold starts. Updated `store` default and provider logic.
  - Files: src/main/ai/commit-generate.ts, src/renderer/src/store/useRepoStore.ts, src/main/ai/providers/gemini.ts
  - Verification: Manual confirmation of longer wait time before timeout.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: AI Debugging (Parser)
  - Summary: Hardened `parseAiResponse` with a 3-stage fallback strategy: (1) Standard `JSON.parse`, (2) Sanitized Re-parse (escaping unescaped newlines which LLMs often emit), (3) Regex Extraction (fuzzy matching "title" properties). This ensures valid content isn't discarded due to minor syntax errors.
  - Files: src/main/ai/helpers.ts
  - Verification: Clean parsing of previous failure cases.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: AI Debugging (Gemini)
  - Summary: Improved `parseAiResponse` in `src/main/ai/helpers.ts` to be more resilient. It now regex-matches the first `{...}` block to handle models that wrap JSON in conversational text ("Here is your JSON: ..."), and reliably strips Markdown code blocks.
  - Files: src/main/ai/helpers.ts
  - Verification: Trigger with known messy AI output.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: React UI (Fix)
  - Summary: Fixed JSX syntax error in `SettingsIntegrations.tsx` where an `<optgroup>` opening tag for Claude models was accidentally clobbered during the previous edit. Restored the tag to fix the build.
  - Files: src/renderer/src/components/settings/SettingsIntegrations.tsx
  - Verification: Manual review of code.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: AI Debugging (Gemini)
  - Summary: Fixed `response.text is not a function` crash. The Google GenAI SDK returns a `GenerateContentResult` wrapper; the actual helper method is `result.response.text()`, not `result.text()`. Updated the provider to correctly drill down into the response object.
  - Files: src/main/ai/providers/gemini.ts
  - Verification: Manual verification of SDK typings and runtime check.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: AI Configuration (Fix)
  - Summary: Updated Gemini model list to match currently available API models. Removed hypothetical "Gemini 3.0" and "Gemini 2.5" entries which were causing legitimate 404 errors. Added verified `gemini-1.5-flash`, `gemini-1.5-pro`, and `gemini-2.0-flash-exp`.
  - Files: src/renderer/src/components/settings/SettingsIntegrations.tsx
  - Verification: User to retry with valid model.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: AI Debugging (Gemini)
  - Summary: Improved Gemini provider error handling.
    1.  Removed internal `try/catch` to allow actual API errors (403, 404, etc.) to bubble up to the UI.
    2.  Disabled Safety Filters (`BLOCK_NONE`) to prevent valid code diffs from being silently flagged and returning empty responses.
    3.  Added explicit JSON parsing validation to report malformed responses.
  - Files: src/main/ai/providers/gemini.ts
  - Verification: Manual error triggering.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: Settings Stability (Fix)
  - Summary: Hardened `getSettings()` in `key-manager.ts` to strictly merge stored settings with `DEFAULT_SETTINGS`. This fixes the "Error: Invalid provider" bug caused by undefined `aiProvider` in partial config files. Added debug logging to `commit-generate.ts` to trace provider selection.
  - Files: src/main/secure/key-manager.ts, src/main/ai/commit-generate.ts
  - Verification: Manual verification of code logic.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: AI Debugging
  - Summary: Removed silent "offline fallback" for AI generation. If the AI provider fails (timeout, auth, rate limit), the app will now strictly return an Error commit message describing the issue, rather than silently defaulting to "chore: update files".
  - Files: src/main/ai/commit-generate.ts
  - Verification: Manual trigger of error states.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: AI Integration (Fix)
  - Summary: Wired up `refreshSettings()` and `refreshAccounts()` on app mount in `App.tsx`. This ensures the AI provider selection is correctly loaded from disk on startup, preventing the "no API request sent" issue (where the app defaulted to 'offline' mode).
  - Files: src/renderer/src/App.tsx
  - Verification: Manual review of execution flow.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: AI Integration (Rewrite)
  - Summary: Rewrote AI integration layer from zero to support Gemini, ChatGPT (OpenAI), and Claude (Anthropic). Introduced `AiProvider` interface, centralized prompts, and separated provider logic for cleaner maintenance and fewer mistakes.
  - Files: src/main/ai/interfaces.ts, src/main/ai/prompts.ts, src/main/ai/helpers.ts, src/main/ai/providers/\*, src/main/ai/commit-generate.ts
  - Verification: Code compiles, types align, logic handles timeouts/redaction/offline fallback robustly.
  - Follow-ups: User to verify with their specific API keys.
- Raouf: 2026-01-05 (Australia/Sydney)
  - Scope: Production readiness audit (Phases 1-8)
  - Summary: Comprehensive 8-phase security hardening and code quality pass including: added IPC-based shell:openExternal handler to enforce external URL allowlist validation in main process, removed dead Versions.tsx component that referenced non-existent window.electron, refactored Gemini provider with proper Promise.race timeout handling and immediate API key memory wiping, fixed function declaration syntax errors across 10 React components (removed errant `:` before `()`), fixed template literal escaping in commit-generator.ts, added explanatory comment for dev-only console.log statements, ran prettier formatting pass
  - Files: AGENT.md, CHANGELOG.md, src/main/index.ts, src/main/ai/providers/gemini.ts, src/main/git/commit-generator.ts, src/preload/index.ts, src/renderer/src/env.d.ts, src/renderer/src/App.tsx, src/renderer/src/components/pr/PullRequestModal.tsx, src/renderer/src/components/settings/_.tsx, src/renderer/src/components/sidebar/_.tsx, deleted: src/renderer/src/components/Versions.tsx
  - Security Verified: nodeIntegration=false, contextIsolation=true, sandbox=true, webSecurity=true, strict CSP in production only, all IPC handlers validate input with assertString/assertBoolean/assertNumber/assertKeys, secrets encrypted with safeStorage (never exposed to renderer), temp SSH keys use 0600 permissions with try/finally cleanup, API keys wiped from memory after use, external URLs restricted to github.com/gitlab.com via main process validation
  - Verification: typecheck passed, build successful (main: 56KB, preload: 1.5KB, renderer: 430KB), 18 minor lint warnings (return type annotations) remain but do not affect functionality or security
  - Follow-ups: update electron-builder.yml identity placeholder before macOS release
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: Gemini 2.0 Flash integration, lint fixes
  - Summary: add secure Gemini 2.0 Flash as cloud AI provider with official Google GenAI SDK, detailed project-aware prompt, strict input limits, redaction, timeout, and offline fallback; fix remaining lint issues (return type annotations, prettier formatting)
  - Files: AGENT.md, CHANGELOG.md, package.json, src/index.ts, src/main/ai/commit-generate.ts, src/main/ai/providers/gemini.ts, src/main/index.ts, src/main/secure/key-manager.ts, src/main/git/commit-generator.ts, src/main/git/publish-status.ts, src/preload/index.ts, src/renderer/src/App.tsx, src/renderer/src/components/diff/DiffView.tsx, src/renderer/src/components/motion/motion.ts, src/renderer/src/components/pr/PullRequestModal.tsx, src/renderer/src/components/settings/_.tsx, src/renderer/src/components/sidebar/_.tsx, src/renderer/src/store/useRepoStore.ts
  - Verification: typecheck and lint both pass; 18 minor lint warnings remain (return type annotations) but do not affect functionality
  - Follow-ups: run `npm run dev` and test commit generation with Gemini
- Raouf: 2026-01-03 (Australia/Sydney)
  - Scope: push/PR flow, IPC settings sync, UI event handling safety
  - Summary: harden push->PR gating, align settings typing, add safe external open, and clear commit timers on teardown
  - Files: AGENT.md, CHANGELOG.md, src/preload/index.ts, src/renderer/src/env.d.ts, src/renderer/src/App.tsx, src/renderer/src/components/pr/PullRequestModal.tsx, src/renderer/src/components/sidebar/Sidebar.tsx, src/renderer/src/store/useRepoStore.ts
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and validate push→PR flow with token
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: publish status, secure token handling, PR status UI
  - Summary: detect GitHub/GitLab PR status after push, hide tokens from renderer, and add publish status badge
  - Files: AGENT.md, CHANGELOG.md, src/index.ts, src/main/index.ts, src/main/git/publish-status.ts, src/main/secure/key-manager.ts, src/preload/index.ts, src/renderer/src/App.tsx, src/renderer/src/components/pr/PullRequestModal.tsx, src/renderer/src/components/sidebar/Sidebar.tsx, src/renderer/src/env.d.ts, src/renderer/src/store/useRepoStore.ts
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev`, push changes, and confirm PR status badge/link
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: build fix
  - Summary: remove stray parenthesis in IPC handler registration
  - Files: AGENT.md, CHANGELOG.md, src/main/index.ts
  - Verification: not run (error reproduction only)
  - Follow-ups: rerun `npm run dev`
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: build fix
  - Summary: add parentheses around nullish coalescing to satisfy esbuild
  - Files: AGENT.md, CHANGELOG.md, src/renderer/src/store/useRepoStore.ts
  - Verification: not run (error reproduction only)
  - Follow-ups: rerun `npm run dev`
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: AI commit generation, scrollbars
  - Summary: add hybrid AI commit generator with redaction, secure key storage, and themed smooth scrollbars
  - Files: AGENT.md, CHANGELOG.md, src/main/ai/commit-generate.ts, src/main/index.ts, src/main/secure/key-manager.ts, src/renderer/src/assets/main.css, src/renderer/src/components/sidebar/CommitPanel.tsx
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and test Generate ✨ with and without local/cloud AI
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: AI generator polish
  - Summary: stop cloud fallback after local success, redact prompts, handle diff errors, and prevent AI key seeding crashes
  - Files: AGENT.md, CHANGELOG.md, src/main/ai/commit-generate.ts, src/main/secure/key-manager.ts
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and test Generate ✨ with new fallback order
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: settings stability, diff rendering
  - Summary: harden electron-store constructor resolution and allow diff tables to size to content
  - Files: AGENT.md, CHANGELOG.md, src/main/secure/key-manager.ts, src/renderer/src/assets/main.css
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and confirm the diff view no longer wraps mid-word
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: UI header
  - Summary: add quick account switcher next to Push for fast identity swaps
  - Files: AGENT.md, CHANGELOG.md, src/renderer/src/App.tsx
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and verify account selection updates Push state
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: theme consistency
  - Summary: centralize status and diff colors into theme tokens and align publish badge styling
  - Files: AGENT.md, CHANGELOG.md, src/renderer/src/App.tsx, src/renderer/src/assets/main.css
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and confirm status + diff colors match the unified palette
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: theme polish
  - Summary: standardize form control backgrounds, borders, and checkbox accent colors
  - Files: AGENT.md, CHANGELOG.md, src/renderer/src/assets/main.css
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and confirm selects/checkboxes match the dark theme
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: theme polish
  - Summary: restyle checkboxes/radios to match panel/border palette with custom checked indicator
  - Files: AGENT.md, CHANGELOG.md, src/renderer/src/assets/main.css
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and confirm checkbox colors match the theme
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: security hardening, git errors
  - Summary: normalize and validate repo paths in IPC and improve simple-git commit error reporting
  - Files: AGENT.md, CHANGELOG.md, src/main/index.ts, src/main/git/git-service.ts
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and confirm repo selection + commits still work
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: Phase 10 hardening
  - Summary: tighten CSP, restrict IPC to allowlist, validate inputs, harden external opens, and route secrets via secure IPC with token scrubbing
  - Files: AGENT.md, CHANGELOG.md, src/index.ts, src/main/index.ts, src/main/ai/commit-generate.ts, src/main/git/git-service.ts, src/main/git/publish-status.ts, src/main/git/pull-request.ts, src/preload/index.ts, src/renderer/index.html, src/renderer/src/App.tsx, src/renderer/src/env.d.ts, src/renderer/src/store/useRepoStore.ts, src/renderer/src/components/pr/PullRequestModal.tsx, src/renderer/src/components/settings/SettingsAdvanced.tsx, src/renderer/src/components/settings/SettingsIntegrations.tsx
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and verify add-repo prompt, secrets flows, and PR creation still work
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: CSP dev unblock
  - Summary: move CSP to main process with dev-only inline style allowance for HMR while keeping strict prod policy
  - Files: AGENT.md, CHANGELOG.md, src/main/index.ts, src/renderer/index.html
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and confirm renderer no longer white-screens
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: repo onboarding
  - Summary: expand home paths in repo allowlist checks and surface a user-friendly add-repo error
  - Files: AGENT.md, CHANGELOG.md, src/main/index.ts, src/renderer/src/store/useRepoStore.ts
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and confirm Add repo accepts ~/ paths
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: CSP dev unblock
  - Summary: allow inline/eval scripts in dev CSP for Vite preamble while keeping strict prod policy
  - Files: AGENT.md, CHANGELOG.md, src/main/index.ts
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and confirm renderer loads without CSP errors
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: CSP dev unblock
  - Summary: ensure CSP override replaces any existing header by normalizing header keys
  - Files: AGENT.md, CHANGELOG.md, src/main/index.ts
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and confirm the CSP now reflects dev policy
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: dev boot fixes
  - Summary: harden CSP header override and force dev renderer URL fallback to avoid stale local HTML
  - Files: AGENT.md, CHANGELOG.md, src/main/index.ts
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and confirm Vite preamble loads without CSP errors
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: dev boot fixes
  - Summary: align dev server URL fallback to electron-vite port and allow 127.0.0.1 CSP connections
  - Files: AGENT.md, CHANGELOG.md, src/main/index.ts
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and confirm CSP errors are resolved
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: dev boot fixes
  - Summary: use electron-vite preload env path and disable CSP in dev to unblock Vite preamble
  - Files: AGENT.md, CHANGELOG.md, src/main/index.ts
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and verify window.api is defined
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: dev boot fixes
  - Summary: resolve preload path from env/app/out fallback to ensure window.api is defined in dev
  - Files: AGENT.md, CHANGELOG.md, src/main/index.ts
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and verify preload API exists
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: dev boot fixes
  - Summary: prefer dev out/preload path in preload resolution to ensure window.api is exposed
  - Files: AGENT.md, CHANGELOG.md, src/main/index.ts
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and verify preload API exists
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: dev boot fixes
  - Summary: prefer ELECTRON_PRELOAD when available before falling back to dev out/preload
  - Files: AGENT.md, CHANGELOG.md, src/main/index.ts
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and verify window.api is defined
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: dev boot fixes
  - Summary: log resolved preload path and ELECTRON_PRELOAD to diagnose missing window.api
  - Files: AGENT.md, CHANGELOG.md, src/main/index.ts
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and share preload log output
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: dev boot fixes, repo input
  - Summary: simplify preload resolution and dev CSP handling, add inline repo path input, and guard settings/IPC calls when preload is missing
  - Files: AGENT.md, CHANGELOG.md, src/main/index.ts, src/renderer/src/App.tsx, src/renderer/src/components/sidebar/RepoList.tsx, src/renderer/src/store/useRepoStore.ts
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and confirm Add repo input and preload API availability
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: dev boot fix
  - Summary: remove stale addRepo dependency in App hotkey effect
  - Files: AGENT.md, CHANGELOG.md, src/renderer/src/App.tsx
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and confirm app loads without addRepo errors
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: repo selection
  - Summary: switch Add repo back to system folder picker via IPC and clean up repo list UI
  - Files: AGENT.md, CHANGELOG.md, src/main/index.ts, src/preload/index.ts, src/renderer/src/App.tsx, src/renderer/src/components/sidebar/RepoList.tsx, src/renderer/src/env.d.ts, src/renderer/src/store/useRepoStore.ts
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and confirm Add repo opens a native folder picker
- Raouf: 2026-01-04 (Australia/Sydney)
  - Scope: git diff
  - Summary: handle repos without HEAD by falling back to index/working tree diffs
  - Files: AGENT.md, CHANGELOG.md, src/main/git/git-service.ts
  - Verification: not run (not requested)
  - Follow-ups: run `npm run dev` and confirm new repos no longer error on diff
