import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState, type JSX, type MouseEvent as ReactMouseEvent } from 'react'
import type { DiffMode } from '../../../../index'
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

const STATUS_LABELS: Record<string, string> = {
  M: 'Modified',
  A: 'Added',
  D: 'Deleted',
  R: 'Renamed',
  C: 'Copied',
  U: 'Unmerged',
  '?': 'Untracked',
  '!': 'Ignored'
}

/** Simple confirmation dialog state */
type ConfirmDialogState = {
  isOpen: boolean
  path: string
}

type FileListProps = {
  mode: DiffMode
}

export function FileList({ mode }: FileListProps): JSX.Element {
  const { status, reducedMotion, addToIgnore, focusedDiffFile, setFocusedDiffFile } = useRepoStore()
  const files = useMemo(() => {
    const changedFiles = status?.files ?? []
    if (mode === 'unstaged') {
      return changedFiles
    }

    const staged = new Set(status?.staged ?? [])
    return changedFiles.filter((file) => staged.has(file.path))
  }, [mode, status])
  const reduceMotion = useReducedMotionSafe(reducedMotion)
  const listVariants = useMemo(() => listItem(reduceMotion), [reduceMotion])
  const containerVariants = useMemo(() => fadeSlideIn(reduceMotion), [reduceMotion])
  const shouldAnimate = files.length <= 20

  // In-app confirmation dialog state instead of browser confirm()
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    path: ''
  })

  const handleIgnoreClick = (path: string, e: ReactMouseEvent): void => {
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={handleCancelIgnore}
          >
            <motion.div
              initial={{ scale: reduceMotion ? 1 : 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: reduceMotion ? 1 : 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-4 max-w-sm border border-[#2a2a2a] bg-[#141414] p-4 shadow-[0_0_40px_rgba(0,0,0,0.5)]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-dialog-title"
            >
              <h3
                id="confirm-dialog-title"
                className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#e0e0e0]"
              >
                Add to .gitignore?
              </h3>
              <p className="mb-4 text-xs text-[#666666]">
                Are you sure you want to add{' '}
                <code className="border border-[#2a2a2a] bg-[#0a0a0a] px-1 py-0.5 font-mono text-[#e0e0e0]">
                  {confirmDialog.path}
                </code>{' '}
                to .gitignore?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelIgnore}
                  className="border border-[#2a2a2a] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#666666] transition-shadow hover:border-[#e0e0e0] hover:text-[#e0e0e0] focus:outline-none"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleConfirmIgnore}
                  className="border border-[#00ffaa] bg-[#00ffaa] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a] transition-shadow hover:shadow-[0_0_20px_rgba(0,255,170,0.3)] focus:outline-none"
                >
                  CONFIRM
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {files.length === 0 && (
        <div className="border border-dashed border-[#2a2a2a] bg-[#0a0a0a] px-3 py-5 text-center text-xs text-[#888888]">
          {mode === 'staged'
            ? 'No staged files. Use "Stage All" or click files to stage them.'
            : 'No modified files. Edit files or fetch changes to see diffs here.'}
        </div>
      )}
      <div className="space-y-1">
        <AnimatePresence initial={false}>
          {files.map((file) => {
            const code = getStatusCode(file.index, file.working_dir)
            const isFocused = focusedDiffFile === file.path
            return (
              <motion.div
                key={file.path}
                layout={false}
                variants={listVariants}
                initial={shouldAnimate ? 'hidden' : false}
                animate="visible"
                exit="exit"
                transition={shouldAnimate ? undefined : { duration: 0 }}
                className={`group hover-card flex items-center justify-between border px-2 py-2 text-xs text-[#e0e0e0] ${
                  isFocused
                    ? 'border-l-2 border-l-[#00ffaa] border-t-[#2a2a2a] border-r-[#2a2a2a] border-b-[#2a2a2a] bg-[#141414] shadow-[inset_4px_0_12px_rgba(0,255,170,0.1)]'
                    : 'border-transparent'
                }`}
                onClick={() => setFocusedDiffFile(file.path)}
              >
                <div className="flex flex-1 items-center gap-2 overflow-hidden">
                  <span className="truncate font-mono" title={file.path}>
                    {file.path}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleIgnoreClick(file.path, e)}
                    className="border border-transparent p-0.5 opacity-0 transition-opacity hover:border-[#2a2a2a] hover:text-[#e0e0e0] group-hover:opacity-100 focus-visible:opacity-100 focus:outline-none"
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
                      className="text-[#666666] hover:text-[#e0e0e0]"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  </button>
                  <span
                    data-status={code}
                    className="status-indicator w-4 text-center font-bold"
                    title={STATUS_LABELS[code] ?? code}
                    aria-label={STATUS_LABELS[code] ?? code}
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
