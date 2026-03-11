import type { JSX } from 'react'

type OverviewWarning = {
  detail: string
  title: string
  tone: 'error' | 'info' | 'warning'
}

type RepoOverviewProps = {
  activeAccountName: string | null
  canSync: boolean
  currentBranch: string | null
  hasChanges: boolean
  isFetching: boolean
  lastFetchAt: number | null
  onDiscardChanges: () => void
  onFetch: () => void
  onHardReset: () => void
  onOpenCommandPalette: () => void
  onOpenSettingsAccounts: () => void
  onOpenSettingsIntegrations: () => void
  repoName: string
  repoPath: string
  stats: {
    ahead: number
    behind: number
    changedFiles: number
    stagedFiles: number
    warnings: OverviewWarning[]
  }
}

const warningCardClasses: Record<OverviewWarning['tone'], string> = {
  error: 'bg-[#141414] border border-l-2 p-4 border-l-[#ff3366]',
  info: 'bg-[#141414] border border-l-2 p-4 border-l-[#00ffaa]',
  warning: 'bg-[#141414] border border-l-2 p-4 border-l-[#ffcc00]'
}

const warningTextClasses: Record<OverviewWarning['tone'], string> = {
  error: 'text-[#ff3366]',
  info: 'text-[#00ffaa]',
  warning: 'text-[#ffcc00]'
}

const formatLastFetch = (timestamp: number | null): string => {
  if (!timestamp) {
    return 'Never fetched in this session'
  }

  const seconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 60) {
    return `${seconds}s ago`
  }

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.round(minutes / 60)
  return `${hours}h ago`
}

export function RepoOverview({
  activeAccountName,
  canSync,
  currentBranch,
  hasChanges,
  isFetching,
  lastFetchAt,
  onDiscardChanges,
  onFetch,
  onHardReset,
  onOpenCommandPalette,
  onOpenSettingsAccounts,
  onOpenSettingsIntegrations,
  repoName,
  repoPath,
  stats
}: RepoOverviewProps): JSX.Element {
  return (
    <section className="space-y-4">
      <div className="border border-[#2a2a2a] bg-[#141414] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="label-brutal label-accent">
              Repository Overview
            </div>
            <div className="mt-2 text-2xl font-bold uppercase tracking-[0.04em] text-[#e0e0e0]">{repoName}</div>
            <div className="mt-1 break-all text-xs leading-5 text-[#666666]">
              {repoPath}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onFetch}
              className="btn-neon"
            >
              {isFetching ? 'Fetching…' : 'Fetch'}
            </button>
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="btn-neon"
            >
              Command Palette
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="border border-[#2a2a2a] bg-[#0e0e0e] p-4">
            <div className="label-brutal">
              Current Branch
            </div>
            <div
              className="mt-2 font-mono text-lg font-semibold text-[#00ffaa]"
              style={{ textShadow: '0 0 8px rgba(0, 255, 170, 0.5)' }}
            >
              {currentBranch ?? 'Detached HEAD'}
            </div>
          </div>
          <div className="border border-[#2a2a2a] bg-[#0e0e0e] p-4">
            <div className="label-brutal">
              Ahead / Behind
            </div>
            <div className="mt-2 font-mono text-lg font-semibold">
              <span
                className="text-[#00ffaa]"
                style={{ textShadow: '0 0 8px rgba(0, 255, 170, 0.4)' }}
              >
                ↑{stats.ahead}
              </span>
              {' '}
              <span
                className="text-[#ff3366]"
                style={{ textShadow: '0 0 8px rgba(255, 51, 102, 0.4)' }}
              >
                ↓{stats.behind}
              </span>
            </div>
          </div>
          <div className="border border-[#2a2a2a] bg-[#0e0e0e] p-4">
            <div className="label-brutal">
              Working Tree
            </div>
            <div
              className="mt-2 font-mono text-lg font-semibold text-[#e0e0e0]"
              style={{ textShadow: '0 0 6px rgba(224, 224, 224, 0.3)' }}
            >
              {stats.changedFiles} changed
            </div>
            <div className="mt-1 text-[11px] text-[#666666]">
              {stats.stagedFiles} staged
            </div>
          </div>
          <div className="border border-[#2a2a2a] bg-[#0e0e0e] p-4">
            <div className="label-brutal">
              Active Account
            </div>
            <div
              className="mt-2 font-mono text-lg font-semibold text-[#e0e0e0]"
              style={{ textShadow: '0 0 6px rgba(224, 224, 224, 0.3)' }}
            >
              {activeAccountName ?? 'No account'}
            </div>
            {!canSync && (
              <button
                type="button"
                onClick={onOpenSettingsAccounts}
                className="mt-2 text-[11px] font-semibold text-[#00ffaa] hover:underline"
              >
                Configure account
              </button>
            )}
          </div>
          <div className="border border-[#2a2a2a] bg-[#0e0e0e] p-4">
            <div className="label-brutal">
              Last Fetch
            </div>
            <div
              className="mt-2 font-mono text-lg font-semibold text-[#e0e0e0]"
              style={{ textShadow: '0 0 6px rgba(224, 224, 224, 0.3)' }}
            >
              {formatLastFetch(lastFetchAt)}
            </div>
            <button
              type="button"
              onClick={onOpenSettingsIntegrations}
              className="mt-2 text-[11px] font-semibold text-[#00ffaa] hover:underline"
            >
              Review AI setup
            </button>
          </div>
        </div>
      </div>

      {stats.warnings.length > 0 && (
        <div className="grid gap-3 xl:grid-cols-2">
          {stats.warnings.map((warning) => (
            <div
              key={`${warning.title}-${warning.detail}`}
              className={warningCardClasses[warning.tone]}
            >
              <div className={`text-sm font-semibold ${warningTextClasses[warning.tone]}`}>{warning.title}</div>
              <div className="mt-1 text-xs leading-5 text-[#e0e0e0] opacity-90">{warning.detail}</div>
            </div>
          ))}
        </div>
      )}

      {hasChanges && (
        <div className="border border-[#2a2a2a] bg-[#141414] p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div
                className="label-brutal text-[#ff3366]"
                style={{ textShadow: '0 0 8px rgba(255, 51, 102, 0.4)' }}
              >
                Dangerous Actions
              </div>
              <div className="mt-2 text-sm leading-6 text-[#666666]">
                Destructive Git operations should never be one-click casual. GitSwitch will show a
                confirmation preview before applying them.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onDiscardChanges}
                className="btn-neon btn-neon-yellow"
              >
                Discard Unstaged
              </button>
              <button
                type="button"
                onClick={onHardReset}
                className="btn-neon btn-neon-pink"
              >
                Hard Reset to HEAD
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
