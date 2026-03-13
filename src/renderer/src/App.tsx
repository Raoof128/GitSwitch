import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState, type JSX } from 'react'
import type { DiffMode, GitStatus } from '../../index'
import { BranchManager } from './components/branch/BranchManager'
import { CommandPalette } from './components/command/CommandPalette'
import { OnboardingPanel } from './components/dashboard/OnboardingPanel'
import { OperationBanner } from './components/dashboard/OperationBanner'
import { RepoOverview } from './components/dashboard/RepoOverview'
import { DiffView } from './components/diff/DiffView'
import { PullRequestModal } from './components/pr/PullRequestModal'
import { SettingsView } from './components/settings/SettingsView'
import { CommitPanel } from './components/sidebar/CommitPanel'
import { FileList } from './components/sidebar/FileList'
import { RemoteConfig } from './components/sidebar/RemoteConfig'
import { RepoList } from './components/sidebar/RepoList'
import { ConfirmActionModal } from './components/ui/ConfirmActionModal'
import { useRepoStore } from './store/useRepoStore'
import { getEffectiveAccountId } from './store/account-selection'

type ConfirmAction = 'discard' | 'reset' | null
type RailTab = 'changes' | 'branches' | 'repos' | 'settings'

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

/* ── SVG Rail Icons (20x20) ──────────────────────────────────── */

function IconChanges({ active }: { active: boolean }): JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke={active ? '#00ffaa' : '#666'}
      strokeWidth="1.5"
      strokeLinecap="square"
    >
      <rect x="4" y="2" width="12" height="16" />
      <line x1="7" y1="6" x2="13" y2="6" />
      <line x1="7" y1="9" x2="13" y2="9" />
      <line x1="7" y1="12" x2="11" y2="12" />
    </svg>
  )
}

function IconBranches({ active }: { active: boolean }): JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke={active ? '#00ffaa' : '#666'}
      strokeWidth="1.5"
      strokeLinecap="square"
    >
      <circle cx="6" cy="5" r="2" />
      <circle cx="6" cy="15" r="2" />
      <circle cx="14" cy="9" r="2" />
      <line x1="6" y1="7" x2="6" y2="13" />
      <path d="M6 8 C6 9, 10 9, 14 9" />
    </svg>
  )
}

function IconRepos({ active }: { active: boolean }): JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke={active ? '#00ffaa' : '#666'}
      strokeWidth="1.5"
      strokeLinecap="square"
    >
      <path d="M2 5 L10 2 L18 5 L10 8 Z" />
      <path d="M2 5 L2 14 L10 17 L18 14 L18 5" />
      <line x1="10" y1="8" x2="10" y2="17" />
    </svg>
  )
}

function IconSettings({ active }: { active: boolean }): JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke={active ? '#00ffaa' : '#666'}
      strokeWidth="1.5"
      strokeLinecap="square"
    >
      <circle cx="10" cy="10" r="3" />
      <path d="M10 2 L10 4 M10 16 L10 18 M2 10 L4 10 M16 10 L18 10 M4.2 4.2 L5.6 5.6 M14.4 14.4 L15.8 15.8 M15.8 4.2 L14.4 5.6 M5.6 14.4 L4.2 15.8" />
    </svg>
  )
}

/* ── Main App ────────────────────────────────────────────────── */

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
  const [wideLayout, setWideLayout] = useState(() => window.innerWidth >= 1360)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [activeTab, setActiveTab] = useState<RailTab>('changes')

  const activeAccountId = getEffectiveAccountId(selectedAccountId, defaultAccountId)
  const activeAccountName = useMemo(
    () => accounts.find((account) => account.id === activeAccountId)?.name ?? null,
    [accounts, activeAccountId]
  )
  const repoName = activeRepoPath
    ? (activeRepoPath.split(/[\\/]/).pop() ?? activeRepoPath)
    : 'GITSWITCH'
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

  /* ── Sync settingsOpen with activeTab ── */
  const switchTab = useCallback(
    (tab: RailTab) => {
      setActiveTab(tab)
      if (tab === 'settings' && !settingsOpen) {
        openSettings('general')
      } else if (tab !== 'settings' && settingsOpen) {
        setSettingsOpen(false)
      }
    },
    [openSettings, setSettingsOpen, settingsOpen]
  )

  useEffect(() => {
    if (settingsOpen && activeTab !== 'settings') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync store-driven tab switch
      setActiveTab('settings')
    }
  }, [settingsOpen, activeTab])

  const refreshWorkspace = useCallback(async () => {
    await Promise.all([refreshStatus(), refreshRemotes(), refreshBranches()])
    if (diffMode === 'staged') {
      await loadStagedDiff()
    } else {
      await loadDiff('unstaged')
    }
  }, [diffMode, loadDiff, loadStagedDiff, refreshBranches, refreshRemotes, refreshStatus])

  /* ── File watcher ── */
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

  /* ── Refresh on repo / diff-mode change ── */
  useEffect(() => {
    if (!activeRepoPath) {
      return
    }

    void refreshWorkspace()
  }, [activeRepoPath, diffMode, ignoreWhitespace, refreshWorkspace])

  /* ── Resize listener ── */
  useEffect(() => {
    const handleResize = (): void => {
      setWideLayout(window.innerWidth >= 1360)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  /* ── Initial load ── */
  useEffect(() => {
    void refreshAccounts()
    void refreshSettings()

    return () => {
      clearCommitResetTimer()
    }
  }, [clearCommitResetTimer, refreshAccounts, refreshSettings])

  /* ── Keyboard shortcuts ── */
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
          switchTab('changes')
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
    settingsOpen,
    switchTab
  ])

  /* ── Auto-fetch interval ── */
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

  /* ── Render ── */
  return (
    <div className="flex h-screen w-screen flex-col-reverse overflow-hidden bg-[var(--ui-bg)] text-[var(--ui-text)] sm:flex-row">
      {/* ══════════ ACTIVITY RAIL ══════════ */}
      <nav className="activity-rail" role="tablist">
        <div className="flex flex-col items-center gap-1">
          {[
            { tab: 'changes' as RailTab, icon: IconChanges, label: 'Changes' },
            { tab: 'branches' as RailTab, icon: IconBranches, label: 'Branches' },
            { tab: 'repos' as RailTab, icon: IconRepos, label: 'Repos' },
            { tab: 'settings' as RailTab, icon: IconSettings, label: 'Settings' }
          ].map(({ tab, icon: Icon, label }) => (
            <button
              key={tab}
              type="button"
              title={label}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => switchTab(tab)}
              className={`rail-btn ${activeTab === tab ? 'active' : ''}`}
            >
              <Icon active={activeTab === tab} />
            </button>
          ))}
        </div>
      </nav>

      {/* ══════════ MAIN COLUMN (Top Bar + Canvas) ══════════ */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* ── TOP BAR ── */}
        <header className="top-bar justify-between">
          {/* Left: repo name + branch chip */}
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="label-brutal label-accent truncate text-sm">{repoName}</span>

            {status?.current && (
              <span className="neon-badge neon-badge-green truncate" style={{ maxWidth: 180 }}>
                {status.current}
              </span>
            )}

            <AnimatePresence>
              {lastUpdatedAt && (
                <motion.span
                  key={lastUpdatedAt}
                  initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  className="neon-badge neon-badge-green"
                >
                  Refreshed
                </motion.span>
              )}
            </AnimatePresence>

            {syncStatus === 'loading' && (
              <span className="neon-badge neon-badge-yellow">{syncAction ?? 'sync'}...</span>
            )}

            {commitError && (
              <span className="neon-badge neon-badge-pink" title={commitError}>
                Action error
              </span>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Quick swap account"
              value={selectedAccountId ?? ''}
              onChange={(event) => {
                const value = event.target.value
                useRepoStore.getState().setSelectedAccountId(value ? value : null)
              }}
              disabled={accounts.length === 0}
              className="h-8 border border-[var(--ui-border-soft)] bg-[var(--ui-panel)] px-2 text-xs uppercase tracking-wider text-[var(--ui-text)] disabled:cursor-not-allowed disabled:opacity-50"
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
              className="btn-neon h-8 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Fetch
            </button>
            <button
              type="button"
              onClick={() => void pull()}
              disabled={!canSync}
              className="btn-neon h-8 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Pull
            </button>
            <button
              type="button"
              onClick={() => void push()}
              disabled={!canSync}
              className="btn-neon h-8 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Push
            </button>

            {canCreatePr && (
              <button
                type="button"
                onClick={() => void openPrModal()}
                className="btn-neon btn-neon-pink h-8"
              >
                PR
              </button>
            )}

            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              title="Command Palette (Ctrl/⌘+K)"
              className="flex h-8 items-center justify-center border border-[var(--ui-border-soft)] bg-[var(--ui-panel)] px-2.5 text-[0.625rem] font-bold uppercase tracking-widest text-[var(--ui-text-muted)]"
            >
              ⌘K
            </button>
          </div>
        </header>

        {/* ══════════ MAIN CANVAS ══════════ */}
        <main className="relative flex min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* ── CHANGES TAB ── */}
            {activeTab === 'changes' && (
              <motion.div
                key="changes"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.08 }}
                className="flex h-full w-full flex-col overflow-y-auto bg-[var(--ui-bg)]"
              >
                <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4 px-4 py-4">
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
                    <div className="border border-dashed border-[var(--ui-border-soft)] bg-[var(--ui-panel)] px-6 py-10 text-center">
                      <div className="label-brutal label-accent">No Repository Selected</div>
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
                        className="btn-neon mt-5 py-2.5 px-4"
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

                      <div className={`flex min-h-0 gap-4 ${wideLayout ? 'flex-row' : 'flex-col'}`}>
                        {/* Left column: files + commit */}
                        <div
                          className="flex shrink-0 flex-col overflow-hidden"
                          style={{
                            width: wideLayout ? 'min(360px, 100%)' : '100%'
                          }}
                        >
                          {/* File list section */}
                          <section className="shrink-0 overflow-hidden border border-[var(--ui-border)] bg-[var(--ui-panel)]">
                            <div className="flex flex-col gap-3 border-b border-[var(--ui-border)] bg-[var(--ui-panel-muted)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <div className="label-brutal">Changed Files</div>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => setDiffMode('unstaged')}
                                  title="Show unstaged changes (Ctrl/⌘+1)"
                                  aria-pressed={diffMode === 'unstaged'}
                                  className={`neon-badge ${diffMode === 'unstaged' ? 'neon-badge-green' : 'border-[var(--ui-border-soft)] text-[var(--ui-text-muted)]'}`}
                                >
                                  Unstaged
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDiffMode('staged')}
                                  title="Show staged changes (Ctrl/⌘+2)"
                                  aria-pressed={diffMode === 'staged'}
                                  className={`neon-badge ${diffMode === 'staged' ? 'neon-badge-green' : 'border-[var(--ui-border-soft)] text-[var(--ui-text-muted)]'}`}
                                >
                                  Staged
                                </button>
                              </div>
                            </div>
                            <FileList mode={diffMode} />
                          </section>

                          {/* Commit section — always visible below files */}
                          <section className="mt-0 shrink-0 overflow-y-auto border border-[var(--ui-border)] border-t-0 bg-[var(--ui-panel-muted)]">
                            <div className="border-b border-[var(--ui-border)] px-3 py-2">
                              <span className="label-brutal label-accent">Commit</span>
                            </div>
                            <div className="px-1 py-1">
                              <CommitPanel />
                            </div>
                            <div className="px-1 pb-2">
                              <RemoteConfig />
                            </div>
                          </section>
                        </div>

                        {/* Diff view section */}
                        <section className="min-h-0 flex-1 overflow-visible xl:overflow-y-auto">
                          <DiffView diffText={diffPayload} mode={diffMode} />
                        </section>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── BRANCHES TAB ── */}
            {activeTab === 'branches' && (
              <motion.div
                key="branches"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.08 }}
                className="h-full w-full overflow-y-auto bg-[var(--ui-bg)] px-4 py-4"
              >
                <div className="mx-auto max-w-[1680px]">
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
                </div>
              </motion.div>
            )}

            {/* ── REPOS TAB ── */}
            {activeTab === 'repos' && (
              <motion.div
                key="repos"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.08 }}
                className="h-full w-full overflow-y-auto bg-[var(--ui-bg)]"
              >
                <div className="flex items-center justify-between border-b border-[var(--ui-border)] bg-[var(--ui-panel)] px-4 py-3">
                  <span className="label-brutal">Repositories</span>
                  <button type="button" onClick={() => void addRepo()} className="btn-neon">
                    Add Repo
                  </button>
                </div>
                <div className="px-0">
                  <RepoList />
                </div>
              </motion.div>
            )}

            {/* ── SETTINGS TAB ── */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.08 }}
                className="flex h-full w-full flex-col overflow-hidden bg-[var(--ui-bg)]"
              >
                <div className="flex items-center justify-between border-b border-[var(--ui-border)] bg-[var(--ui-panel)] px-4 py-3">
                  <div>
                    <span className="label-brutal">Settings</span>
                    <div className="mt-0.5 text-[0.625rem] text-[var(--ui-text-muted)]">
                      General preferences, accounts, integrations, and advanced controls.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchTab('changes')}
                    className="flex h-8 items-center border border-[var(--ui-border-soft)] bg-[var(--ui-panel)] px-3 text-[0.625rem] font-bold uppercase tracking-widest text-[var(--ui-text-muted)]"
                  >
                    Back to Repo
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <SettingsView />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* ══════════ OVERLAYS ══════════ */}
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
