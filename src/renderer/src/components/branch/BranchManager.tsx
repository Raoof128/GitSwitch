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
    <section className="border border-[#2a2a2a] bg-[#141414] p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="label-brutal label-accent">
            Branch Workflow
          </div>
          <div className="mt-2 text-lg font-semibold text-[#e0e0e0]">
            {currentBranch ? `Currently on ${currentBranch}` : 'No named branch checked out'}
          </div>
          <div className="mt-1 text-xs leading-5 text-[#666666]">
            Search local branches, jump back to recent work, or create a fresh branch from the
            current HEAD.
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="btn-neon"
        >
          Open Palette
        </button>
      </div>

      <div className="mt-5 grid gap-4 overflow-hidden xl:grid-cols-[minmax(0,1.2fr),minmax(20rem,0.8fr)]">
        <div className="border border-[#2a2a2a] bg-[#0e0e0e] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="label-brutal">
              Search Branches
            </div>
            {status === 'loading' && (
              <div
                className="label-brutal text-[#00ffaa]"
                style={{ textShadow: '0 0 8px rgba(0, 255, 170, 0.4)' }}
              >
                Updating
              </div>
            )}
          </div>
          <input
            value={branchQuery}
            onChange={(event) => setBranchQuery(event.target.value)}
            placeholder="Search local branches"
            className="mt-3 w-full border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-sm text-[#e0e0e0] placeholder-[#666666] outline-none focus:border-[#00ffaa] focus:shadow-[0_0_8px_rgba(0,255,170,0.3)]"
          />

          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
            {filteredBranches.length === 0 && (
              <div className="border border-dashed border-[#2a2a2a] px-4 py-5 text-center text-xs text-[#666666]">
                No matching branches.
              </div>
            )}
            {filteredBranches.map((branch) => (
              <button
                key={branch.name}
                type="button"
                onClick={() => onCheckoutBranch(branch.name)}
                disabled={branch.current}
                className={`hover-card flex w-full items-center justify-between border px-4 py-3 text-left transition-shadow ${
                  branch.current
                    ? 'border-[#2a2a2a] bg-[#0e0e0e] text-[#00ffaa]'
                    : 'border-[#2a2a2a] bg-[#0e0e0e] text-[#e0e0e0] hover:shadow-[0_0_12px_rgba(0,255,170,0.15)]'
                }`}
                style={
                  branch.current
                    ? {
                        borderLeftWidth: '2px',
                        borderLeftColor: '#00ffaa',
                        boxShadow: 'inset 2px 0 8px -4px rgba(0, 255, 170, 0.3)'
                      }
                    : {}
                }
              >
                <div>
                  <div className="text-sm font-semibold">{branch.name}</div>
                  <div className="mt-1 text-[11px] text-[#666666]">
                    {branch.current ? 'Current branch' : 'Checkout branch'}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                    branch.current
                      ? 'neon-badge neon-badge-green'
                      : 'neon-badge neon-badge-pink'
                  }`}
                >
                  {branch.current ? 'Active' : 'Switch'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="border border-[#2a2a2a] bg-[#0e0e0e] p-4">
            <div className="label-brutal">
              Create Branch
            </div>
            <div className="mt-2 text-xs leading-5 text-[#666666]">
              New branches are created from the current branch unless you switch first.
            </div>
            <input
              value={newBranchName}
              onChange={(event) => setNewBranchName(event.target.value)}
              placeholder="feature/refined-onboarding"
              className="mt-3 w-full border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-sm text-[#e0e0e0] placeholder-[#666666] outline-none focus:border-[#00ffaa] focus:shadow-[0_0_8px_rgba(0,255,170,0.3)]"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleCreateBranch()
                }
              }}
            />
            <button
              type="button"
              onClick={handleCreateBranch}
              className="btn-neon mt-3"
            >
              Create from {currentBranch ?? 'HEAD'}
            </button>
          </div>

          <div className="border border-[#2a2a2a] bg-[#0e0e0e] p-4">
            <div className="label-brutal">
              Recent Branches
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {recentBranches.length === 0 && (
                <div className="text-xs text-[#666666]">
                  Branch history appears here after you switch branches.
                </div>
              )}
              {recentBranches.map((branchName) => (
                <button
                  key={branchName}
                  type="button"
                  onClick={() => onCheckoutBranch(branchName)}
                  className="neon-badge neon-badge-green rounded-full px-3 py-1.5 text-xs font-semibold transition-shadow hover:shadow-[0_0_8px_rgba(0,255,170,0.3)]"
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
