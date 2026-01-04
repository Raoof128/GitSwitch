import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import { useRepoStore } from '../../store/useRepoStore'
import { fadeSlideIn, listItem, useReducedMotionSafe } from '../motion/motion'

const getStatusCode = (index: string, workingDir: string): string => {
  if (workingDir && workingDir !== ' ') {
    return workingDir
  }
  if (index && index !== ' ') {
    return index
  }
  return '?'
}

export function FileList() {
  const { status, reducedMotion } = useRepoStore()
  const files = useMemo(() => status?.files ?? [], [status])
  const reduceMotion = useReducedMotionSafe(reducedMotion)
  const listVariants = useMemo(() => listItem(reduceMotion), [reduceMotion])
  const containerVariants = useMemo(() => fadeSlideIn(reduceMotion), [reduceMotion])
  const shouldAnimate = files.length <= 20

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="h-full overflow-y-auto px-2 py-2"
    >
      {files.length === 0 && (
        <div className="text-xs text-[var(--ui-text-muted)]">No modified files.</div>
      )}
      <div className="space-y-1">
        <AnimatePresence initial={false}>
          {files.map((file) => {
            const code = getStatusCode(file.index, file.working_dir)
            return (
              <motion.div
                key={file.path}
                layout={false}
                variants={listVariants}
                initial={shouldAnimate ? 'hidden' : false}
                animate="visible"
                exit="exit"
                transition={shouldAnimate ? undefined : { duration: 0 }}
                className="hover-card flex items-center justify-between rounded-md px-2 py-1 text-xs text-slate-300"
              >
                <span className="truncate">{file.path}</span>
                <span data-status={code} className="status-indicator ml-2 font-semibold">
                  {code}
                </span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
