import { useEffect, JSX } from 'react'
import { useRepoStore } from '../../store/useRepoStore'
import { CommitPanel } from './CommitPanel'
import { RemoteConfig } from './RemoteConfig'
import { RepoList } from './RepoList'

type SidebarProps = {
  width?: number
}

export function Sidebar({ width = 256 }: SidebarProps): JSX.Element {
  const { refreshSettings, refreshAccounts, settingsOpen } = useRepoStore()

  useEffect(() => {
    refreshAccounts()
    refreshSettings()
  }, [refreshAccounts, refreshSettings])

  return (
    <aside
      className="glass-panel flex h-full flex-col border-r border-[var(--glass-border)]"
      style={{ width: `${width}px` }}
    >
      <div className="border-b border-[var(--glass-border)] px-4 py-3">
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--ui-text-muted)]">
          GitSwitch
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {settingsOpen ? (
          <div className="text-xs text-[var(--ui-text-muted)]">Settings open</div>
        ) : (
          <>
            <RepoList />
            <RemoteConfig />
            <CommitPanel />
          </>
        )}
      </div>
    </aside>
  )
}
