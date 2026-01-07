import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState, JSX } from 'react'
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

/** Simple confirmation dialog state */
type ConfirmDialogState = {
  isOpen: boolean
  path: string
}

export function FileList(): JSX.Element {
  const { status, reducedMotion, addToIgnore } = useRepoStore()
  const files = useMemo(() => status?.files ?? [], [status])
  const reduceMotion = useReducedMotionSafe(reducedMotion)
  const listVariants = useMemo(() => listItem(reduceMotion), [reduceMotion])
  const containerVariants = useMemo(() => fadeSlideIn(reduceMotion), [reduceMotion])
  const shouldAnimate = files.length <= 20

  // In-app confirmation dialog state instead of browser confirm()
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    path: ''
  })

  const handleIgnoreClick = (path: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    setConfirmDialog({ isOpen: true, path })
  }

  const handleConfirmIgnore = async (): Promise<void> => {
    const pathToIgnore = confirmDialog.path
    setConfirmDialog({ isOpen: false, path: '' })
    await addToIgnore(pathToIgnore)
  }

  const handleCancelIgnore = (): void => {
    setConfirmDialog({ isOpen: false, path: '' })
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="h-full overflow-y-auto px-2 py-2"
    >
      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={handleCancelIgnore}
          >
            <motion.div
              initial={{ scale: reduceMotion ? 1 : 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: reduceMotion ? 1 : 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-4 max-w-sm rounded-lg border border-[var(--glass-border)] bg-[var(--ui-panel)] p-4 shadow-xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-dialog-title"
            >
              <h3
                id="confirm-dialog-title"
                className="mb-2 text-sm font-semibold text-[var(--ui-text)]"
              >
                Add to .gitignore?
              </h3>
              <p className="mb-4 text-xs text-[var(--ui-text-muted)]">
                Are you sure you want to add{' '}
                <code className="rounded bg-[var(--ui-panel-muted)] px-1 py-0.5">
                  {confirmDialog.path}
                </code>{' '}
                to .gitignore?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelIgnore}
                  className="rounded-md border border-[var(--glass-border)] px-3 py-1 text-xs text-[var(--ui-text-muted)] hover:bg-[var(--ui-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ui-accent)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmIgnore}
                  className="rounded-md border border-[var(--ui-accent-border)] bg-[var(--ui-accent-bg)] px-3 py-1 text-xs font-semibold text-[var(--ui-accent)] hover:bg-[var(--ui-accent-bg-strong)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ui-accent)]"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    onClick={(e) => handleIgnoreClick(file.path, e)}
                    className="rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ui-accent)] hover:bg-[var(--ui-hover)]"
                    title="Add to .gitignore"
                    aria-label="Add file to .gitignore"
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
                      className="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  </button>
                  <span
                    data-status={code}
                    className="status-indicator font-semibold w-4 text-center"
                  >
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
