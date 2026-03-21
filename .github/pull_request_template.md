## Summary

<!-- What does this PR do and why? Link related issues with "Closes #123". -->

## Type of Change

- [ ] Bug fix — resolves an issue without breaking existing behavior
- [ ] New feature — adds functionality without breaking existing behavior
- [ ] Breaking change — alters existing behavior or API contracts
- [ ] Performance improvement — measurable impact on speed, memory, or resource usage
- [ ] Refactor — internal restructuring with no user-facing behavior change
- [ ] Documentation — updates to docs, comments, or inline guidance

## Security Impact

<!-- GitSwitch handles credentials, API keys, and repository data. Every change must be evaluated for security implications. -->

- [ ] This change does **not** introduce new attack surface (no new IPC handlers, file I/O, or network calls)
- [ ] OR: New attack surface has been reviewed and the following mitigations are in place:
  - [ ] IPC inputs validated with `assertString` / `assertBoolean` / `assertNumber` / `assertKeys`
  - [ ] No secrets exposed to the renderer process
  - [ ] External URLs restricted to the allowlist (`github.com`, `gitlab.com`)
  - [ ] File paths validated against traversal (`..`, absolute path injection)
- [ ] Cloud AI consent gate is **not** bypassed — user opt-in is required before any data leaves the device
- [ ] Audit log calls added for any new sensitive operation (key access, AI requests, push, pull, PR creation)
- [ ] CSP headers remain intact — no `unsafe-inline` or `unsafe-eval` added to production policy

## Quality Checklist

- [ ] Code follows the project style guidelines (TypeScript strict mode, ESLint, Prettier)
- [ ] Self-review completed — no leftover debug logs, TODO comments, or commented-out code
- [ ] Hard-to-follow logic has inline comments explaining the *why*, not the *what*
- [ ] Documentation updated to reflect any user-facing or architectural changes
- [ ] No new warnings from `npm run lint` or `npm run typecheck`

## Testing

- [ ] New or updated unit tests cover the changed behavior
- [ ] All existing tests pass locally (`npm test`)
- [ ] Coverage thresholds met (`npm run test:coverage`)
- [ ] For UI changes: manual verification across light/dark themes and responsive breakpoints
- [ ] For git operations: tested against repos of varying size (empty, small, 10k+ files)

## Screenshots

<!-- If this PR includes visual changes, paste before/after screenshots here. Delete this section otherwise. -->
