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
} from '../../../../index'

export type SettingsTab = 'accounts' | 'advanced' | 'general' | 'integrations'

export type FeedbackTone = 'error' | 'info' | 'success' | 'warning'
export type DiffViewType = 'split' | 'unified'
export type RecentBranchesByRepo = Record<string, string[]>

export type ActionFeedback = {
  tone: FeedbackTone
  title: string
  detail?: string
  suggestion?: string
  ts: number
}

export type ActiveTask = {
  label: string
  detail?: string
  startedAt: number
}

/* ── Slice state types ─────────────────────────────────────────────── */

export type GitSliceState = {
  branchStatus: 'idle' | 'loading'
  branches: BranchSummary[]
  commitBody: string
  commitError: string | null
  commitStatus: 'idle' | 'loading' | 'success' | 'error'
  commitTitle: string
  diffText: string
  generateStatus: 'idle' | 'loading'
  lastFetchAt: number | null
  lastUpdatedAt: number | null
  publishStatus: PublishStatus | null
  remotes: Array<{ name: string; url: string }>
  stageStatus: 'idle' | 'loading'
  stagedDiffText: string
  stagedSummary: { count: number; files: string[] }
  status: GitStatus | null
  statusRepoPath: string | null
  syncAction: 'fetch' | 'pull' | 'push' | null
  syncStatus: 'idle' | 'loading'

  addToIgnore: (filePath: string) => Promise<{ ok: boolean; error?: string }>
  applyStatusUpdate: (repoPath: string, status: GitStatus) => void
  checkoutBranch: (branchName: string) => Promise<boolean>
  clearCommitResetTimer: () => void
  commit: () => Promise<void>
  createBranch: (branchName: string, fromBranch?: string) => Promise<boolean>
  discardAllChanges: () => Promise<boolean>
  fetch: (options?: { silent?: boolean }) => Promise<void>
  generateCommitMessage: () => Promise<void>
  hardResetToHead: () => Promise<boolean>
  loadDiff: (mode?: DiffMode) => Promise<void>
  loadStagedDiff: () => Promise<void>
  pull: () => Promise<boolean>
  push: () => Promise<boolean>
  refreshBranches: () => Promise<void>
  refreshPublishStatus: () => Promise<void>
  refreshRemotes: () => Promise<void>
  refreshStatus: () => Promise<void>
  setCommitBody: (body: string) => void
  setCommitTitle: (title: string) => void
  setRemoteOrigin: (url: string) => Promise<{ ok: boolean; error?: string }>
  stageAll: () => Promise<void>
}

export type SettingsSliceState = {
  aiCloudModel: string
  aiLocalModel: string
  aiLocalUrl: string
  aiProvider: 'offline' | 'local' | 'cloud'
  aiPersona: 'standard' | 'cybersecurity'
  aiRedactionEnabled: boolean
  aiTimeoutSec: number
  autoPush: boolean
  defaultAccountId: string | null
  defaultBaseBranch: 'main' | 'master'
  diffLimitKb: number
  diffLimitLines: number
  hasAiKey: boolean
  hasGitHubToken: boolean
  hasGitLabToken: boolean
  likeApp: boolean
  reducedMotion: boolean
  strictHostKeyChecking: boolean
  theme: 'dark'

  refreshSettings: () => Promise<void>
  updateSettings: (input: SettingsUpdateInput) => Promise<void>
}

export type AccountsSliceState = {
  accounts: Account[]
  selectedAccountId: string | null

  addAccount: (name: string, privateKey: string) => Promise<void>
  clearAiKey: () => Promise<void>
  clearGitHubToken: () => Promise<void>
  clearGitLabToken: () => Promise<void>
  deleteAccount: (id: string) => Promise<void>
  refreshAccounts: () => Promise<void>
  renameAccount: (id: string, name: string) => Promise<void>
  saveAiKey: (key: string) => Promise<void>
  saveGitHubToken: (token: string) => Promise<void>
  saveGitLabToken: (token: string) => Promise<void>
  setSelectedAccountId: (id: string | null) => void
}

export type UiSliceState = {
  actionFeedback: ActionFeedback | null
  activeTask: ActiveTask | null
  diffViewType: DiffViewType
  focusedDiffFile: string | null
  ignoreWhitespace: boolean
  onboardingDismissed: boolean
  prForm: PullRequestOptions
  prModalOpen: boolean
  prResult: { status: 'idle' | 'loading' | 'success' | 'error'; message?: string; url?: string }
  settingsOpen: boolean
  settingsTab: SettingsTab

  clearActionFeedback: () => void
  closePrModal: () => void
  dismissOnboarding: () => void
  openPrModal: (title?: string, body?: string) => Promise<void>
  openSettings: (tab?: SettingsTab) => void
  setDiffViewType: (viewType: DiffViewType) => void
  setFocusedDiffFile: (filePath: string | null) => void
  setIgnoreWhitespace: (value: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setSettingsTab: (tab: SettingsTab) => void
  submitPullRequest: () => Promise<void>
  updatePrForm: (input: Partial<PullRequestOptions>) => void
}

export type ReposSliceState = {
  activeRepoPath: string | null
  pinnedRepoPaths: string[]
  recentBranchesByRepo: RecentBranchesByRepo
  recentRepoPaths: string[]
  repos: RepoSummary[]

  addRepo: () => Promise<void>
  addRepoPath: (path: string) => Promise<boolean>
  removeRepo: (path: string) => Promise<void>
  setActiveRepo: (path: string) => Promise<void>
  toggleRepoPin: (path: string) => void
}

export type RepoState = GitSliceState &
  SettingsSliceState &
  AccountsSliceState &
  UiSliceState &
  ReposSliceState

/* ── Slice creator signature ───────────────────────────────────────── */

export type SliceCreator<T> = (
  set: (
    partial: Partial<RepoState> | ((state: RepoState) => Partial<RepoState>),
    replace?: false
  ) => void,
  get: () => RepoState
) => T

/* ── Constants ─────────────────────────────────────────────────────── */

export const MAX_RECENT_BRANCHES = 6
export const MAX_RECENT_REPOS = 10
export const EMPTY_STAGED_SUMMARY = { count: 0, files: [] }

/* ── Shared helpers ────────────────────────────────────────────────── */

export const getRepoName = (path: string): string => {
  const segments = path.split(/[\\/]/)
  return segments[segments.length - 1] || path
}

export const bumpRecent = (items: string[], value: string, limit: number): string[] =>
  [value, ...items.filter((item) => item !== value)].slice(0, limit)

export const updateRecentBranches = (
  current: RecentBranchesByRepo,
  repoPath: string,
  branchName: string
): RecentBranchesByRepo => ({
  ...current,
  [repoPath]: bumpRecent(current[repoPath] ?? [], branchName, MAX_RECENT_BRANCHES)
})

export const assertSecretResult = (
  result: SecretsResult,
  fallbackMessage: string
): SecretsResult['secrets'] => {
  if (!result.ok) {
    throw new Error(result.error ?? fallbackMessage)
  }
  return result.secrets
}

export const normalizeErrorMessage = (error: unknown, fallbackMessage: string): string =>
  error instanceof Error && error.message ? error.message : fallbackMessage

export const getActionSuggestion = (message: string, fallback?: string): string | undefined => {
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

export const buildFeedback = (
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

/* ── Feedback helpers (closure-free, take set/get) ─────────────────── */

export const beginTask = (
  set: (partial: Partial<RepoState>) => void,
  label: string,
  detail?: string
): void => {
  set({
    activeTask: {
      label,
      detail,
      startedAt: Date.now()
    }
  })
}

export const setFeedback = (
  set: (partial: Partial<RepoState>) => void,
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

export const setErrorFeedback = (
  set: (partial: Partial<RepoState>) => void,
  title: string,
  error: unknown,
  fallbackMessage: string,
  fallbackSuggestion?: string
): void => {
  const detail = normalizeErrorMessage(error, fallbackMessage)
  setFeedback(set, 'error', title, detail, getActionSuggestion(detail, fallbackSuggestion))
}
