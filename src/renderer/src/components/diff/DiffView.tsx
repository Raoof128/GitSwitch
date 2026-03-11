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
      <div className="flex h-full min-h-[18rem] items-center justify-center rounded-none border border-dashed border-[#2a2a2a] bg-[#0e0e0e] px-6 text-sm text-[#666666]">
        {mode === 'staged'
          ? 'No staged diff yet. Stage files to review the exact commit payload.'
          : 'No diff to review. Modify a file or fetch a repository to populate the diff surface.'}
      </div>
    )
  }

  if (isError || isLimited) {
    return (
      <div className="rounded-none border border-[#ffcc00] bg-[#141414] p-5 text-sm text-[#ffcc00]">
        <div className="font-bold">Diff preview unavailable</div>
        <div className="mt-2 text-xs leading-6 text-[#e0e0e0]/80">{diffText}</div>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="rounded-none border border-[#2a2a2a] bg-[#0e0e0e] px-6 py-8 text-sm text-[#666666]">
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
        <div className="sticky top-0 z-20 rounded-none border-b border-[#2a2a2a] bg-[#0a0a0a] px-4 py-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#00ffaa]">
                DIFF WORKSPACE
              </div>
              <div className="mt-1 text-xs text-[#666666]">
                Jump between changed files, switch layouts, and filter whitespace-only churn.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={diffViewType === 'split'}
                onClick={() => setDiffViewType('split')}
                className={`neon-badge rounded-none border px-3 py-1.5 font-mono text-xs font-bold ${
                  diffViewType === 'split'
                    ? 'border-[#00ffaa] text-[#00ffaa] shadow-[0_0_8px_rgba(0,255,170,0.2)]'
                    : 'border-[#2a2a2a] text-[#666666] hover:border-[#666666]'
                }`}
              >
                Side by Side
              </button>
              <button
                type="button"
                aria-pressed={diffViewType === 'unified'}
                onClick={() => setDiffViewType('unified')}
                className={`neon-badge rounded-none border px-3 py-1.5 font-mono text-xs font-bold ${
                  diffViewType === 'unified'
                    ? 'border-[#00ffaa] text-[#00ffaa] shadow-[0_0_8px_rgba(0,255,170,0.2)]'
                    : 'border-[#2a2a2a] text-[#666666] hover:border-[#666666]'
                }`}
              >
                Unified
              </button>
              <button
                type="button"
                aria-pressed={ignoreWhitespace}
                onClick={() => setIgnoreWhitespace(!ignoreWhitespace)}
                className={`neon-badge rounded-none border px-3 py-1.5 font-mono text-xs font-bold ${
                  ignoreWhitespace
                    ? 'border-[#00ffaa] text-[#00ffaa] shadow-[0_0_8px_rgba(0,255,170,0.2)]'
                    : 'border-[#2a2a2a] text-[#666666] hover:border-[#666666]'
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
                  className={`neon-badge whitespace-nowrap rounded-none border px-3 py-1.5 font-mono text-xs font-bold ${
                    isActive
                      ? 'border-[#00ffaa] text-[#00ffaa] shadow-[0_0_8px_rgba(0,255,170,0.2)]'
                      : 'border-[#2a2a2a] text-[#666666] hover:border-[#666666]'
                  }`}
                >
                  {pathLabel}
                </button>
              )
            })}
          </div>
        </div>

        {isTruncated && (
          <div className="neon-badge-yellow rounded-none border border-[#ffcc00] bg-[#141414] p-4 text-xs text-[#ffcc00]">
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
              className="diff-view-container rounded-none border border-[#2a2a2a]"
            >
              <div className="sticky top-[5.75rem] z-10 flex items-center justify-between gap-3 border-b border-[#2a2a2a] bg-[#141414] px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-[#e0e0e0]">{pathLabel}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">
                    {file.type}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFocusedDiffFile(pathLabel)}
                  className="btn-neon rounded-none border border-[#00ffaa] bg-transparent px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#00ffaa] transition-shadow hover:shadow-[0_0_10px_rgba(0,255,170,0.3)]"
                >
                  Focus
                </button>
              </div>
              <Diff viewType={diffViewType} diffType={file.type} hunks={file.hunks}>
                {(hunks) => (
                  <div className="bg-[#0a0a0a]/80">
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
