import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  Account,
  BranchSummary,
  DiffMode,
  GitStatus,
  PublishStatus,
  PullRequestOptions,
  RepoSummary,
  SecretsResult,
  SettingsUpdateInput
} from '../../../index'
import { getEffectiveAccountId } from './account-selection'

export type SettingsTab = 'accounts' | 'advanced' | 'general' | 'integrations'

type FeedbackTone = 'error' | 'info' | 'success' | 'warning'
type DiffViewType = 'split' | 'unified'
type RecentBranchesByRepo = Record<string, string[]>

type ActionFeedback = {
  tone: FeedbackTone
  title: string
  detail?: string
  suggestion?: string
  ts: number
}

type ActiveTask = {
  label: string
  detail?: string
  startedAt: number
}

type RepoState = {
  accounts: Account[]
  activeRepoPath: string | null
  actionFeedback: ActionFeedback | null
  activeTask: ActiveTask | null
  addAccount: (name: string, privateKey: string) => Promise<void>
  addRepo: () => Promise<void>
  addRepoPath: (path: string) => Promise<boolean>
  addToIgnore: (filePath: string) => Promise<{ ok: boolean; error?: string }>
  aiCloudModel: string
  aiLocalModel: string
  aiLocalUrl: string
  aiProvider: 'offline' | 'local' | 'cloud'
  aiPersona: 'standard' | 'cybersecurity'
  aiRedactionEnabled: boolean
  aiTimeoutSec: number
  applyStatusUpdate: (repoPath: string, status: GitStatus) => void
  autoPush: boolean
  branchStatus: 'idle' | 'loading'
  branches: BranchSummary[]
  checkoutBranch: (branchName: string) => Promise<boolean>
  clearActionFeedback: () => void
  clearAiKey: () => Promise<void>
  clearCommitResetTimer: () => void
  clearGitHubToken: () => Promise<void>
  clearGitLabToken: () => Promise<void>
  closePrModal: () => void
  commit: () => Promise<void>
  commitBody: string
  commitError: string | null
  commitStatus: 'idle' | 'loading' | 'success' | 'error'
  commitTitle: string
  createBranch: (branchName: string, fromBranch?: string) => Promise<boolean>
  defaultAccountId: string | null
  defaultBaseBranch: 'main' | 'master'
  deleteAccount: (id: string) => Promise<void>
  diffLimitKb: number
  diffLimitLines: number
  diffText: string
  diffViewType: DiffViewType
  dismissOnboarding: () => void
  discardAllChanges: () => Promise<boolean>
  fetch: (options?: { silent?: boolean }) => Promise<void>
  focusedDiffFile: string | null
  generateCommitMessage: () => Promise<void>
  generateStatus: 'idle' | 'loading'
  hardResetToHead: () => Promise<boolean>
  hasAiKey: boolean
  hasGitHubToken: boolean
  hasGitLabToken: boolean
  ignoreWhitespace: boolean
  lastFetchAt: number | null
  lastUpdatedAt: number | null
  likeApp: boolean
  loadDiff: (mode?: DiffMode) => Promise<void>
  loadStagedDiff: () => Promise<void>
  onboardingDismissed: boolean
  openPrModal: (title?: string, body?: string) => Promise<void>
  openSettings: (tab?: SettingsTab) => void
  pinnedRepoPaths: string[]
  prForm: PullRequestOptions
  prModalOpen: boolean
  prResult: { status: 'idle' | 'loading' | 'success' | 'error'; message?: string; url?: string }
  publishStatus: PublishStatus | null
  pull: () => Promise<boolean>
  push: () => Promise<boolean>
  recentBranchesByRepo: RecentBranchesByRepo
  recentRepoPaths: string[]
  reducedMotion: boolean
  refreshAccounts: () => Promise<void>
  refreshBranches: () => Promise<void>
  refreshPublishStatus: () => Promise<void>
  refreshRemotes: () => Promise<void>
  refreshSettings: () => Promise<void>
  refreshStatus: () => Promise<void>
  removeRepo: (path: string) => Promise<void>
  remotes: Array<{ name: string; url: string }>
  renameAccount: (id: string, name: string) => Promise<void>
  repos: RepoSummary[]
  saveAiKey: (key: string) => Promise<void>
  saveGitHubToken: (token: string) => Promise<void>
  saveGitLabToken: (token: string) => Promise<void>
  selectedAccountId: string | null
  setActiveRepo: (path: string) => Promise<void>
  setCommitBody: (body: string) => void
  setCommitTitle: (title: string) => void
  setDiffViewType: (viewType: DiffViewType) => void
  setFocusedDiffFile: (filePath: string | null) => void
  setIgnoreWhitespace: (value: boolean) => void
  setRemoteOrigin: (url: string) => Promise<{ ok: boolean; error?: string }>
  setSelectedAccountId: (id: string | null) => void
  setSettingsOpen: (open: boolean) => void
  setSettingsTab: (tab: SettingsTab) => void
  settingsOpen: boolean
  settingsTab: SettingsTab
  stageAll: () => Promise<void>
  stageStatus: 'idle' | 'loading'
  stagedDiffText: string
  stagedSummary: {
    count: number
    files: string[]
  }
  status: GitStatus | null
  statusRepoPath: string | null
  strictHostKeyChecking: boolean
  submitPullRequest: () => Promise<void>
  syncAction: 'fetch' | 'pull' | 'push' | null
  syncStatus: 'idle' | 'loading'
  theme: 'dark'
  toggleRepoPin: (path: string) => void
  updatePrForm: (input: Partial<PullRequestOptions>) => void
  updateSettings: (input: SettingsUpdateInput) => Promise<void>
}

const UI_STORAGE_KEY = 'gitswitch-ui'
const MAX_RECENT_BRANCHES = 6
const MAX_RECENT_REPOS = 10
const EMPTY_STAGED_SUMMARY = { count: 0, files: [] }

const getRepoName = (path: string): string => {
  const segments = path.split(/[\\/]/)
  return segments[segments.length - 1] || path
}

const bumpRecent = (items: string[], value: string, limit: number): string[] =>
  [value, ...items.filter((item) => item !== value)].slice(0, limit)

const updateRecentBranches = (
  current: RecentBranchesByRepo,
  repoPath: string,
  branchName: string
): RecentBranchesByRepo => ({
  ...current,
  [repoPath]: bumpRecent(current[repoPath] ?? [], branchName, MAX_RECENT_BRANCHES)
})

let commitResetTimer: ReturnType<typeof setTimeout> | null = null

const clearCommitTimer = (): void => {
  if (commitResetTimer) {
    clearTimeout(commitResetTimer)
    commitResetTimer = null
  }
}

const assertSecretResult = (
  result: SecretsResult,
  fallbackMessage: string
): SecretsResult['secrets'] => {
  if (!result.ok) {
    throw new Error(result.error ?? fallbackMessage)
  }
  return result.secrets
}

const normalizeErrorMessage = (error: unknown, fallbackMessage: string): string =>
  error instanceof Error && error.message ? error.message : fallbackMessage

const getActionSuggestion = (message: string, fallback?: string): string | undefined => {
  const normalized = message.toLowerCase()

  if (normalized.includes('not a git repository') || normalized.includes('folder is not a git')) {
    return 'Pick a folder that already contains a .git directory.'
  }
  if (normalized.includes('permission denied') || normalized.includes('ssh key')) {
    return 'Select a default SSH account in Settings -> Accounts, then retry the remote action.'
  }
  if (normalized.includes('authentication failed')) {
    return 'Verify the selected SSH key or saved provider token before retrying.'
  }
  if (normalized.includes('behind the remote') || normalized.includes('pull first')) {
    return 'Pull the latest changes, resolve any conflicts, and then retry the push.'
  }
  if (normalized.includes('detached head')) {
    return 'Create or switch to a named branch before retrying this action.'
  }
  if (normalized.includes('remote') || normalized.includes('origin')) {
    return 'Review the remote origin URL in the sidebar before retrying.'
  }
  if (normalized.includes('conflict')) {
    return 'Resolve merge conflicts in your working tree and retry once the repo is clean.'
  }
  if (normalized.includes('account') || normalized.includes('no ssh')) {
    return 'Choose a default SSH account in Settings -> Accounts or use the quick account switcher.'
  }
  if (
    normalized.includes('ai') ||
    normalized.includes('api key') ||
    normalized.includes('provider')
  ) {
    return 'Check Settings -> Integrations and confirm the active AI provider is configured.'
  }

  return fallback
}

const buildFeedback = (
  tone: FeedbackTone,
  title: string,
  detail?: string,
  suggestion?: string
): ActionFeedback => ({
  tone,
  title,
  detail,
  suggestion,
  ts: Date.now()
})

export const useRepoStore = create<RepoState>()(
  persist(
    (set, get) => {
      const beginTask = (label: string, detail?: string): void => {
        set({
          activeTask: {
            label,
            detail,
            startedAt: Date.now()
          }
        })
      }

      const setFeedback = (
        tone: FeedbackTone,
        title: string,
        detail?: string,
        suggestion?: string
      ): void => {
        set({
          activeTask: null,
          actionFeedback: buildFeedback(tone, title, detail, suggestion)
        })
      }

      const setErrorFeedback = (
        title: string,
        error: unknown,
        fallbackMessage: string,
        fallbackSuggestion?: string
      ): void => {
        const detail = normalizeErrorMessage(error, fallbackMessage)
        setFeedback('error', title, detail, getActionSuggestion(detail, fallbackSuggestion))
      }

      const applyStatusState = (repoPath: string, status: GitStatus): void => {
        const previous = get().status
        const hasMeaningfulChange =
          !previous ||
          previous.current !== status.current ||
          previous.ahead !== status.ahead ||
          previous.behind !== status.behind ||
          previous.files.length !== status.files.length ||
          previous.staged.length !== status.staged.length

        set({
          status,
          statusRepoPath: repoPath,
          stagedSummary: {
            count: status.staged.length,
            files: status.staged.slice(0, 5)
          },
          lastUpdatedAt: hasMeaningfulChange ? Date.now() : get().lastUpdatedAt
        })
      }

      const clearRepoSurface = (): void => {
        set({
          branches: [],
          diffText: '',
          focusedDiffFile: null,
          publishStatus: null,
          remotes: [],
          stagedDiffText: '',
          stagedSummary: EMPTY_STAGED_SUMMARY,
          status: null,
          statusRepoPath: null
        })
      }

      return {
        repos: [],
        pinnedRepoPaths: [],
        recentRepoPaths: [],
        recentBranchesByRepo: {},
        activeRepoPath: null,
        status: null,
        statusRepoPath: null,
        syncAction: null,
        syncStatus: 'idle',
        diffText: '',
        stagedDiffText: '',
        diffViewType: 'split',
        ignoreWhitespace: false,
        focusedDiffFile: null,
        stagedSummary: EMPTY_STAGED_SUMMARY,
        commitTitle: '',
        commitBody: '',
        commitError: null,
        commitStatus: 'idle',
        generateStatus: 'idle',
        lastUpdatedAt: null,
        lastFetchAt: null,
        actionFeedback: null,
        activeTask: null,
        onboardingDismissed: false,
        aiCloudModel: 'gemini-3-flash',
        aiLocalModel: 'qwen2.5-coder:7b',
        aiLocalUrl: 'http://localhost:11434/api/generate',
        aiProvider: 'offline',
        aiPersona: 'standard',
        aiRedactionEnabled: true,
        aiTimeoutSec: 30,
        autoPush: false,
        defaultAccountId: null,
        defaultBaseBranch: 'main',
        diffLimitKb: 80,
        diffLimitLines: 400,
        hasAiKey: false,
        hasGitHubToken: false,
        hasGitLabToken: false,
        likeApp: false,
        reducedMotion: false,
        settingsOpen: false,
        settingsTab: 'general',
        stageStatus: 'idle',
        branchStatus: 'idle',
        branches: [],
        strictHostKeyChecking: true,
        theme: 'dark',
        prModalOpen: false,
        prForm: {
          title: '',
          body: '',
          baseBranch: 'main',
          headBranch: '',
          draft: false
        },
        prResult: { status: 'idle' },
        publishStatus: null,
        selectedAccountId: null,
        accounts: [],
        remotes: [],
        clearActionFeedback: () => set({ actionFeedback: null }),
        dismissOnboarding: () => set({ onboardingDismissed: true }),
        setDiffViewType: (viewType) => set({ diffViewType: viewType }),
        setIgnoreWhitespace: (value) => set({ ignoreWhitespace: value }),
        setFocusedDiffFile: (filePath) => set({ focusedDiffFile: filePath }),
        openSettings: (tab = 'general') => set({ settingsOpen: true, settingsTab: tab }),
        setSettingsTab: (tab) => set({ settingsTab: tab }),
        toggleRepoPin: (path) =>
          set((state) => ({
            pinnedRepoPaths: state.pinnedRepoPaths.includes(path)
              ? state.pinnedRepoPaths.filter((repoPath) => repoPath !== path)
              : [...state.pinnedRepoPaths, path]
          })),
        removeRepo: async (path) => {
          const state = get()
          const nextRepos = state.repos.filter((repo) => repo.path !== path)
          const nextPinnedRepoPaths = state.pinnedRepoPaths.filter((repoPath) => repoPath !== path)
          const nextRecentRepoPaths = state.recentRepoPaths.filter((repoPath) => repoPath !== path)
          const nextActiveRepoPath =
            state.activeRepoPath === path
              ? (nextRecentRepoPaths[0] ?? nextRepos[0]?.path ?? null)
              : state.activeRepoPath

          set({
            activeRepoPath: nextActiveRepoPath,
            pinnedRepoPaths: nextPinnedRepoPaths,
            recentRepoPaths: nextRecentRepoPaths,
            repos: nextRepos
          })

          if (!nextActiveRepoPath) {
            clearRepoSurface()
            return
          }

          await Promise.all([
            get().refreshStatus(),
            get().loadDiff('unstaged'),
            get().refreshRemotes(),
            get().refreshBranches()
          ])
        },
        addRepo: async () => {
          if (!window.api?.selectFolder) {
            return
          }

          const selected = await window.api.selectFolder()
          if (!selected) {
            return
          }

          await get().addRepoPath(selected)
        },
        addRepoPath: async (path: string) => {
          const selected = path.trim()
          if (!selected) {
            setErrorFeedback(
              'Could not add repository',
              new Error('No repository path was provided.'),
              'Choose a repository folder.',
              'Pick a folder that already contains a .git directory.'
            )
            return false
          }

          try {
            beginTask('Opening repository', selected)
            const status = await window.api.getGitStatus(selected)

            set((state) => ({
              activeRepoPath: selected,
              recentRepoPaths: bumpRecent(state.recentRepoPaths, selected, MAX_RECENT_REPOS),
              repos: state.repos.some((repo) => repo.path === selected)
                ? state.repos
                : [...state.repos, { path: selected, name: getRepoName(selected) }]
            }))

            applyStatusState(selected, status)
            set({ publishStatus: null, focusedDiffFile: null })

            await Promise.all([
              get().loadDiff('unstaged'),
              get().refreshRemotes(),
              get().refreshBranches()
            ])

            setFeedback(
              'success',
              'Repository ready',
              `${getRepoName(selected)} is now loaded.`,
              'Use the branch panel or command palette to switch context quickly.'
            )
            return true
          } catch (error) {
            setErrorFeedback(
              'Could not add repository',
              error,
              'Failed to load the selected repository.',
              'Pick a folder that already contains a .git directory.'
            )
            return false
          }
        },
        setActiveRepo: async (path) => {
          set((state) => ({
            activeRepoPath: path,
            focusedDiffFile: null,
            publishStatus: null,
            recentRepoPaths: bumpRecent(state.recentRepoPaths, path, MAX_RECENT_REPOS),
            remotes: [],
            statusRepoPath: null
          }))

          await Promise.all([
            get().refreshStatus(),
            get().loadDiff('unstaged'),
            get().refreshRemotes(),
            get().refreshBranches()
          ])
        },
        refreshStatus: async () => {
          const repoPath = get().activeRepoPath
          if (!repoPath) {
            clearRepoSurface()
            return
          }

          try {
            const status = await window.api.getGitStatus(repoPath)
            if (get().activeRepoPath !== repoPath) {
              return
            }
            applyStatusState(repoPath, status)
          } catch {
            const previousStatus = get().status
            const previousRepoPath = get().statusRepoPath
            if (previousStatus && previousRepoPath === repoPath) {
              return
            }
            clearRepoSurface()
          }
        },
        refreshBranches: async () => {
          const repoPath = get().activeRepoPath
          if (!repoPath || !window.api?.gitListBranches) {
            set({ branches: [] })
            return
          }

          try {
            const branches = await window.api.gitListBranches(repoPath)
            if (get().activeRepoPath !== repoPath) {
              return
            }
            set({ branches, branchStatus: 'idle' })
          } catch {
            set({ branches: [], branchStatus: 'idle' })
          }
        },
        checkoutBranch: async (branchName: string) => {
          const repoPath = get().activeRepoPath
          if (!repoPath || !window.api?.gitCheckoutBranch) {
            return false
          }

          try {
            beginTask('Switching branch', branchName)
            set({ branchStatus: 'loading', focusedDiffFile: null })
            await window.api.gitCheckoutBranch(repoPath, branchName)
            await Promise.all([
              get().refreshStatus(),
              get().loadDiff('unstaged'),
              get().loadStagedDiff(),
              get().refreshBranches()
            ])
            set((state) => ({
              branchStatus: 'idle',
              recentBranchesByRepo: updateRecentBranches(
                state.recentBranchesByRepo,
                repoPath,
                branchName
              )
            }))
            setFeedback(
              'success',
              'Branch switched',
              `${branchName} is now active.`,
              'Review the repo overview to confirm ahead/behind state after switching.'
            )
            return true
          } catch (error) {
            set({ branchStatus: 'idle' })
            setErrorFeedback(
              'Switch branch failed',
              error,
              'Failed to switch branches.',
              'Commit, stash, or discard conflicting changes before switching branches.'
            )
            return false
          }
        },
        createBranch: async (branchName: string, fromBranch?: string) => {
          const repoPath = get().activeRepoPath
          if (!repoPath || !window.api?.gitCreateBranch) {
            return false
          }

          try {
            beginTask(
              'Creating branch',
              fromBranch ? `${branchName} from ${fromBranch}` : branchName
            )
            set({ branchStatus: 'loading', focusedDiffFile: null })
            await window.api.gitCreateBranch(repoPath, branchName, fromBranch)
            await Promise.all([
              get().refreshStatus(),
              get().loadDiff('unstaged'),
              get().loadStagedDiff(),
              get().refreshBranches()
            ])
            set((state) => ({
              branchStatus: 'idle',
              recentBranchesByRepo: updateRecentBranches(
                state.recentBranchesByRepo,
                repoPath,
                branchName
              )
            }))
            setFeedback(
              'success',
              'Branch created',
              `${branchName} is ready for work.`,
              'Use the command palette or branch panel to jump back to recent branches.'
            )
            return true
          } catch (error) {
            set({ branchStatus: 'idle' })
            setErrorFeedback(
              'Create branch failed',
              error,
              'Failed to create the branch.',
              'Use a valid branch name and ensure the base branch exists locally.'
            )
            return false
          }
        },
        loadDiff: async (mode: DiffMode = 'unstaged') => {
          const repoPath = get().activeRepoPath
          if (!repoPath) {
            set({ diffText: '' })
            return
          }

          try {
            const diffText = await window.api.getGitDiff(repoPath, mode, {
              ignoreWhitespace: get().ignoreWhitespace
            })
            set({ diffText })
          } catch (error) {
            const message = normalizeErrorMessage(error, 'Failed to load diff.')
            set({ diffText: `Error loading diff: ${message}` })
          }
        },
        loadStagedDiff: async () => {
          const repoPath = get().activeRepoPath
          if (!repoPath) {
            set({ stagedDiffText: '' })
            return
          }

          try {
            const stagedDiffText = await window.api.getGitDiff(repoPath, 'staged', {
              ignoreWhitespace: get().ignoreWhitespace
            })
            set({ stagedDiffText })
          } catch (error) {
            const message = normalizeErrorMessage(error, 'Failed to load staged diff.')
            set({ stagedDiffText: `Error loading staged diff: ${message}` })
          }
        },
        refreshPublishStatus: async () => {
          set({ publishStatus: null })
        },
        stageAll: async () => {
          const repoPath = get().activeRepoPath
          if (!repoPath || !window.api?.gitStageAll) {
            return
          }

          try {
            beginTask('Staging all changes', 'Adding tracked worktree changes to the next commit.')
            set({ stageStatus: 'loading' })
            await window.api.gitStageAll(repoPath)
            await Promise.all([
              get().refreshStatus(),
              get().loadDiff('unstaged'),
              get().loadStagedDiff()
            ])
            set({ stageStatus: 'idle' })
            setFeedback(
              'success',
              'Changes staged',
              'All tracked changes are now staged for commit.',
              'Review the staged diff before committing.'
            )
          } catch (error) {
            set({ stageStatus: 'idle' })
            setErrorFeedback(
              'Stage all failed',
              error,
              'Failed to stage changes.',
              'Check for repository lock files or conflicted files before retrying.'
            )
          }
        },
        discardAllChanges: async () => {
          const repoPath = get().activeRepoPath
          if (!repoPath || !window.api?.gitDiscardChanges) {
            return false
          }

          try {
            beginTask(
              'Discarding unstaged changes',
              'Tracked worktree edits will be restored to HEAD.'
            )
            await window.api.gitDiscardChanges(repoPath)
            await Promise.all([
              get().refreshStatus(),
              get().loadDiff('unstaged'),
              get().loadStagedDiff()
            ])
            set({ focusedDiffFile: null })
            setFeedback(
              'warning',
              'Unstaged changes discarded',
              'Tracked worktree edits were restored to HEAD. Untracked files were preserved.'
            )
            return true
          } catch (error) {
            setErrorFeedback(
              'Discard changes failed',
              error,
              'Failed to discard changes.',
              'Review the repo state and resolve any conflicts before retrying the discard action.'
            )
            return false
          }
        },
        hardResetToHead: async () => {
          const repoPath = get().activeRepoPath
          if (!repoPath || !window.api?.gitHardReset) {
            return false
          }

          try {
            beginTask(
              'Hard resetting repository',
              'Staged and unstaged tracked changes will be lost.'
            )
            await window.api.gitHardReset(repoPath)
            await Promise.all([
              get().refreshStatus(),
              get().loadDiff('unstaged'),
              get().loadStagedDiff()
            ])
            set({ focusedDiffFile: null })
            setFeedback(
              'warning',
              'Repository reset',
              'Tracked staged and unstaged changes were discarded and HEAD was restored.'
            )
            return true
          } catch (error) {
            setErrorFeedback(
              'Hard reset failed',
              error,
              'Failed to reset the repository.',
              'Make sure no other Git process is holding the repository lock and retry if appropriate.'
            )
            return false
          }
        },
        refreshRemotes: async () => {
          const repoPath = get().activeRepoPath
          if (!repoPath || !window.api?.gitGetRemotes) {
            set({ remotes: [] })
            return
          }

          try {
            const remotes = await window.api.gitGetRemotes(repoPath)
            if (get().activeRepoPath !== repoPath) {
              return
            }
            set({ remotes })
          } catch {
            set({ remotes: [] })
          }
        },
        setRemoteOrigin: async (url: string) => {
          const repoPath = get().activeRepoPath
          if (!repoPath || !window.api?.gitSetRemoteOrigin) {
            return { ok: false, error: 'No repository selected.' }
          }

          try {
            beginTask('Saving remote origin', url)
            await window.api.gitSetRemoteOrigin(repoPath, url)
            await get().refreshRemotes()
            setFeedback(
              'success',
              'Remote origin updated',
              'Future fetch, pull, and push operations will use the saved origin URL.'
            )
            return { ok: true }
          } catch (error) {
            const message = normalizeErrorMessage(error, 'Failed to set remote origin.')
            setErrorFeedback(
              'Save remote failed',
              error,
              'Failed to set the remote origin.',
              'Use an SSH or HTTPS repository URL and confirm the repository exists.'
            )
            return { ok: false, error: message }
          }
        },
        addToIgnore: async (filePath: string) => {
          const repoPath = get().activeRepoPath
          if (!repoPath || !window.api?.gitIgnore) {
            return { ok: false, error: 'No active repository.' }
          }

          try {
            beginTask('Updating .gitignore', filePath)
            await window.api.gitIgnore(repoPath, filePath)
            await get().refreshStatus()
            setFeedback(
              'info',
              'File ignored',
              `${filePath} was added to .gitignore.`,
              'Review the file list to confirm the ignore rule behaves as expected.'
            )
            return { ok: true }
          } catch (error) {
            const message = normalizeErrorMessage(error, 'Failed to ignore file.')
            setErrorFeedback(
              'Ignore failed',
              error,
              'Failed to add the file to .gitignore.',
              'Confirm the file still exists in the repository and retry if needed.'
            )
            return { ok: false, error: message }
          }
        },
        setCommitTitle: (title) =>
          set({ commitTitle: title, commitError: null, commitStatus: 'idle' }),
        setCommitBody: (body) => set({ commitBody: body, commitError: null, commitStatus: 'idle' }),
        generateCommitMessage: async () => {
          const repoPath = get().activeRepoPath
          const status = get().status
          const hasChanges = Boolean(status?.files.length) || Boolean(status?.staged.length)
          if (!repoPath || !hasChanges) {
            return
          }

          try {
            beginTask(
              'Drafting commit message',
              'Analyzing the current diff with the configured AI mode.'
            )
            set({ generateStatus: 'loading', commitError: null })
            const message = await window.api.generateCommitMessage(repoPath)
            set({
              commitTitle: message.title || 'chore: update files',
              commitBody: message.body ?? '',
              commitStatus: 'idle',
              generateStatus: 'idle'
            })
            setFeedback(
              'success',
              'Commit draft ready',
              'Review the generated title and body before creating the commit.',
              'You can edit the draft or regenerate it after staging a narrower set of files.'
            )
          } catch (error) {
            set({
              commitTitle: 'chore: update files',
              commitBody: '',
              commitStatus: 'idle',
              generateStatus: 'idle'
            })
            setErrorFeedback(
              'Commit generation failed',
              error,
              'Failed to generate a commit message.',
              'Check Settings -> Integrations or switch to Offline mode if cloud AI is unavailable.'
            )
          }
        },
        commit: async () => {
          const repoPath = get().activeRepoPath
          const title = get().commitTitle.trim()
          const body = get().commitBody.trim()

          if (!repoPath || !title) {
            set({ commitStatus: 'idle' })
            return
          }

          try {
            beginTask('Creating commit', title)
            set({ commitError: null, commitStatus: 'loading' })
            const result = await window.api.gitCommit(repoPath, title, body || undefined)
            await Promise.all([
              get().refreshStatus(),
              get().loadDiff('unstaged'),
              get().loadStagedDiff()
            ])
            set({ commitTitle: '', commitBody: '', commitStatus: 'success' })
            clearCommitTimer()

            if (commitResetTimer) {
              clearTimeout(commitResetTimer)
            }

            if (get().autoPush) {
              setFeedback(
                'success',
                'Commit created',
                'The commit was saved locally. Auto-push is running next.'
              )
              await get().push()
            } else {
              setFeedback(
                'success',
                'Commit created',
                result.hash
                  ? `Commit ${result.hash.slice(0, 7)} was recorded locally.`
                  : 'Commit saved.'
              )
            }

            commitResetTimer = setTimeout(() => {
              set({ commitStatus: 'idle' })
              commitResetTimer = null
            }, 220)
          } catch (error) {
            const message = normalizeErrorMessage(error, 'Commit failed.')
            set({ commitError: message, commitStatus: 'error' })
            setErrorFeedback(
              'Commit failed',
              error,
              'Commit failed.',
              'Stage the intended files, confirm you are on a branch, and retry the commit.'
            )
          }
        },
        clearCommitResetTimer: () => {
          clearCommitTimer()
        },
        push: async () => {
          const repoPath = get().activeRepoPath
          const accountId = getEffectiveAccountId(get().selectedAccountId, get().defaultAccountId)
          if (!repoPath || !accountId) {
            setErrorFeedback(
              'Push unavailable',
              new Error('No SSH account selected.'),
              'Push requires an SSH account.',
              'Choose a default SSH account in Settings -> Accounts or use the quick account switcher.'
            )
            return false
          }

          try {
            beginTask(
              'Pushing to origin',
              'Publishing the current branch to the configured remote.'
            )
            set({ syncStatus: 'loading', syncAction: 'push' })
            await window.api.gitPush(repoPath, accountId)
            await get().refreshStatus()
            setFeedback(
              'success',
              'Push complete',
              'The current branch is synced to origin.',
              'Open a pull request once the branch is ready for review.'
            )
            return true
          } catch (error) {
            const message = normalizeErrorMessage(
              error,
              'Push failed. Check your connection and authentication.'
            )
            set({
              commitError: `Push failed: ${message}`,
              commitStatus: 'error'
            })
            setErrorFeedback(
              'Push failed',
              error,
              'Push failed.',
              'Pull the latest changes or verify the selected SSH account and remote URL.'
            )
            return false
          } finally {
            set({ syncStatus: 'idle', syncAction: null })
          }
        },
        pull: async () => {
          const repoPath = get().activeRepoPath
          const accountId = getEffectiveAccountId(get().selectedAccountId, get().defaultAccountId)
          if (!repoPath || !accountId) {
            setErrorFeedback(
              'Pull unavailable',
              new Error('No SSH account selected.'),
              'Pull requires an SSH account.',
              'Choose a default SSH account in Settings -> Accounts or use the quick account switcher.'
            )
            return false
          }

          try {
            beginTask('Pulling from origin', 'Fetching and applying the latest remote changes.')
            set({ syncStatus: 'loading', syncAction: 'pull', commitStatus: 'loading' })
            const result = await window.api.gitPull(repoPath, accountId)

            await Promise.all([
              get().refreshStatus(),
              get().loadDiff('unstaged'),
              get().loadStagedDiff()
            ])

            set({ commitStatus: 'idle', lastFetchAt: Date.now() })
            setFeedback(
              'success',
              'Pull complete',
              result === 'Updated'
                ? 'Remote changes were applied locally.'
                : 'Your local branch was already up to date.'
            )
            return true
          } catch (error) {
            const message = normalizeErrorMessage(error, 'Pull failed.')
            set({
              commitError: `Pull failed: ${message}`,
              commitStatus: 'error'
            })
            setErrorFeedback(
              'Pull failed',
              error,
              'Pull failed.',
              'Review the remote, resolve any conflicts, and retry once the repository is ready.'
            )
            return false
          } finally {
            set({ syncStatus: 'idle', syncAction: null })
          }
        },
        fetch: async (options) => {
          const repoPath = get().activeRepoPath
          const accountId = getEffectiveAccountId(get().selectedAccountId, get().defaultAccountId)
          if (!repoPath || !accountId) {
            return
          }

          const silent = options?.silent ?? false

          try {
            if (!silent) {
              beginTask('Fetching remote state', 'Refreshing ahead/behind status from origin.')
            }
            set({ syncStatus: 'loading', syncAction: 'fetch' })
            await window.api.gitFetch(repoPath, accountId)
            await get().refreshStatus()
            set({ lastFetchAt: Date.now() })
            if (!silent) {
              setFeedback(
                'success',
                'Fetch complete',
                'Remote branch status has been refreshed.',
                'Review ahead/behind counts in the repo overview.'
              )
            }
          } catch (error) {
            if (!silent) {
              setErrorFeedback(
                'Fetch failed',
                error,
                'Failed to fetch remote state.',
                'Check network access, remote origin, and the selected SSH account.'
              )
            }
          } finally {
            set({ syncStatus: 'idle', syncAction: null })
          }
        },
        refreshSettings: async () => {
          if (!window.api?.getSettings) {
            return
          }

          const settings = await window.api.getSettings()
          set({
            aiCloudModel: settings.aiCloudModel,
            aiLocalModel: settings.aiLocalModel,
            aiLocalUrl: settings.aiLocalUrl,
            aiProvider: settings.aiProvider,
            aiPersona: settings.aiPersona,
            aiRedactionEnabled: settings.aiRedactionEnabled,
            aiTimeoutSec: settings.aiTimeoutSec,
            autoPush: settings.autoPush ?? false,
            defaultAccountId: settings.defaultAccountId ?? null,
            defaultBaseBranch: settings.defaultBaseBranch,
            diffLimitKb: settings.diffLimitKb,
            diffLimitLines: settings.diffLimitLines,
            hasAiKey: settings.hasAiKey,
            hasGitHubToken: settings.hasGitHubToken,
            hasGitLabToken: settings.hasGitLabToken,
            likeApp: settings.likeApp,
            reducedMotion: settings.reducedMotion,
            strictHostKeyChecking: settings.strictHostKeyChecking,
            theme: settings.theme
          })
        },
        updateSettings: async (input) => {
          if (!window.api?.updateSettings) {
            return
          }

          const settings = await window.api.updateSettings(input)
          const accounts = get().accounts
          const defaultAccountId = settings.defaultAccountId ?? null
          const selectedAccountId = get().selectedAccountId
          const selectedExists = selectedAccountId
            ? accounts.some((account) => account.id === selectedAccountId)
            : false
          const canUseDefault = defaultAccountId
            ? accounts.some((account) => account.id === defaultAccountId)
            : false
          const nextSelectedAccountId =
            !selectedExists && canUseDefault ? defaultAccountId : selectedAccountId

          set({
            aiCloudModel: settings.aiCloudModel,
            aiLocalModel: settings.aiLocalModel,
            aiLocalUrl: settings.aiLocalUrl,
            aiProvider: settings.aiProvider,
            aiPersona: settings.aiPersona,
            aiRedactionEnabled: settings.aiRedactionEnabled,
            aiTimeoutSec: settings.aiTimeoutSec,
            autoPush: settings.autoPush,
            defaultAccountId,
            defaultBaseBranch: settings.defaultBaseBranch,
            diffLimitKb: settings.diffLimitKb,
            diffLimitLines: settings.diffLimitLines,
            hasAiKey: settings.hasAiKey,
            hasGitHubToken: settings.hasGitHubToken,
            hasGitLabToken: settings.hasGitLabToken,
            likeApp: settings.likeApp,
            reducedMotion: settings.reducedMotion,
            strictHostKeyChecking: settings.strictHostKeyChecking,
            theme: settings.theme,
            selectedAccountId: nextSelectedAccountId
          })
        },
        saveAiKey: async (key: string) => {
          const secrets = assertSecretResult(
            await window.api.saveSecret({ type: 'ai', value: key }),
            'Failed to save the AI API key.'
          )
          set({ hasAiKey: secrets.hasAiKey })
        },
        clearAiKey: async () => {
          const secrets = assertSecretResult(
            await window.api.deleteSecret({ type: 'ai' }),
            'Failed to remove the AI API key.'
          )
          set({ hasAiKey: secrets.hasAiKey })
        },
        saveGitHubToken: async (token: string) => {
          const secrets = assertSecretResult(
            await window.api.saveSecret({ type: 'github', value: token }),
            'Failed to save the GitHub token.'
          )
          set({ hasGitHubToken: secrets.hasGitHubToken })
        },
        clearGitHubToken: async () => {
          const secrets = assertSecretResult(
            await window.api.deleteSecret({ type: 'github' }),
            'Failed to remove the GitHub token.'
          )
          set({ hasGitHubToken: secrets.hasGitHubToken })
        },
        saveGitLabToken: async (token: string) => {
          const secrets = assertSecretResult(
            await window.api.saveSecret({ type: 'gitlab', value: token }),
            'Failed to save the GitLab token.'
          )
          set({ hasGitLabToken: secrets.hasGitLabToken })
        },
        clearGitLabToken: async () => {
          const secrets = assertSecretResult(
            await window.api.deleteSecret({ type: 'gitlab' }),
            'Failed to remove the GitLab token.'
          )
          set({ hasGitLabToken: secrets.hasGitLabToken })
        },
        setSettingsOpen: (open) => set({ settingsOpen: open }),
        openPrModal: async (title, body) => {
          const status = get().status
          const headBranch = status?.current ?? ''
          const baseBranch = get().defaultBaseBranch
          set({
            prModalOpen: true,
            prForm: {
              title: title ?? (get().commitTitle || 'Update changes'),
              body: body ?? (get().commitBody || ''),
              baseBranch: baseBranch || 'main',
              headBranch,
              draft: false
            },
            prResult: { status: 'idle' }
          })
        },
        closePrModal: () => set({ prModalOpen: false, prResult: { status: 'idle' } }),
        updatePrForm: (input) =>
          set((state) => ({
            prForm: { ...state.prForm, ...input }
          })),
        submitPullRequest: async () => {
          const repoPath = get().activeRepoPath
          const { prForm } = get()
          if (!repoPath) {
            return
          }

          try {
            beginTask('Creating pull request', `${prForm.headBranch} -> ${prForm.baseBranch}`)
            set({ prResult: { status: 'loading' } })
            const result = await window.api.createPullRequest(repoPath, prForm)
            if (result.success) {
              set({
                prResult: { status: 'success', url: result.url },
                actionFeedback: buildFeedback(
                  'success',
                  'Pull request created',
                  result.url ? `Review the PR at ${result.url}.` : 'Your PR is ready for review.'
                ),
                activeTask: null
              })
            } else {
              set({
                prResult: { status: 'error', message: result.error },
                actionFeedback: buildFeedback(
                  'error',
                  'Pull request failed',
                  result.error ?? 'Failed to create the pull request.',
                  'Confirm provider tokens are configured and that the branch exists on the remote.'
                ),
                activeTask: null
              })
            }
          } catch (error) {
            const message = normalizeErrorMessage(error, 'PR creation failed.')
            set({
              prResult: { status: 'error', message },
              actionFeedback: buildFeedback(
                'error',
                'Pull request failed',
                message,
                'Confirm provider tokens are configured and that the branch exists on the remote.'
              ),
              activeTask: null
            })
          }
        },
        refreshAccounts: async () => {
          if (!window.api?.listSecrets) {
            return
          }

          try {
            const result = await window.api.listSecrets()
            if (!result.ok) {
              return
            }

            set((state) => {
              const accounts = result.secrets.accounts
              const selected =
                state.selectedAccountId ??
                (state.defaultAccountId &&
                accounts.some((account) => account.id === state.defaultAccountId)
                  ? state.defaultAccountId
                  : null)

              return {
                accounts,
                selectedAccountId: selected,
                hasAiKey: result.secrets.hasAiKey,
                hasGitHubToken: result.secrets.hasGitHubToken,
                hasGitLabToken: result.secrets.hasGitLabToken
              }
            })
          } catch {
            // Ignore secret list failures to keep UI responsive.
          }
        },
        addAccount: async (name: string, privateKey: string) => {
          const secrets = assertSecretResult(
            await window.api.saveSecret({ type: 'ssh', action: 'add', name, privateKey }),
            'Failed to save the SSH account.'
          )
          const account = secrets.accounts[secrets.accounts.length - 1]
          set((state) => ({
            accounts: secrets.accounts,
            selectedAccountId: account?.id ?? state.selectedAccountId
          }))
        },
        deleteAccount: async (id: string) => {
          const secrets = assertSecretResult(
            await window.api.deleteSecret({ type: 'ssh', id }),
            'Failed to remove the SSH account.'
          )
          if (get().defaultAccountId === id) {
            await get().updateSettings({ defaultAccountId: null })
          }
          set((state) => ({
            accounts: secrets.accounts,
            selectedAccountId: state.selectedAccountId === id ? null : state.selectedAccountId
          }))
        },
        renameAccount: async (id: string, name: string) => {
          const secrets = assertSecretResult(
            await window.api.saveSecret({ type: 'ssh', action: 'rename', id, name }),
            'Failed to rename the SSH account.'
          )
          set({ accounts: secrets.accounts })
        },
        setSelectedAccountId: (id) => set({ selectedAccountId: id }),
        applyStatusUpdate: (repoPath, status) => {
          if (get().activeRepoPath !== repoPath) {
            return
          }

          applyStatusState(repoPath, status)
        }
      }
    },
    {
      name: UI_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeRepoPath: state.activeRepoPath,
        diffViewType: state.diffViewType,
        ignoreWhitespace: state.ignoreWhitespace,
        onboardingDismissed: state.onboardingDismissed,
        pinnedRepoPaths: state.pinnedRepoPaths,
        recentBranchesByRepo: state.recentBranchesByRepo,
        recentRepoPaths: state.recentRepoPaths,
        repos: state.repos,
        selectedAccountId: state.selectedAccountId
      })
    }
  )
)
