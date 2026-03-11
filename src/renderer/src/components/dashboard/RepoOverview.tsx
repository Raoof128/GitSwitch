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

const warningClasses: Record<OverviewWarning['tone'], string> = {
  error:
    'border-[var(--ui-status-deleted-border)] bg-[var(--ui-status-deleted-bg)] text-[var(--ui-status-deleted)]',
  info: 'border-[var(--ui-accent-border)] bg-[var(--ui-accent-bg)] text-[var(--ui-accent)]',
  warning:
    'border-[var(--ui-status-modified-border)] bg-[var(--ui-status-modified-bg)] text-[var(--ui-status-modified)]'
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
      <div className="glass-card rounded-[24px] border border-[var(--glass-border)] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--ui-accent)]">
              Repository Overview
            </div>
            <div className="mt-2 text-2xl font-semibold text-[var(--ui-text)]">{repoName}</div>
            <div className="mt-1 break-all text-xs leading-5 text-[var(--ui-text-muted)]">
              {repoPath}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onFetch}
              className="rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-hover)]"
            >
              {isFetching ? 'Fetching…' : 'Fetch'}
            </button>
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="rounded-xl border border-[var(--ui-accent-border)] bg-[var(--ui-accent-bg)] px-3 py-2 text-xs font-semibold text-[var(--ui-accent)] hover:bg-[var(--ui-accent-bg-strong)]"
            >
              Command Palette
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--ui-panel)]/50 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ui-text-muted)]">
              Current Branch
            </div>
            <div className="mt-2 text-lg font-semibold text-[var(--ui-text)]">
              {currentBranch ?? 'Detached HEAD'}
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--ui-panel)]/50 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ui-text-muted)]">
              Ahead / Behind
            </div>
            <div className="mt-2 text-lg font-semibold text-[var(--ui-text)]">
              {stats.ahead} / {stats.behind}
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--ui-panel)]/50 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ui-text-muted)]">
              Working Tree
            </div>
            <div className="mt-2 text-lg font-semibold text-[var(--ui-text)]">
              {stats.changedFiles} changed
            </div>
            <div className="mt-1 text-[11px] text-[var(--ui-text-muted)]">
              {stats.stagedFiles} staged
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--ui-panel)]/50 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ui-text-muted)]">
              Active Account
            </div>
            <div className="mt-2 text-lg font-semibold text-[var(--ui-text)]">
              {activeAccountName ?? 'No account'}
            </div>
            {!canSync && (
              <button
                type="button"
                onClick={onOpenSettingsAccounts}
                className="mt-2 text-[11px] font-semibold text-[var(--ui-accent)] hover:underline"
              >
                Configure account
              </button>
            )}
          </div>
          <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--ui-panel)]/50 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ui-text-muted)]">
              Last Fetch
            </div>
            <div className="mt-2 text-lg font-semibold text-[var(--ui-text)]">
              {formatLastFetch(lastFetchAt)}
            </div>
            <button
              type="button"
              onClick={onOpenSettingsIntegrations}
              className="mt-2 text-[11px] font-semibold text-[var(--ui-accent)] hover:underline"
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
              className={`glass-card rounded-2xl border p-4 ${warningClasses[warning.tone]}`}
            >
              <div className="text-sm font-semibold">{warning.title}</div>
              <div className="mt-1 text-xs leading-5 opacity-90">{warning.detail}</div>
            </div>
          ))}
        </div>
      )}

      {hasChanges && (
        <div className="glass-card rounded-[24px] border border-[var(--glass-border)] p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--ui-status-modified)]">
                Dangerous Actions
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--ui-text-muted)]">
                Destructive Git operations should never be one-click casual. GitSwitch will show a
                confirmation preview before applying them.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onDiscardChanges}
                className="rounded-xl border border-[var(--ui-status-modified-border)] bg-[var(--ui-status-modified-bg)] px-3 py-2 text-xs font-semibold text-[var(--ui-status-modified)] hover:bg-[var(--ui-status-modified-bg)]/80"
              >
                Discard Unstaged
              </button>
              <button
                type="button"
                onClick={onHardReset}
                className="rounded-xl border border-[var(--ui-status-deleted-border)] bg-[var(--ui-status-deleted-bg)] px-3 py-2 text-xs font-semibold text-[var(--ui-status-deleted)] hover:bg-[var(--ui-status-deleted-bg)]/80"
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
