import { useMemo, useRef, JSX } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { SettingsAccounts } from './SettingsAccounts'
import { SettingsAdvanced } from './SettingsAdvanced'
import { SettingsGeneral } from './SettingsGeneral'
import { SettingsIntegrations } from './SettingsIntegrations'
import { useRepoStore, type SettingsTab } from '../../store/useRepoStore'

export function SettingsView(): JSX.Element {
  const { settingsTab: tab, setSettingsTab } = useRepoStore()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>): void => {
    const tabs: SettingsTab[] = ['general', 'integrations', 'accounts', 'advanced']
    const currentIndex = tabs.indexOf(tab)

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault()
      const nextIndex = (currentIndex + 1) % tabs.length
      setSettingsTab(tabs[nextIndex])
      tabRefs.current[nextIndex]?.focus()
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault()
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length
      setSettingsTab(tabs[prevIndex])
      tabRefs.current[prevIndex]?.focus()
    }
  }

  const content = useMemo(() => {
    switch (tab) {
      case 'integrations':
        return <SettingsIntegrations />
      case 'accounts':
        return <SettingsAccounts />
      case 'advanced':
        return <SettingsAdvanced />
      case 'general':
      default:
        return <SettingsGeneral />
    }
  }, [tab])

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      <aside className="glass-panel glass-panel-muted border-b border-[var(--glass-border)] px-3 py-4 lg:w-48 lg:border-b-0 lg:border-r">
        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--ui-text-muted)]">
          Settings
        </div>
        <nav
          className="grid grid-cols-2 gap-1 text-xs sm:grid-cols-4 lg:grid-cols-1"
          onKeyDown={handleKeyDown}
        >
          {[
            { id: 'general', label: 'General' },
            { id: 'integrations', label: 'Integrations' },
            { id: 'accounts', label: 'Accounts' },
            { id: 'advanced', label: 'Advanced' }
          ].map((item) => (
            <button
              key={item.id}
              ref={(el) => {
                const tabIndex = ['general', 'integrations', 'accounts', 'advanced'].indexOf(
                  item.id
                )
                tabRefs.current[tabIndex] = el
              }}
              type="button"
              onClick={() => setSettingsTab(item.id as SettingsTab)}
              className={`w-full rounded-md px-2 py-1 text-left ${
                tab === item.id
                  ? 'bg-[var(--ui-hover)] text-[var(--ui-text)]'
                  : 'text-[var(--ui-text-muted)] hover:bg-[var(--ui-hover)] hover:text-[var(--ui-text)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">{content}</div>
    </div>
  )
}
