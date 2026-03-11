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
    <div className="mt-6 border border-[#2a2a2a] bg-[#141414] p-3">
      <div className="mb-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">Commit</div>
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
            className="w-full flex-1 border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#e0e0e0] placeholder-[#666666] focus:border-[#00ffaa] focus:shadow-[0_0_12px_rgba(0,255,170,0.15)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          <motion.button
            type="button"
            onClick={generateCommitMessage}
            whileTap={scaleTap(reduceMotion)}
            disabled={isGenerateDisabled}
            title="Generate message (Shift+Ctrl/⌘+G)"
            className="border border-[#00ffaa] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#00ffaa] transition-shadow hover:shadow-[0_0_20px_rgba(0,255,170,0.15)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generateStatus === 'loading' ? 'GENERATING...' : 'GENERATE'}
          </motion.button>
        </div>
        <textarea
          value={commitBody}
          onChange={(event) => setCommitBody(event.target.value)}
          placeholder="Description (optional)"
          rows={3}
          disabled={isGenerating}
          className="w-full resize-none border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#e0e0e0] placeholder-[#666666] focus:border-[#00ffaa] focus:shadow-[0_0_12px_rgba(0,255,170,0.15)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="text-[11px] text-[#666666]">
          Staged files: {stagedSummary.count}
          {stagedSummary.files.length > 0 && (
            <span className="block text-[#666666]">
              {stagedSummary.files.join(', ')}
              {stagedSummary.count > stagedSummary.files.length ? '...' : ''}
            </span>
          )}
        </div>
        {titleLength > 72 && (
          <div className="border border-[#ffcc00]/30 bg-[#ffcc00]/5 px-2 py-1 text-[11px] font-bold text-[#ffcc00]" style={{ textShadow: '0 0 8px rgba(255, 204, 0, 0.4)' }}>
            WARNING: Title exceeds 72 characters (may be truncated)
          </div>
        )}
        {commitError && (
          <div className="border border-[#ff3366]/30 bg-[#ff3366]/5 px-2 py-1 text-[11px] font-bold text-[#ff3366]" style={{ textShadow: '0 0 8px rgba(255, 51, 102, 0.4)' }}>
            ERROR: {commitError}
          </div>
        )}
        <motion.button
          type="button"
          onClick={stageAll}
          disabled={isStageDisabled}
          whileTap={scaleTap(reduceMotion)}
          className="flex w-full items-center justify-center gap-1.5 border border-[#00ffaa] py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#00ffaa] transition-shadow hover:shadow-[0_0_20px_rgba(0,255,170,0.15)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isStaging ? (
            <svg
              className="h-3.5 w-3.5 animate-spin text-[#00ffaa]"
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
          STAGE ALL
        </motion.button>

        <div className="flex items-center gap-2 px-1">
          <input
            type="checkbox"
            id="auto-push"
            checked={autoPush}
            onChange={(e) => updateSettings({ autoPush: e.target.checked })}
            className="h-3 w-3 appearance-none border border-[#2a2a2a] bg-[#0a0a0a] checked:border-[#00ffaa] checked:bg-[#00ffaa] focus:ring-0 focus:ring-offset-0"
            style={{ borderRadius: 0 }}
          />
          <label
            htmlFor="auto-push"
            className="cursor-pointer select-none text-[10px] uppercase tracking-[0.12em] text-[#666666] hover:text-[#e0e0e0]"
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
          className="relative w-full bg-[#00ffaa] px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a] transition-shadow hover:shadow-[0_0_20px_rgba(0,255,170,0.3)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={commitStatus === 'loading' ? 'opacity-0' : 'opacity-100'}>
            {branchLabel}
          </span>
          <AnimatePresence>
            {commitStatus === 'loading' && (
              <motion.span
                key="spinner"
                className="absolute inset-0 flex items-center justify-center text-[#0a0a0a]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.span
                  className="h-3 w-3 border border-[#0a0a0a] border-t-transparent"
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
                className="absolute inset-0 flex items-center justify-center text-[#0a0a0a]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                style={{ textShadow: '0 0 8px rgba(0, 255, 170, 0.6)' }}
              >
                COMMITTED
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  )
}
