import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react'
import type { DiffMode, GitStatus } from '../../index'
import { BranchManager } from './components/branch/BranchManager'
import { CommandPalette } from './components/command/CommandPalette'
import { OnboardingPanel } from './components/dashboard/OnboardingPanel'
import { OperationBanner } from './components/dashboard/OperationBanner'
import { RepoOverview } from './components/dashboard/RepoOverview'
import { DiffView } from './components/diff/DiffView'
import { PullRequestModal } from './components/pr/PullRequestModal'
import { SettingsView } from './components/settings/SettingsView'
import { ConfirmActionModal } from './components/ui/ConfirmActionModal'
import { FileList } from './components/sidebar/FileList'
import { Sidebar } from './components/sidebar/Sidebar'
import { useRepoStore } from './store/useRepoStore'
import { getEffectiveAccountId } from './store/account-selection'

type ConfirmAction = 'discard' | 'reset' | null

const hasMergeConflicts = (status: GitStatus | null): boolean =>
  Boolean(
    status?.files.some(
      (file) =>
        file.index.includes('U') ||
        file.working_dir.includes('U') ||
        file.index === 'AA' ||
        file.working_dir === 'AA'
    )
  )

function App(): JSX.Element {
  const {
    accounts,
    actionFeedback,
    activeRepoPath,
    activeTask,
    addRepo,
    aiProvider,
    branches,
    branchStatus,
    checkoutBranch,
    clearActionFeedback,
    clearCommitResetTimer,
    commit,
    commitError,
    createBranch,
    defaultAccountId,
    diffText,
    fetch: fetchRemote,
    generateCommitMessage,
    hasAiKey,
    hasGitHubToken,
    hasGitLabToken,
    ignoreWhitespace,
    lastFetchAt,
    lastUpdatedAt,
    loadDiff,
    loadStagedDiff,
    onboardingDismissed,
    openPrModal,
    openSettings,
    pull,
    push,
    recentBranchesByRepo,
    reducedMotion,
    refreshAccounts,
    refreshBranches,
    refreshRemotes,
    refreshSettings,
    refreshStatus,
    remotes,
    repos,
    selectedAccountId,
    setActiveRepo,
    setSettingsOpen,
    settingsOpen,
    stagedDiffText,
    status,
    syncAction,
    syncStatus,
    discardAllChanges,
    hardResetToHead
  } = useRepoStore()
  const [diffMode, setDiffMode] = useState<DiffMode>('unstaged')
  const [sidebarWidth, setSidebarWidth] = useState(296)
  const [fileListWidth, setFileListWidth] = useState(320)
  const [wideLayout, setWideLayout] = useState(() => window.innerWidth >= 1360)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const isResizingSidebar = useRef(false)
  const isResizingFiles = useRef(false)

  const activeAccountId = getEffectiveAccountId(selectedAccountId, defaultAccountId)
  const activeAccountName = useMemo(
    () => accounts.find((account) => account.id === activeAccountId)?.name ?? null,
    [accounts, activeAccountId]
  )
  const repoName = activeRepoPath
    ? (activeRepoPath.split(/[\\/]/).pop() ?? activeRepoPath)
    : 'GitSwitch'
  const hasRepos = repos.length > 0
  const hasAiConfigured = aiProvider === 'offline' || hasAiKey
  const canSync = Boolean(activeRepoPath && activeAccountId)
  const canCreatePr = hasGitHubToken || hasGitLabToken
  const recentBranches = activeRepoPath ? (recentBranchesByRepo[activeRepoPath] ?? []) : []
  const diffPayload = diffMode === 'staged' ? stagedDiffText : diffText
  const repoHasChanges = Boolean(status?.files.length) || Boolean(status?.staged.length)
  const fetching = syncStatus === 'loading' && syncAction === 'fetch'

  const warnings = useMemo(() => {
    const nextWarnings: Array<{
      detail: string
      title: string
      tone: 'error' | 'info' | 'warning'
    }> = []

    if (!activeRepoPath) {
      return nextWarnings
    }

    if (!status?.current) {
      nextWarnings.push({
        tone: 'error',
        title: 'Detached HEAD',
        detail: 'Create or switch to a branch before committing or pushing work.'
      })
    }

    if (!remotes.length) {
      nextWarnings.push({
        tone: 'warning',
        title: 'No remote origin',
        detail: 'Add a remote before fetch, pull, push, and PR creation can work reliably.'
      })
    }

    if (!activeAccountId) {
      nextWarnings.push({
        tone: 'warning',
        title: 'No sync account selected',
        detail: 'Pull, fetch, and push are disabled until an SSH account is chosen.'
      })
    }

    if (status && status.behind > 0) {
      nextWarnings.push({
        tone: 'info',
        title: 'Remote is ahead',
        detail: `Origin is ahead by ${status.behind} commit${status.behind === 1 ? '' : 's'}. Fetch or pull before pushing.`
      })
    }

    if (hasMergeConflicts(status)) {
      nextWarnings.push({
        tone: 'error',
        title: 'Merge conflicts detected',
        detail: 'Resolve conflicted files before committing or switching branches.'
      })
    }

    if (aiProvider === 'cloud' && !hasAiKey) {
      nextWarnings.push({
        tone: 'info',
        title: 'AI unavailable',
        detail: 'Cloud AI is selected, but no API key is configured yet.'
      })
    }

    return nextWarnings
  }, [activeAccountId, activeRepoPath, aiProvider, hasAiKey, remotes, status])

  const handleSidebarResizeStart = useCallback(() => {
    if (!wideLayout) {
      return
    }
    isResizingSidebar.current = true
  }, [wideLayout])

  const handleFilesResizeStart = useCallback(() => {
    if (!wideLayout) {
      return
    }
    isResizingFiles.current = true
  }, [wideLayout])

  const toggleSettings = useCallback(() => {
    if (settingsOpen) {
      setSettingsOpen(false)
      return
    }

    openSettings('general')
  }, [openSettings, setSettingsOpen, settingsOpen])

  const refreshWorkspace = useCallback(async () => {
    await Promise.all([refreshStatus(), refreshRemotes(), refreshBranches()])
    if (diffMode === 'staged') {
      await loadStagedDiff()
    } else {
      await loadDiff('unstaged')
    }
  }, [diffMode, loadDiff, loadStagedDiff, refreshBranches, refreshRemotes, refreshStatus])

  useEffect(() => {
    if (!window.api?.onStatusChange) {
      return
    }

    const unsubscribe = window.api.onStatusChange((payload) => {
      useRepoStore.getState().applyStatusUpdate(payload.repoPath, payload.status)
      if (payload.repoPath === useRepoStore.getState().activeRepoPath) {
        if (diffMode === 'staged') {
          void useRepoStore.getState().loadStagedDiff()
        } else {
          void useRepoStore.getState().loadDiff('unstaged')
        }
      }
    })

    return () => unsubscribe()
  }, [diffMode])

  useEffect(() => {
    if (!activeRepoPath) {
      return
    }

    void refreshWorkspace()
  }, [activeRepoPath, diffMode, ignoreWhitespace, refreshWorkspace])

  useEffect(() => {
    const handleMove = (event: MouseEvent): void => {
      if (isResizingSidebar.current) {
        const next = Math.min(360, Math.max(250, event.clientX))
        setSidebarWidth(next)
        return
      }

      if (isResizingFiles.current) {
        const next = Math.min(420, Math.max(260, event.clientX - sidebarWidth))
        setFileListWidth(next)
      }
    }

    const handleResize = (): void => {
      const isWide = window.innerWidth >= 1360
      setWideLayout(isWide)
      if (!isWide) {
        isResizingSidebar.current = false
        isResizingFiles.current = false
      }
    }

    const stopResize = (): void => {
      isResizingSidebar.current = false
      isResizingFiles.current = false
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', stopResize)
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', stopResize)
      window.removeEventListener('resize', handleResize)
    }
  }, [sidebarWidth])

  useEffect(() => {
    void refreshAccounts()
    void refreshSettings()

    return () => {
      clearCommitResetTimer()
    }
  }, [clearCommitResetTimer, refreshAccounts, refreshSettings])

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null
      const isEditable =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandPaletteOpen((open) => !open)
        return
      }

      if (commandPaletteOpen || confirmAction) {
        if (event.key === 'Escape') {
          setCommandPaletteOpen(false)
          setConfirmAction(null)
        }
        return
      }

      if (settingsOpen) {
        if (event.key === 'Escape') {
          setSettingsOpen(false)
        }
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        void addRepo()
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
        void refreshWorkspace()
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'g' && event.shiftKey) {
        event.preventDefault()
        void generateCommitMessage()
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && isEditable) {
        event.preventDefault()
        void commit()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    addRepo,
    commandPaletteOpen,
    commit,
    confirmAction,
    generateCommitMessage,
    refreshWorkspace,
    setSettingsOpen,
    settingsOpen
  ])

  useEffect(() => {
    if (!activeRepoPath || !activeAccountId) {
      return
    }

    void useRepoStore.getState().fetch({ silent: true })

    const intervalId = setInterval(() => {
      void useRepoStore.getState().fetch({ silent: true })
    }, 30_000)

    return () => clearInterval(intervalId)
  }, [activeAccountId, activeRepoPath])

  return (
    <div className="flex min-h-screen w-screen flex-col overflow-hidden bg-[var(--ui-bg)] text-[var(--ui-text)] xl:flex-row">
      <Sidebar width={wideLayout ? sidebarWidth : undefined} />
      {wideLayout && (
        <div
          role="separator"
          aria-orientation="vertical"
          className="split-resizer hidden xl:block"
          onMouseDown={handleSidebarResizeStart}
        />
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {settingsOpen ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <header className="glass-panel flex items-center justify-between border-b border-[var(--glass-border)] px-4 py-3">
              <div>
                <div className="text-base font-semibold tracking-wide text-[var(--ui-text)]">
                  Settings
                </div>
                <div className="text-xs text-[var(--ui-text-muted)]">
                  General preferences, accounts, integrations, and advanced controls.
                </div>
              </div>
              <button
                type="button"
                onClick={toggleSettings}
                className="rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-hover)]"
              >
                Back to Repo
              </button>
            </header>
            <SettingsView />
          </div>
        ) : (
          <>
            <header className="glass-panel border-b border-[var(--glass-border)] px-4 py-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--ui-accent)]">
                    GitSwitch
                  </div>
                  <div className="mt-2 truncate text-2xl font-semibold text-[var(--ui-text)]">
                    {repoName}
                  </div>
                  <div className="mt-1 text-xs text-[var(--ui-text-muted)]">
                    {status?.current
                      ? `Current branch: ${status.current}`
                      : hasRepos
                        ? 'Select a repository to inspect status, warnings, and diffs.'
                        : 'Add a repository to start onboarding.'}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <AnimatePresence>
                    {lastUpdatedAt && (
                      <motion.span
                        key={lastUpdatedAt}
                        initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.16 }}
                        className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-muted)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]"
                      >
                        Refreshed
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {syncStatus === 'loading' && (
                    <span className="rounded-full border border-[var(--ui-accent-border)] bg-[var(--ui-accent-bg)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-accent)]">
                      {syncAction ?? 'sync'}…
                    </span>
                  )}
                  {commitError && (
                    <span
                      className="rounded-full border border-[var(--ui-status-deleted-border)] bg-[var(--ui-status-deleted-bg)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-status-deleted)]"
                      title={commitError}
                    >
                      Action error
                    </span>
                  )}
                  <select
                    aria-label="Quick swap account"
                    value={selectedAccountId ?? ''}
                    onChange={(event) => {
                      const value = event.target.value
                      useRepoStore.getState().setSelectedAccountId(value ? value : null)
                    }}
                    disabled={accounts.length === 0}
                    className="h-10 rounded-xl border border-[var(--glass-border)] bg-[var(--ui-panel)]/70 px-3 text-xs font-semibold text-[var(--ui-text)] disabled:cursor-not-allowed disabled:opacity-50"
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
                    onClick={() => void fetchRemote()}
                    disabled={!canSync}
                    className="rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Fetch
                  </button>
                  <button
                    type="button"
                    onClick={() => void pull()}
                    disabled={!canSync}
                    className="rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Pull
                  </button>
                  <button
                    type="button"
                    onClick={() => void push()}
                    disabled={!canSync}
                    className="rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Push
                  </button>
                  {canCreatePr && (
                    <button
                      type="button"
                      onClick={() => void openPrModal()}
                      className="rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-hover)]"
                    >
                      PR
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleSettings}
                    className="rounded-xl border border-[var(--ui-accent-border)] bg-[var(--ui-accent-bg)] px-3 py-2 text-xs font-semibold text-[var(--ui-accent)] hover:bg-[var(--ui-accent-bg-strong)]"
                  >
                    Settings
                  </button>
                </div>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto px-4 py-4">
              <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
                <OperationBanner
                  activeTask={activeTask}
                  feedback={actionFeedback}
                  onDismiss={clearActionFeedback}
                />

                {!onboardingDismissed && (
                  <OnboardingPanel
                    hasAccounts={accounts.length > 0}
                    hasAiConfigured={hasAiConfigured}
                    hasRepos={hasRepos}
                    onAddRepo={() => void addRepo()}
                    onDismiss={() => useRepoStore.getState().dismissOnboarding()}
                    onOpenSettings={(tab) => openSettings(tab)}
                  />
                )}

                {!hasRepos && onboardingDismissed && (
                  <div className="glass-card rounded-[24px] border border-dashed border-[var(--glass-border)] px-6 py-10 text-center">
                    <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--ui-accent)]">
                      No Repository Selected
                    </div>
                    <div className="mt-3 text-2xl font-semibold text-[var(--ui-text)]">
                      Add a Git repository to start the real workflow.
                    </div>
                    <div className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--ui-text-muted)]">
                      GitSwitch is strongest when it can show branch health, ahead/behind state,
                      staged changes, diff navigation, and sync trust signals in one place.
                    </div>
                    <button
                      type="button"
                      onClick={() => void addRepo()}
                      className="mt-5 rounded-xl border border-[var(--ui-accent-border)] bg-[var(--ui-accent-bg)] px-4 py-3 text-sm font-semibold text-[var(--ui-accent)] hover:bg-[var(--ui-accent-bg-strong)]"
                    >
                      Add Repository
                    </button>
                  </div>
                )}

                {activeRepoPath && (
                  <>
                    <RepoOverview
                      activeAccountName={activeAccountName}
                      canSync={canSync}
                      currentBranch={status?.current ?? null}
                      hasChanges={repoHasChanges}
                      isFetching={fetching}
                      lastFetchAt={lastFetchAt}
                      onDiscardChanges={() => setConfirmAction('discard')}
                      onFetch={() => void fetchRemote()}
                      onHardReset={() => setConfirmAction('reset')}
                      onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                      onOpenSettingsAccounts={() => openSettings('accounts')}
                      onOpenSettingsIntegrations={() => openSettings('integrations')}
                      repoName={repoName}
                      repoPath={activeRepoPath}
                      stats={{
                        ahead: status?.ahead ?? 0,
                        behind: status?.behind ?? 0,
                        changedFiles: status?.files.length ?? 0,
                        stagedFiles: status?.staged.length ?? 0,
                        warnings
                      }}
                    />

                    <BranchManager
                      branches={branches}
                      currentBranch={status?.current ?? null}
                      onCheckoutBranch={(branchName) => void checkoutBranch(branchName)}
                      onCreateBranch={(branchName, fromBranch) =>
                        void createBranch(branchName, fromBranch)
                      }
                      onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                      recentBranches={recentBranches}
                      status={branchStatus}
                    />

                    <div className="flex min-h-0 flex-col gap-4 xl:flex-row xl:overflow-hidden">
                      <section
                        className="shrink-0 overflow-hidden rounded-[24px] border border-[var(--glass-border)] bg-[var(--ui-panel-muted)]"
                        style={wideLayout ? { width: `${fileListWidth}px` } : undefined}
                      >
                        <div className="glass-panel glass-panel-muted flex flex-col gap-3 border-b border-[var(--glass-border)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-[var(--ui-text-muted)]">
                              Changed Files
                            </div>
                            <div className="mt-1 text-[11px] text-[var(--ui-text-muted)]">
                              Click a file to jump directly to its diff.
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setDiffMode('unstaged')}
                              title="Show unstaged changes (Ctrl/⌘+1)"
                              className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                diffMode === 'unstaged'
                                  ? 'border-[var(--ui-accent-border)] bg-[var(--ui-accent-bg)] text-[var(--ui-accent)]'
                                  : 'border-[var(--glass-border)] text-[var(--ui-text-muted)]'
                              }`}
                            >
                              Unstaged
                            </button>
                            <button
                              type="button"
                              onClick={() => setDiffMode('staged')}
                              title="Show staged changes (Ctrl/⌘+2)"
                              className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                diffMode === 'staged'
                                  ? 'border-[var(--ui-accent-border)] bg-[var(--ui-accent-bg)] text-[var(--ui-accent)]'
                                  : 'border-[var(--glass-border)] text-[var(--ui-text-muted)]'
                              }`}
                            >
                              Staged
                            </button>
                          </div>
                        </div>
                        <FileList mode={diffMode} />
                      </section>

                      {wideLayout && (
                        <div
                          role="separator"
                          aria-orientation="vertical"
                          className="split-resizer hidden xl:block"
                          onMouseDown={handleFilesResizeStart}
                        />
                      )}

                      <section className="min-h-0 flex-1 overflow-visible xl:overflow-y-auto">
                        <DiffView diffText={diffPayload} mode={diffMode} />
                      </section>
                    </div>
                  </>
                )}
              </div>
            </main>
          </>
        )}
      </div>

      <PullRequestModal />
      <CommandPalette
        activeRepoPath={activeRepoPath}
        branches={branches}
        onAddRepo={() => void addRepo()}
        onCheckoutBranch={(branchName) => void checkoutBranch(branchName)}
        onClose={() => setCommandPaletteOpen(false)}
        onCreateBranch={(branchName) => void createBranch(branchName)}
        onFetch={() => void fetchRemote()}
        onGenerateCommit={() => void generateCommitMessage()}
        onOpenSettings={() => openSettings('general')}
        onPull={() => void pull()}
        onPush={() => void push()}
        onRefresh={() => void refreshWorkspace()}
        onSelectRepo={(path) => void setActiveRepo(path)}
        open={commandPaletteOpen}
        recentBranches={recentBranches}
        repos={repos}
      />
      <ConfirmActionModal
        confirmLabel={confirmAction === 'reset' ? 'Hard Reset' : 'Discard Changes'}
        detail={
          confirmAction === 'reset' ? (
            <>
              This will remove <strong>tracked staged and unstaged changes</strong> and restore the
              repository to <code>HEAD</code>. Untracked files are left on disk, but your tracked
              edits will be lost.
            </>
          ) : (
            <>
              This will discard <strong>tracked unstaged changes</strong> and restore the worktree
              to <code>HEAD</code>. Staged files remain staged, and untracked files are preserved.
            </>
          )
        }
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction === 'reset') {
            void hardResetToHead()
          } else if (confirmAction === 'discard') {
            void discardAllChanges()
          }
          setConfirmAction(null)
        }}
        open={confirmAction !== null}
        title={
          confirmAction === 'reset'
            ? 'Hard reset the repository?'
            : 'Discard unstaged worktree changes?'
        }
        tone={confirmAction === 'reset' ? 'danger' : 'warning'}
      />
    </div>
  )
}

export default App
