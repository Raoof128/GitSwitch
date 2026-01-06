import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState, JSX } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { DiffView } from './components/diff/DiffView'
import { useRepoStore } from './store/useRepoStore'
import type { DiffMode } from '../../index'
import { useReducedMotionSafe } from './components/motion/motion'
import { FileList } from './components/sidebar/FileList'
import { PullRequestModal } from './components/pr/PullRequestModal'
import { SettingsView } from './components/settings/SettingsView'

function App(): JSX.Element {
  const {
    activeRepoPath,
    status,
    diffText,
    stagedDiffText,
    hasGitHubToken,
    hasGitLabToken,
    reducedMotion,
    settingsOpen,
    accounts,
    refreshStatus,
    loadDiff,
    loadStagedDiff,
    push,
    selectedAccountId,
    setSelectedAccountId,
    applyStatusUpdate,
    lastUpdatedAt,
    commitError,
    addRepo,
    commit,
    generateCommitMessage,
    openPrModal,
    clearCommitResetTimer,
    setSettingsOpen,
    refreshSettings,
    refreshAccounts
  } = useRepoStore()
  const [diffMode, setDiffMode] = useState<DiffMode>('unstaged')
  const reduceMotion = useReducedMotionSafe(reducedMotion)
  const [sidebarWidth, setSidebarWidth] = useState(256)
  const [fileListWidth, setFileListWidth] = useState(288)
  const isResizingSidebar = useRef(false)
  const isResizingFiles = useRef(false)

  const handleSidebarResizeStart = useCallback(() => {
    isResizingSidebar.current = true
  }, [])

  const handleFilesResizeStart = useCallback(() => {
    isResizingFiles.current = true
  }, [])

  const handleDiffModeStaged = useCallback(() => {
    setDiffMode('staged')
  }, [setDiffMode])

  const handleDiffModeUnstaged = useCallback(() => {
    setDiffMode('unstaged')
  }, [setDiffMode])

  const handlePush = useCallback(async (): Promise<void> => {
    await push()
  }, [push])

  const canCreatePr = hasGitHubToken || hasGitLabToken

  const toggleSettings = useCallback(() => {
    setSettingsOpen(!settingsOpen)
  }, [setSettingsOpen, settingsOpen])

  useEffect(() => {
    if (!window.api?.onStatusChange) {
      return
    }
    const unsubscribe = window.api.onStatusChange((payload) => {
      applyStatusUpdate(payload.repoPath, payload.status)
      if (payload.repoPath === activeRepoPath) {
        if (diffMode === 'staged') {
          loadStagedDiff()
        } else {
          loadDiff('unstaged')
        }
      }
    })
    return () => unsubscribe()
  }, [activeRepoPath, applyStatusUpdate, diffMode, loadDiff, loadStagedDiff])

  useEffect(() => {
    if (activeRepoPath) {
      refreshStatus()
      if (diffMode === 'staged') {
        loadStagedDiff()
      } else {
        loadDiff('unstaged')
      }
    }
  }, [activeRepoPath, diffMode, loadDiff, loadStagedDiff, refreshStatus])

  useEffect(() => {
    const handleMove = (event: MouseEvent): void => {
      if (isResizingSidebar.current) {
        const next = Math.min(360, Math.max(220, event.clientX))
        setSidebarWidth(next)
        return
      }

      if (isResizingFiles.current) {
        const next = Math.min(420, Math.max(220, event.clientX - sidebarWidth))
        setFileListWidth(next)
      }
    }

    const stopResize = (): void => {
      isResizingSidebar.current = false
      isResizingFiles.current = false
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', stopResize)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', stopResize)
    }
  }, [sidebarWidth])

  useEffect(() => {
    refreshAccounts()
    refreshSettings()
    return () => {
      clearCommitResetTimer()
    }
  }, [clearCommitResetTimer, refreshAccounts, refreshSettings])

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null
      const isEditable =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable

      if (settingsOpen) {
        if (event.key === 'Escape') {
          setSettingsOpen(false)
        }
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        addRepo()
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key === '1') {
        event.preventDefault()
        setDiffMode('unstaged')
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key === '2') {
        event.preventDefault()
        setDiffMode('staged')
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'r') {
        event.preventDefault()
        refreshStatus()
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'g' && event.shiftKey) {
        event.preventDefault()
        generateCommitMessage()
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && isEditable) {
        event.preventDefault()
        commit()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [addRepo, commit, generateCommitMessage, refreshStatus, setSettingsOpen, settingsOpen])

  // Background Fetch / Dynamic Reconciliation Loop
  useEffect(() => {
    if (!activeRepoPath || !selectedAccountId) return

    // Initial fetch on mount/change
    useRepoStore.getState().fetch()

    const intervalId = setInterval(() => {
      useRepoStore.getState().fetch()
    }, 1000) // 1 second interval

    return () => clearInterval(intervalId)
  }, [activeRepoPath, selectedAccountId])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <Sidebar width={sidebarWidth} />
      <div
        role="separator"
        aria-orientation="vertical"
        className="split-resizer"
        onMouseDown={handleSidebarResizeStart}
      />
      <div className="flex flex-1 flex-col">
        {settingsOpen ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <header className="glass-panel flex items-center justify-between border-b border-[var(--glass-border)] px-4 py-3">
              <div className="text-base font-semibold tracking-wide text-[var(--ui-text)]">
                Settings
              </div>
              <button
                type="button"
                onClick={toggleSettings}
                className="rounded-md border border-[var(--glass-border)] px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-[var(--ui-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ui-accent)]"
              >
                Back
              </button>
            </header>
            <SettingsView />
          </div>
        ) : (
          <>
            <header className="glass-panel flex items-center justify-between border-b border-[var(--glass-border)] px-4 py-3">
              <div>
                <div className="text-base font-semibold tracking-wide text-[var(--ui-text)]">
                  {activeRepoPath ? activeRepoPath.split(/[\\/]/).pop() : 'No repo selected'}
                </div>
                <div className="text-xs text-[var(--ui-text-muted)]">
                  {status?.current
                    ? `Branch: ${status.current}`
                    : 'Select a repository to view status.'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="min-w-[18ch] text-right text-xs tabular-nums text-[var(--ui-text-muted)] whitespace-nowrap">
                  {status ? `Ahead ${status.ahead} / Behind ${status.behind}` : ''}
                </div>
                <AnimatePresence>
                  {lastUpdatedAt && (
                    <motion.span
                      key={lastUpdatedAt}
                      initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.16 }}
                      className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-muted)] px-2 py-0.5 text-[10px] text-[var(--ui-text-muted)]"
                    >
                      Updated
                    </motion.span>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {commitError && (
                    <motion.span
                      key="error"
                      initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }}
                      className="rounded-full border border-[var(--ui-status-deleted-border)] bg-[var(--ui-status-deleted-bg)] px-2 py-0.5 text-[10px] text-[var(--ui-status-deleted)]"
                      title={commitError}
                    >
                      ⚠️ Error
                    </motion.span>
                  )}
                </AnimatePresence>
                <select
                  aria-label="Quick swap account"
                  value={selectedAccountId ?? ''}
                  onChange={(event) => {
                    const value = event.target.value
                    setSelectedAccountId(value ? value : null)
                  }}
                  disabled={accounts.length === 0}
                  className="h-7 rounded-md border border-[var(--glass-border)] bg-[var(--ui-panel)]/70 px-2 text-[10px] font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ui-accent)] disabled:cursor-not-allowed disabled:opacity-50"
                  title="Quick swap account"
                >
                  <option value="">No account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={async () => {
                    await useRepoStore.getState().pull()
                  }}
                  disabled={!activeRepoPath || !selectedAccountId}
                  title="Pull changes"
                  className="rounded-md border border-[var(--glass-border)] px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-[var(--ui-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Pull
                </button>
                <button
                  type="button"
                  onClick={handlePush}
                  disabled={!activeRepoPath || !selectedAccountId}
                  title="Push changes"
                  className="rounded-md border border-[var(--glass-border)] px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-[var(--ui-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Push
                </button>
                {canCreatePr && (
                  <button
                    type="button"
                    onClick={() => openPrModal()}
                    title="Create Pull Request"
                    className="rounded-md border border-[var(--glass-border)] px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-[var(--ui-hover)]"
                  >
                    PR
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleSettings}
                  title="Open Settings"
                  aria-label="Open Settings"
                  className="group rounded-md border border-[var(--glass-border)] px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-[var(--ui-hover)]"
                >
                  <span className="relative inline-flex h-5 w-5 items-center justify-center">
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full border border-[var(--glass-border)] bg-[var(--ui-panel)]/40 opacity-60 transition-opacity group-hover:opacity-100"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full border border-[var(--ui-accent-border)]/70 opacity-70 shadow-[0_0_8px_rgba(136,192,208,0.35)] motion-safe:animate-spin motion-safe:[animation-duration:8s] motion-reduce:animate-none"
                    />
                    <svg
                      className="relative h-3.5 w-3.5 text-[var(--ui-text)] drop-shadow-[0_0_6px_rgba(136,192,208,0.35)]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="3.5" />
                      <path d="M19.4 15a1.8 1.8 0 0 0 .36 2l.05.06a2 2 0 1 1-2.83 2.83l-.06-.05a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.1 1.64V21a2 2 0 1 1-4 0v-.08a1.8 1.8 0 0 0-1.1-1.64 1.8 1.8 0 0 0-2 .36l-.06.05a2 2 0 1 1-2.83-2.83l.05-.06a1.8 1.8 0 0 0 .36-2 1.8 1.8 0 0 0-1.64-1.1H3a2 2 0 1 1 0-4h.08a1.8 1.8 0 0 0 1.64-1.1 1.8 1.8 0 0 0-.36-2l-.05-.06a2 2 0 1 1 2.83-2.83l.06.05a1.8 1.8 0 0 0 2 .36H9.2a1.8 1.8 0 0 0 1.1-1.64V3a2 2 0 1 1 4 0v.08a1.8 1.8 0 0 0 1.1 1.64h.06a1.8 1.8 0 0 0 2-.36l.06-.05a2 2 0 1 1 2.83 2.83l-.05.06a1.8 1.8 0 0 0-.36 2v.06a1.8 1.8 0 0 0 1.64 1.1H21a2 2 0 1 1 0 4h-.08a1.8 1.8 0 0 0-1.64 1.1Z" />
                    </svg>
                    <span
                      aria-hidden="true"
                      className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--ui-accent)] shadow-[0_0_8px_rgba(136,192,208,0.7)] motion-safe:animate-pulse motion-safe:[animation-duration:2.4s] motion-reduce:animate-none"
                    />
                  </span>
                </button>
              </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
              <section
                className="shrink-0 border-r border-[var(--glass-border)] bg-[var(--ui-panel-muted)]"
                style={{ width: `${fileListWidth}px` }}
              >
                <div className="glass-panel glass-panel-muted flex items-center justify-between border-b border-[var(--glass-border)] px-3 py-2">
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--ui-text-muted)]">
                    Files
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={handleDiffModeUnstaged}
                      title="Show unstaged changes (Ctrl/⌘+1)"
                      className={`rounded-md border px-2 py-1 text-[10px] ${
                        diffMode === 'unstaged'
                          ? 'border-[var(--ui-border-soft)] text-[var(--ui-text)]'
                          : 'border-[var(--glass-border)] text-[var(--ui-text-muted)]'
                      }`}
                    >
                      Unstaged
                    </button>
                    <button
                      type="button"
                      onClick={handleDiffModeStaged}
                      title="Show staged changes (Ctrl/⌘+2)"
                      className={`rounded-md border px-2 py-1 text-[10px] ${
                        diffMode === 'staged'
                          ? 'border-[var(--ui-border-soft)] text-[var(--ui-text)]'
                          : 'border-[var(--glass-border)] text-[var(--ui-text-muted)]'
                      }`}
                    >
                      Staged
                    </button>
                  </div>
                </div>
                <FileList />
              </section>

              <div
                role="separator"
                aria-orientation="vertical"
                className="split-resizer"
                onMouseDown={handleFilesResizeStart}
              />
              <main className="flex-1 overflow-y-auto px-4 py-4">
                <DiffView diffText={diffMode === 'staged' ? stagedDiffText : diffText} />
              </main>
            </div>
          </>
        )}
      </div>
      <PullRequestModal />
    </div>
  )
}

export default App
