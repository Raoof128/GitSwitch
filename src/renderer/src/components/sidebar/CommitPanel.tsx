import { useMemo, JSX } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRepoStore } from '../../store/useRepoStore'
import { scaleTap, useReducedMotionSafe } from '../motion/motion'

export function CommitPanel(): JSX.Element {
  const {
    activeRepoPath,
    status,
    stagedSummary,
    commitTitle,
    commitBody,
    commitError,
    commitStatus,
    reducedMotion,
    generateStatus,
    stageAll,
    stageStatus,
    setCommitTitle,
    setCommitBody,
    generateCommitMessage,
    commit,
    autoPush,
    updateSettings
  } = useRepoStore()

  const trimmedTitle = useMemo(() => commitTitle.trim(), [commitTitle])
  const titleLength = trimmedTitle.length
  const hasStaged = stagedSummary.count > 0
  const branchLabel = status?.current ? `Commit to ${status.current}` : 'Commit'
  const reduceMotion = useReducedMotionSafe(reducedMotion)
  const hasChanges = Boolean(status?.files.length) || Boolean(status?.staged.length)
  const hasUnstagedChanges = Boolean(status?.files.filter((f) => f.working_dir !== ' ').length)
  const isDisabled =
    !activeRepoPath || !hasStaged || titleLength === 0 || commitStatus === 'loading'
  const isGenerateDisabled = !activeRepoPath || !hasChanges || generateStatus === 'loading'
  const isStageDisabled = !activeRepoPath || !hasUnstagedChanges || stageStatus === 'loading'
  const isGenerating = generateStatus === 'loading'
  const isStaging = stageStatus === 'loading'

  return (
    <div className="glass-card mt-6 rounded-md p-3">
      <div className="mb-2">
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--ui-text-muted)]">Commit</div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            value={commitTitle}
            onChange={(event) => setCommitTitle(event.target.value)}
            placeholder="Summary (required)"
            maxLength={200}
            disabled={isGenerating}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isDisabled) {
                commit()
              }
            }}
            className="w-full flex-1 rounded-md border border-[var(--glass-border)] bg-[var(--ui-panel)] px-2 py-1 text-xs text-slate-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ui-accent)] disabled:cursor-not-allowed disabled:opacity-50"
          />
          <motion.button
            type="button"
            onClick={generateCommitMessage}
            whileTap={scaleTap(reduceMotion)}
            disabled={isGenerateDisabled}
            title="Generate message (Shift+Ctrl/⌘+G)"
            className="rounded-md border border-[var(--glass-border)] px-2 py-1 text-[10px] text-slate-300 hover:border-[var(--ui-border-soft)] hover:bg-[var(--ui-hover)] hover:text-[var(--ui-text)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generateStatus === 'loading' ? 'Generating…' : 'Generate ✨'}
          </motion.button>
        </div>
        <textarea
          value={commitBody}
          onChange={(event) => setCommitBody(event.target.value)}
          placeholder="Description (optional)"
          rows={3}
          disabled={isGenerating}
          className="w-full resize-none rounded-md border border-[var(--glass-border)] bg-[var(--ui-panel)] px-2 py-1 text-xs text-slate-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ui-accent)] disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="text-[11px] text-[var(--ui-text-muted)]">
          Staged files: {stagedSummary.count}
          {stagedSummary.files.length > 0 && (
            <span className="block text-[var(--ui-text-muted)]">
              {stagedSummary.files.join(', ')}
              {stagedSummary.count > stagedSummary.files.length ? '…' : ''}
            </span>
          )}
        </div>
        {titleLength > 72 && (
          <div className="rounded border border-[var(--ui-status-modified-border)] bg-[var(--ui-status-modified-bg)] px-2 py-1 text-[11px] text-[var(--ui-status-modified)]">
            ⚠️ Title exceeds 72 characters (may be truncated)
          </div>
        )}
        {commitError && (
          <div className="rounded border border-[var(--ui-status-deleted-border)] bg-[var(--ui-status-deleted-bg)] px-2 py-1 text-[11px] text-[var(--ui-status-deleted)]">
            ❌ {commitError}
          </div>
        )}
        <motion.button
          type="button"
          onClick={stageAll}
          disabled={isStageDisabled}
          whileTap={scaleTap(reduceMotion)}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border-2 border-[var(--ui-accent-border)] bg-[var(--ui-accent-bg)] py-1.5 text-xs font-medium text-[var(--ui-accent)] transition-colors hover:bg-[var(--ui-accent-bg-strong)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ui-accent)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isStaging ? (
            <svg
              className="h-3.5 w-3.5 animate-spin text-[var(--ui-accent)]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              className="h-3.5 w-3.5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          )}
          Stage All
        </motion.button>

        <div className="flex items-center gap-2 px-1">
          <input
            type="checkbox"
            id="auto-push"
            checked={autoPush}
            onChange={(e) => updateSettings({ autoPush: e.target.checked })}
            className="h-3 w-3 rounded border-[var(--glass-border)] bg-[var(--ui-panel)] text-[var(--ui-accent)] focus:ring-[var(--ui-accent)]"
          />
          <label
            htmlFor="auto-push"
            className="cursor-pointer select-none text-[10px] text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
          >
            Push immediately after commit
          </label>
        </div>

        <motion.button
          type="button"
          onClick={commit}
          disabled={isDisabled}
          whileTap={scaleTap(reduceMotion)}
          title="Commit (Ctrl/⌘+Enter)"
          className="relative w-full rounded-md border border-[var(--glass-border)] px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-[var(--ui-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ui-accent)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={commitStatus === 'loading' ? 'opacity-0' : 'opacity-100'}>
            {branchLabel}
          </span>
          <AnimatePresence>
            {commitStatus === 'loading' && (
              <motion.span
                key="spinner"
                className="absolute inset-0 flex items-center justify-center text-slate-200"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.span
                  className="h-3 w-3 rounded-full border border-[var(--ui-border-soft)] border-t-transparent"
                  animate={reduceMotion ? {} : { rotate: 360 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { repeat: Infinity, duration: 1.5, ease: 'linear' }
                  }
                />
              </motion.span>
            )}
            {commitStatus === 'success' && (
              <motion.span
                key="success"
                className="absolute inset-0 flex items-center justify-center text-[var(--ui-status-added)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
              >
                ✓
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  )
}
