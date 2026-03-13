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
          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">
            Repositories
          </h2>
          <div className="mt-1 text-[11px] text-[#666666]">
            Search, pin, and switch context faster.
          </div>
        </div>
        <motion.button
          type="button"
          onClick={addRepo}
          whileTap={scaleTap(reduceMotion)}
          title="Add repository (Ctrl/⌘+O)"
          className="border border-[#00ffaa] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#00ffaa] transition-shadow hover:shadow-[0_0_20px_rgba(0,255,170,0.15)]"
        >
          + ADD
        </motion.button>
      </div>

      <input
        value={repoQuery}
        onChange={(event) => setRepoQuery(event.target.value)}
        placeholder="Search repositories"
        className="mb-3 w-full border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-xs text-[#e0e0e0] placeholder-[#666666] focus:border-[#00ffaa] focus:shadow-[0_0_12px_rgba(0,255,170,0.15)] focus:outline-none"
      />

      {repos.length === 0 && (
        <div className="border border-dashed border-[#2a2a2a] bg-[#0a0a0a] px-4 py-6 text-xs text-[#666666]">
          No repositories yet. Add one to unlock the onboarding and repo overview flow.
        </div>
      )}

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id}>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">
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
                      'hover-card relative border px-3 py-3 transition',
                      isActive
                        ? 'border-[#00ffaa] bg-[#141414] shadow-[0_0_20px_rgba(0,255,170,0.15)]'
                        : 'border-[#2a2a2a] bg-[#141414]/35'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => void setActiveRepo(repo.path)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-[#e0e0e0]">
                          {repo.name}
                        </span>
                        {isActive && (
                          <span
                            className="rounded-full bg-[#00ffaa]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#00ffaa]"
                            style={{ textShadow: '0 0 8px rgba(0, 255, 170, 0.6)' }}
                          >
                            Active
                          </span>
                        )}
                      </div>
                      <div className="mt-1 break-all pr-16 text-[11px] leading-5 text-[#666666]">
                        {repo.path}
                      </div>
                    </button>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleRepoPin(repo.path)}
                        className="border border-[#2a2a2a] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#666666] transition-shadow hover:border-[#00ffaa] hover:text-[#00ffaa] hover:shadow-[0_0_12px_rgba(0,255,170,0.1)]"
                      >
                        {isPinned ? 'UNPIN' : 'PIN'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeRepo(repo.path)}
                        className="border border-[#2a2a2a] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#666666] transition-shadow hover:border-[#ff3366] hover:text-[#ff3366] hover:shadow-[0_0_12px_rgba(255,51,102,0.15)]"
                      >
                        REMOVE
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        ))}

        {repos.length > 0 && sections.length === 0 && (
          <div className="border border-dashed border-[#2a2a2a] bg-[#0a0a0a] px-4 py-6 text-xs text-[#666666]">
            No repositories match the current search.
          </div>
        )}
      </div>
    </div>
  )
}
