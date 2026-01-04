import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import { Diff, Hunk, parseDiff } from 'react-diff-view'
import { fadeSlideIn, useReducedMotionSafe } from '../motion/motion'
import { useRepoStore } from '../../store/useRepoStore'

type DiffViewProps = {
  diffText: string
}

export function DiffView({ diffText }: DiffViewProps) {
  const reducedMotion = useRepoStore((state) => state.reducedMotion)
  const reduceMotion = useReducedMotionSafe(reducedMotion)
  const variants = useMemo(() => fadeSlideIn(reduceMotion), [reduceMotion])

  if (!diffText.trim()) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--ui-text-muted)]">
        No changes
      </div>
    )
  }

  const files = parseDiff(diffText)

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={diffText}
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="diff-view space-y-6"
      >
        {files.map((file) => (
          <div
            key={`${file.oldPath}-${file.newPath}`}
            className="diff-view-container rounded-lg border-2 border-[var(--ui-border)]"
          >
            <div className="border-b-2 border-[var(--ui-border)] bg-[var(--ui-panel)]/70 px-4 py-2 text-xs text-slate-300">
              {file.newPath || file.oldPath}
            </div>
            <Diff viewType="split" diffType={file.type} hunks={file.hunks}>
              {(hunks) => (
                <div className="bg-[var(--ui-panel-muted)]/80">
                  {hunks.map((hunk) => (
                    <Hunk key={hunk.content} hunk={hunk} />
                  ))}
                </div>
              )}
            </Diff>
          </div>
        ))}
      </motion.div>
    </AnimatePresence>
  )
}
