import { motion } from 'framer-motion'
import { useMemo, useState, type JSX } from 'react'
import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useRepoStore } from '../../store/useRepoStore'
import { fadeSlideIn, scaleTap, useReducedMotionSafe } from '../motion/motion'

const cx = (...inputs: Array<string | false | null | undefined>): string => twMerge(clsx(inputs))

type RepoSection = {
  id: string
  items: Array<{ name: string; path: string }>
  title: string
}

export function RepoList(): JSX.Element {
  const {
    activeRepoPath,
    addRepo,
    pinnedRepoPaths,
    recentRepoPaths,
    reducedMotion,
    removeRepo,
    repos,
    setActiveRepo,
    toggleRepoPin
  } = useRepoStore()
  const [repoQuery, setRepoQuery] = useState('')
  const reduceMotion = useReducedMotionSafe(reducedMotion)
  const listVariants = useMemo(() => fadeSlideIn(reduceMotion), [reduceMotion])

  const sections = useMemo<RepoSection[]>(() => {
    const normalizedQuery = repoQuery.trim().toLowerCase()
    const visibleRepos = repos.filter((repo) =>
      `${repo.name} ${repo.path}`.toLowerCase().includes(normalizedQuery)
    )
    const byPath = new Map(visibleRepos.map((repo) => [repo.path, repo]))
    const pinned = pinnedRepoPaths
      .map((path) => byPath.get(path))
      .filter((repo): repo is { name: string; path: string } => repo !== undefined)
    const recent = recentRepoPaths
      .map((path) => byPath.get(path))
      .filter((repo): repo is { name: string; path: string } => repo !== undefined)
      .filter((repo) => !pinned.some((item) => item.path === repo.path))
    const remaining = visibleRepos.filter(
      (repo) =>
        !pinned.some((item) => item.path === repo.path) &&
        !recent.some((item) => item.path === repo.path)
    )

    return [
      { id: 'pinned', title: 'Pinned', items: pinned },
      { id: 'recent', title: 'Recent', items: recent },
      { id: 'all', title: 'All Repositories', items: remaining }
    ].filter((section) => section.items.length > 0)
  }, [pinnedRepoPaths, recentRepoPaths, repoQuery, repos])

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--ui-text-muted)]">
            Repositories
          </h2>
          <div className="mt-1 text-[11px] text-[var(--ui-text-muted)]">
            Search, pin, and switch context faster.
          </div>
        </div>
        <motion.button
          type="button"
          onClick={addRepo}
          whileTap={scaleTap(reduceMotion)}
          title="Add repository (Ctrl/⌘+O)"
          className="rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs font-semibold text-slate-300 hover:border-[var(--ui-border-soft)] hover:bg-[var(--ui-hover)] hover:text-[var(--ui-text)]"
        >
          + Add
        </motion.button>
      </div>

      <input
        value={repoQuery}
        onChange={(event) => setRepoQuery(event.target.value)}
        placeholder="Search repositories"
        className="mb-3 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--ui-panel)] px-3 py-2 text-xs"
      />

      {repos.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--glass-border)] px-4 py-6 text-xs text-[var(--ui-text-muted)]">
          No repositories yet. Add one to unlock the onboarding and repo overview flow.
        </div>
      )}

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id}>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ui-text-muted)]">
              {section.title}
            </div>
            <div className="space-y-1">
              {section.items.map((repo) => {
                const isActive = activeRepoPath === repo.path
                const isPinned = pinnedRepoPaths.includes(repo.path)

                return (
                  <motion.div
                    key={repo.path}
                    variants={listVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className={cx(
                      'hover-card relative rounded-2xl border px-3 py-3 transition',
                      isActive
                        ? 'border-[var(--ui-accent-border)] bg-[var(--ui-accent-bg)]'
                        : 'border-[var(--glass-border)] bg-[var(--ui-panel)]/35'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => void setActiveRepo(repo.path)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-[var(--ui-text)]">
                          {repo.name}
                        </span>
                        {isActive && (
                          <span className="rounded-full bg-[var(--ui-accent-bg)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-accent)]">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="mt-1 break-all pr-16 text-[11px] leading-5 text-[var(--ui-text-muted)]">
                        {repo.path}
                      </div>
                    </button>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleRepoPin(repo.path)}
                        className="rounded-full border border-[var(--glass-border)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-text-muted)] hover:bg-[var(--ui-hover)]"
                      >
                        {isPinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeRepo(repo.path)}
                        className="rounded-full border border-[var(--glass-border)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-text-muted)] hover:bg-[var(--ui-status-deleted-bg)] hover:text-[var(--ui-status-deleted)]"
                      >
                        Remove
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        ))}

        {repos.length > 0 && sections.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--glass-border)] px-4 py-6 text-xs text-[var(--ui-text-muted)]">
            No repositories match the current search.
          </div>
        )}
      </div>
    </div>
  )
}
