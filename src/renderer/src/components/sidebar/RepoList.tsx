import { motion } from 'framer-motion'
import { useCallback, useMemo, JSX } from 'react'
import type { MouseEvent } from 'react'
import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useRepoStore } from '../../store/useRepoStore'
import { fadeSlideIn, scaleTap, useReducedMotionSafe } from '../motion/motion'

const cx = (...inputs: Array<string | false | null | undefined>): string => twMerge(clsx(inputs))

export function RepoList(): JSX.Element {
  const { repos, activeRepoPath, addRepo, setActiveRepo, reducedMotion } = useRepoStore()
  const reduceMotion = useReducedMotionSafe(reducedMotion)
  const listVariants = useMemo(() => fadeSlideIn(reduceMotion), [reduceMotion])
  const handleSelectRepo = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const path = event.currentTarget.dataset.repoPath
      if (path) {
        setActiveRepo(path)
      }
    },
    [setActiveRepo]
  )

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--ui-text-muted)]">
          Repositories
        </h2>
        <motion.button
          type="button"
          onClick={addRepo}
          whileTap={scaleTap(reduceMotion)}
          title="Add repository (Ctrl/⌘+O)"
          className="rounded-md border border-[var(--ui-border)] px-2 py-1 text-xs text-slate-300 hover:border-[var(--ui-border-soft)] hover:bg-[var(--ui-hover)] hover:text-white"
        >
          + Add
        </motion.button>
      </div>

      <div className="relative space-y-1">
        {repos.length === 0 && (
          <div className="text-xs text-[var(--ui-text-muted)]">No repositories yet.</div>
        )}
        {repos.map((repo) => {
          const isActive = activeRepoPath === repo.path
          return (
            <motion.button
              key={repo.path}
              type="button"
              data-repo-path={repo.path}
              onClick={handleSelectRepo}
              variants={listVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={cx(
                'hover-card relative flex w-full flex-col rounded-md px-2 py-2 text-left text-sm transition',
                isActive ? 'text-white' : 'text-slate-300'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="active-repo"
                  className="absolute inset-0 -z-10 rounded-md bg-[var(--ui-border)]"
                  transition={{ duration: 0.18 }}
                />
              )}
              <span className="font-medium">{repo.name}</span>
              <span className="break-all pr-3 text-xs leading-snug text-[var(--ui-text-muted)]">
                {repo.path}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
