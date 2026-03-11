import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import type { BranchSummary, RepoSummary } from '../../../../index'

type CommandPaletteProps = {
  activeRepoPath: string | null
  branches: BranchSummary[]
  onAddRepo: () => void
  onCheckoutBranch: (branchName: string) => void
  onClose: () => void
  onCreateBranch: (branchName: string) => void
  onFetch: () => void
  onGenerateCommit: () => void
  onOpenSettings: () => void
  onPull: () => void
  onPush: () => void
  onRefresh: () => void
  onSelectRepo: (path: string) => void
  open: boolean
  recentBranches: string[]
  repos: RepoSummary[]
}

type CommandItem = {
  group: string
  label: string
  onSelect: () => void
  subtitle?: string
}

export function CommandPalette({
  activeRepoPath,
  branches,
  onAddRepo,
  onCheckoutBranch,
  onClose,
  onCreateBranch,
  onFetch,
  onGenerateCommit,
  onOpenSettings,
  onPull,
  onPush,
  onRefresh,
  onSelectRepo,
  open,
  recentBranches,
  repos
}: CommandPaletteProps): JSX.Element | null {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  const items = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    const actionItems: CommandItem[] = [
      {
        group: 'Actions',
        label: 'Add repository',
        subtitle: 'Open a native folder picker',
        onSelect: onAddRepo
      },
      {
        group: 'Actions',
        label: 'Refresh repository status',
        subtitle: 'Reload status, warnings, and diff context',
        onSelect: onRefresh
      },
      {
        group: 'Actions',
        label: 'Open settings',
        subtitle: 'Accounts, integrations, and advanced controls',
        onSelect: onOpenSettings
      },
      {
        group: 'Actions',
        label: 'Fetch remote state',
        subtitle: 'Refresh ahead/behind without merging',
        onSelect: onFetch
      },
      {
        group: 'Actions',
        label: 'Pull remote changes',
        subtitle: 'Fetch and apply the latest upstream changes',
        onSelect: onPull
      },
      {
        group: 'Actions',
        label: 'Push current branch',
        subtitle: 'Publish the active branch to origin',
        onSelect: onPush
      },
      {
        group: 'Actions',
        label: 'Generate commit message',
        subtitle: 'Draft a commit message from the current diff',
        onSelect: onGenerateCommit
      }
    ]

    const repoItems: CommandItem[] = repos.map((repo) => ({
      group: 'Repositories',
      label: repo.name,
      subtitle: repo.path,
      onSelect: () => onSelectRepo(repo.path)
    }))

    const branchItems: CommandItem[] = branches.map((branch) => ({
      group: branch.current ? 'Current Branch' : 'Branches',
      label: branch.name,
      subtitle: branch.current ? 'Already active' : 'Checkout branch',
      onSelect: () => onCheckoutBranch(branch.name)
    }))

    const recentBranchItems: CommandItem[] = recentBranches.map((branchName) => ({
      group: 'Recent Branches',
      label: branchName,
      subtitle: 'Return to a recently used branch',
      onSelect: () => onCheckoutBranch(branchName)
    }))

    const createBranchItem: CommandItem[] =
      normalizedQuery &&
      !branches.some((branch) => branch.name.toLowerCase() === normalizedQuery) &&
      activeRepoPath
        ? [
            {
              group: 'Create',
              label: `Create branch "${query.trim()}"`,
              subtitle: 'Create a new local branch from the current HEAD',
              onSelect: () => onCreateBranch(query.trim())
            }
          ]
        : []

    return [...actionItems, ...repoItems, ...recentBranchItems, ...branchItems, ...createBranchItem]
      .filter((item) => {
        if (!normalizedQuery) {
          return true
        }

        return `${item.group} ${item.label} ${item.subtitle ?? ''}`
          .toLowerCase()
          .includes(normalizedQuery)
      })
      .slice(0, 18)
  }, [
    activeRepoPath,
    branches,
    onAddRepo,
    onCheckoutBranch,
    onCreateBranch,
    onFetch,
    onGenerateCommit,
    onOpenSettings,
    onPull,
    onPush,
    onRefresh,
    onSelectRepo,
    query,
    recentBranches,
    repos
  ])

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-[rgba(8,15,14,0.75)] px-4 pt-[10vh]"
      onClick={onClose}
    >
      <div
        className="glass-elevated w-full max-w-3xl rounded-[28px] border border-[var(--glass-border)] p-4"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div
              id="command-palette-title"
              className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ui-accent)]"
            >
              Command Palette
            </div>
            <div className="mt-1 text-xs text-[var(--ui-text-muted)]">
              Search repos, branches, and high-frequency actions. Shortcut: Ctrl/Cmd + K
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--glass-border)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ui-text-muted)] hover:bg-[var(--ui-hover)]"
          >
            Close
          </button>
        </div>

        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type an action, repository, or branch"
          className="mt-4 w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--ui-panel)] px-4 py-3 text-sm"
        />

        <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
          {items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--glass-border)] px-4 py-8 text-center text-sm text-[var(--ui-text-muted)]">
              No matching actions or branches.
            </div>
          )}
          {items.map((item, index) => (
            <button
              key={`${item.group}-${item.label}-${index}`}
              type="button"
              onClick={() => {
                item.onSelect()
                onClose()
              }}
              className="flex w-full items-start justify-between rounded-2xl border border-[var(--glass-border)] bg-[var(--ui-panel)]/45 px-4 py-3 text-left hover:bg-[var(--ui-hover)]"
            >
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ui-text-muted)]">
                  {item.group}
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--ui-text)]">{item.label}</div>
                {item.subtitle && (
                  <div className="mt-1 break-all text-xs text-[var(--ui-text-muted)]">
                    {item.subtitle}
                  </div>
                )}
              </div>
              <span className="mt-1 text-xs font-semibold text-[var(--ui-accent)]">Run</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
