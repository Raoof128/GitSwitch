import { useMemo, useState, type JSX } from 'react'
import type { BranchSummary } from '../../../../index'

type BranchManagerProps = {
  branches: BranchSummary[]
  currentBranch: string | null
  onCheckoutBranch: (branchName: string) => void
  onCreateBranch: (branchName: string, fromBranch?: string) => void
  onOpenCommandPalette: () => void
  recentBranches: string[]
  status: 'idle' | 'loading'
}

export function BranchManager({
  branches,
  currentBranch,
  onCheckoutBranch,
  onCreateBranch,
  onOpenCommandPalette,
  recentBranches,
  status
}: BranchManagerProps): JSX.Element {
  const [branchQuery, setBranchQuery] = useState('')
  const [newBranchName, setNewBranchName] = useState('')

  const filteredBranches = useMemo(() => {
    const normalizedQuery = branchQuery.trim().toLowerCase()
    if (!normalizedQuery) {
      return branches
    }

    return branches.filter((branch) => branch.name.toLowerCase().includes(normalizedQuery))
  }, [branchQuery, branches])

  const handleCreateBranch = (): void => {
    const trimmed = newBranchName.trim()
    if (!trimmed) {
      return
    }
    onCreateBranch(trimmed, currentBranch ?? undefined)
    setNewBranchName('')
  }

  return (
    <section className="glass-card rounded-[24px] border border-[var(--glass-border)] p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--ui-accent)]">
            Branch Workflow
          </div>
          <div className="mt-2 text-lg font-semibold text-[var(--ui-text)]">
            {currentBranch ? `Currently on ${currentBranch}` : 'No named branch checked out'}
          </div>
          <div className="mt-1 text-xs leading-5 text-[var(--ui-text-muted)]">
            Search local branches, jump back to recent work, or create a fresh branch from the
            current HEAD.
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-hover)]"
        >
          Open Palette
        </button>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr),minmax(20rem,0.8fr)]">
        <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--ui-panel)]/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ui-text-muted)]">
              Search Branches
            </div>
            {status === 'loading' && (
              <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--ui-accent)]">
                Updating
              </div>
            )}
          </div>
          <input
            value={branchQuery}
            onChange={(event) => setBranchQuery(event.target.value)}
            placeholder="Search local branches"
            className="mt-3 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--ui-panel)] px-3 py-2 text-sm"
          />

          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
            {filteredBranches.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[var(--glass-border)] px-4 py-5 text-center text-xs text-[var(--ui-text-muted)]">
                No matching branches.
              </div>
            )}
            {filteredBranches.map((branch) => (
              <button
                key={branch.name}
                type="button"
                onClick={() => onCheckoutBranch(branch.name)}
                disabled={branch.current}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left ${
                  branch.current
                    ? 'border-[var(--ui-status-added-border)] bg-[var(--ui-status-added-bg)] text-[var(--ui-status-added)]'
                    : 'border-[var(--glass-border)] bg-[var(--ui-panel)]/50 text-[var(--ui-text)] hover:bg-[var(--ui-hover)]'
                }`}
              >
                <div>
                  <div className="text-sm font-semibold">{branch.name}</div>
                  <div className="mt-1 text-[11px] text-[var(--ui-text-muted)]">
                    {branch.current ? 'Current branch' : 'Checkout branch'}
                  </div>
                </div>
                <span className="rounded-full border border-current/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
                  {branch.current ? 'Active' : 'Switch'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--ui-panel)]/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ui-text-muted)]">
              Create Branch
            </div>
            <div className="mt-2 text-xs leading-5 text-[var(--ui-text-muted)]">
              New branches are created from the current branch unless you switch first.
            </div>
            <input
              value={newBranchName}
              onChange={(event) => setNewBranchName(event.target.value)}
              placeholder="feature/refined-onboarding"
              className="mt-3 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--ui-panel)] px-3 py-2 text-sm"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleCreateBranch()
                }
              }}
            />
            <button
              type="button"
              onClick={handleCreateBranch}
              className="mt-3 rounded-xl border border-[var(--ui-accent-border)] bg-[var(--ui-accent-bg)] px-3 py-2 text-xs font-semibold text-[var(--ui-accent)] hover:bg-[var(--ui-accent-bg-strong)]"
            >
              Create from {currentBranch ?? 'HEAD'}
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--ui-panel)]/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ui-text-muted)]">
              Recent Branches
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {recentBranches.length === 0 && (
                <div className="text-xs text-[var(--ui-text-muted)]">
                  Branch history appears here after you switch branches.
                </div>
              )}
              {recentBranches.map((branchName) => (
                <button
                  key={branchName}
                  type="button"
                  onClick={() => onCheckoutBranch(branchName)}
                  className="rounded-full border border-[var(--glass-border)] px-3 py-1.5 text-xs font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-hover)]"
                >
                  {branchName}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
