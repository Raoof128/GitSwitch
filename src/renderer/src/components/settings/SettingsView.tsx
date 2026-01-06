import { useMemo, useState, useRef, JSX } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { SettingsAccounts } from './SettingsAccounts'
import { SettingsAdvanced } from './SettingsAdvanced'
import { SettingsGeneral } from './SettingsGeneral'
import { SettingsIntegrations } from './SettingsIntegrations'

type SettingsTab = 'accounts' | 'advanced' | 'general' | 'integrations'

export function SettingsView(): JSX.Element {
  const [tab, setTab] = useState<SettingsTab>('general')
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>): void => {
    const tabs: SettingsTab[] = ['general', 'integrations', 'accounts', 'advanced']
    const currentIndex = tabs.indexOf(tab)

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault()
      const nextIndex = (currentIndex + 1) % tabs.length
      setTab(tabs[nextIndex])
      tabRefs.current[nextIndex]?.focus()
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault()
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length
      setTab(tabs[prevIndex])
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
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-48 border-r-2 border-[var(--ui-border)] bg-[var(--ui-panel-muted)] px-3 py-4">
        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--ui-text-muted)]">
          Settings
        </div>
        <nav className="space-y-1 text-xs" onKeyDown={handleKeyDown}>
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
              onClick={() => setTab(item.id as SettingsTab)}
              className={`w-full rounded-md px-2 py-1 text-left ${
                tab === item.id
                  ? 'bg-[var(--ui-hover)] text-white'
                  : 'text-[var(--ui-text-muted)] hover:bg-[var(--ui-hover)] hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="flex-1 overflow-y-auto px-5 py-5">{content}</div>
    </div>
  )
}
