import { JSX } from 'react'
import { useRepoStore } from '../../store/useRepoStore'
import { CommitPanel } from './CommitPanel'
import { RemoteConfig } from './RemoteConfig'
import { RepoList } from './RepoList'

type SidebarProps = {
  width?: number
}

export function Sidebar({ width }: SidebarProps): JSX.Element {
  const { settingsOpen } = useRepoStore()

  return (
    <aside
      className="glass-panel flex h-full flex-col border-b border-[var(--glass-border)] xl:border-b-0 xl:border-r"
      style={width !== undefined ? { width: `${width}px` } : undefined}
    >
      <div className="border-b border-[var(--glass-border)] px-4 py-3">
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--ui-text-muted)]">
          GitSwitch
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {settingsOpen ? (
          <div className="rounded-2xl border border-dashed border-[var(--glass-border)] px-4 py-6 text-xs leading-6 text-[var(--ui-text-muted)]">
            Settings are open in the main panel. Your repo rail, remotes, and commit tools return as
            soon as you leave settings.
          </div>
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
