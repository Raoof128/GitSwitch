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
  const { status, reducedMotion, addToIgnore } = useRepoStore()
  const files = useMemo(() => status?.files ?? [], [status])
  const reduceMotion = useReducedMotionSafe(reducedMotion)
  const listVariants = useMemo(() => listItem(reduceMotion), [reduceMotion])
  const containerVariants = useMemo(() => fadeSlideIn(reduceMotion), [reduceMotion])
  const shouldAnimate = files.length <= 20

  const handleIgnore = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Are you sure you want to add "${path}" to .gitignore?`)) {
      await addToIgnore(path)
    }
  }

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
                className="group hover-card flex items-center justify-between rounded-md px-2 py-1 text-xs text-slate-300"
              >
                <div className="flex flex-1 items-center gap-2 overflow-hidden">
                  <span className="truncate" title={file.path}>
                    {file.path}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleIgnore(file.path, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-[var(--ui-hover)] rounded"
                    title="Add to .gitignore"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-[var(--ui-text-muted)] hover:text-white"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  </button>
                  <span data-status={code} className="status-indicator font-semibold w-4 text-center">
                    {code}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
