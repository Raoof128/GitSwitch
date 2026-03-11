import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, type JSX } from 'react'
import { Diff, Hunk, parseDiff } from 'react-diff-view'
import type { DiffMode } from '../../../../index'
import { useRepoStore } from '../../store/useRepoStore'
import { fadeSlideIn, useReducedMotionSafe } from '../motion/motion'

type DiffViewProps = {
  diffText: string
  mode: DiffMode
}

export function DiffView({ diffText, mode }: DiffViewProps): JSX.Element {
  const {
    diffViewType,
    focusedDiffFile,
    ignoreWhitespace,
    reducedMotion,
    setDiffViewType,
    setFocusedDiffFile,
    setIgnoreWhitespace
  } = useRepoStore()
  const reduceMotion = useReducedMotionSafe(reducedMotion)
  const variants = useMemo(() => fadeSlideIn(reduceMotion), [reduceMotion])
  const isError = diffText.startsWith('Error loading diff:')
  const isLimited = diffText.startsWith('[DIFF TOO LARGE]')
  const hasRenderableDiff = Boolean(diffText.trim()) && !isError && !isLimited

  const allFiles = useMemo(() => {
    if (!hasRenderableDiff) {
      return []
    }
    try {
      return parseDiff(diffText)
    } catch {
      return []
    }
  }, [diffText, hasRenderableDiff])

  const MAX_DISPLAY_FILES = 50
  const files = allFiles.slice(0, MAX_DISPLAY_FILES)
  const isTruncated = allFiles.length > MAX_DISPLAY_FILES

  useEffect(() => {
    if (!focusedDiffFile) {
      return
    }

    const fileSection = document.getElementById(`diff-file-${encodeURIComponent(focusedDiffFile)}`)
    fileSection?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }, [focusedDiffFile, reduceMotion])

  if (!diffText.trim()) {
    return (
      <div className="glass-card flex h-full min-h-[18rem] items-center justify-center rounded-[24px] border border-dashed border-[var(--glass-border)] px-6 text-sm text-[var(--ui-text-muted)]">
        {mode === 'staged'
          ? 'No staged diff yet. Stage files to review the exact commit payload.'
          : 'No diff to review. Modify a file or fetch a repository to populate the diff surface.'}
      </div>
    )
  }

  if (isError || isLimited) {
    return (
      <div className="glass-card rounded-[24px] border border-[var(--ui-status-modified-border)] bg-[var(--ui-status-modified-bg)] p-5 text-sm text-[var(--ui-status-modified)]">
        <div className="font-semibold">Diff preview unavailable</div>
        <div className="mt-2 text-xs leading-6 text-[var(--ui-text)]/80">{diffText}</div>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="glass-card rounded-[24px] border border-[var(--glass-border)] px-6 py-8 text-sm text-[var(--ui-text-muted)]">
        GitSwitch could not render this diff as structured hunks. Try switching modes or review the
        patch in a terminal for the full raw output.
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${mode}-${diffViewType}-${ignoreWhitespace}-${diffText}`}
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="diff-view space-y-4"
      >
        <div className="glass-card sticky top-0 z-20 rounded-[24px] border border-[var(--glass-border)] px-4 py-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--ui-accent)]">
                Diff Workspace
              </div>
              <div className="mt-1 text-xs text-[var(--ui-text-muted)]">
                Jump between changed files, switch layouts, and filter whitespace-only churn.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDiffViewType('split')}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  diffViewType === 'split'
                    ? 'border-[var(--ui-accent-border)] bg-[var(--ui-accent-bg)] text-[var(--ui-accent)]'
                    : 'border-[var(--glass-border)] text-[var(--ui-text-muted)] hover:bg-[var(--ui-hover)]'
                }`}
              >
                Side by Side
              </button>
              <button
                type="button"
                onClick={() => setDiffViewType('unified')}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  diffViewType === 'unified'
                    ? 'border-[var(--ui-accent-border)] bg-[var(--ui-accent-bg)] text-[var(--ui-accent)]'
                    : 'border-[var(--glass-border)] text-[var(--ui-text-muted)] hover:bg-[var(--ui-hover)]'
                }`}
              >
                Unified
              </button>
              <button
                type="button"
                onClick={() => setIgnoreWhitespace(!ignoreWhitespace)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  ignoreWhitespace
                    ? 'border-[var(--ui-status-added-border)] bg-[var(--ui-status-added-bg)] text-[var(--ui-status-added)]'
                    : 'border-[var(--glass-border)] text-[var(--ui-text-muted)] hover:bg-[var(--ui-hover)]'
                }`}
              >
                Ignore Whitespace
              </button>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {files.map((file) => {
              const pathLabel = file.newPath || file.oldPath
              const isActive = focusedDiffFile === pathLabel
              return (
                <button
                  key={`${file.oldPath}-${file.newPath}`}
                  type="button"
                  onClick={() => setFocusedDiffFile(pathLabel)}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    isActive
                      ? 'border-[var(--ui-accent-border)] bg-[var(--ui-accent-bg)] text-[var(--ui-accent)]'
                      : 'border-[var(--glass-border)] text-[var(--ui-text-muted)] hover:bg-[var(--ui-hover)]'
                  }`}
                >
                  {pathLabel}
                </button>
              )
            })}
          </div>
        </div>

        {isTruncated && (
          <div className="rounded-2xl border border-[var(--ui-status-modified-border)] bg-[var(--ui-status-modified-bg)] p-4 text-xs text-[var(--ui-status-modified)]">
            Showing the first {MAX_DISPLAY_FILES} of {allFiles.length} changed files for renderer
            safety.
          </div>
        )}

        {files.map((file) => {
          const pathLabel = file.newPath || file.oldPath
          return (
            <section
              key={`${file.oldPath}-${file.newPath}`}
              id={`diff-file-${encodeURIComponent(pathLabel)}`}
              className="diff-view-container rounded-[24px] border border-[var(--glass-border)]"
            >
              <div className="sticky top-[5.75rem] z-10 flex items-center justify-between gap-3 border-b border-[var(--glass-border)] bg-[var(--ui-panel)]/88 px-4 py-3 backdrop-blur">
                <div>
                  <div className="text-sm font-semibold text-[var(--ui-text)]">{pathLabel}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ui-text-muted)]">
                    {file.type}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFocusedDiffFile(pathLabel)}
                  className="rounded-full border border-[var(--glass-border)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-text-muted)] hover:bg-[var(--ui-hover)]"
                >
                  Focus
                </button>
              </div>
              <Diff viewType={diffViewType} diffType={file.type} hunks={file.hunks}>
                {(hunks) => (
                  <div className="bg-[var(--ui-panel-muted)]/80">
                    {hunks.map((hunk) => (
                      <Hunk key={hunk.content} hunk={hunk} />
                    ))}
                  </div>
                )}
              </Diff>
            </section>
          )
        })}
      </motion.div>
    </AnimatePresence>
  )
}
