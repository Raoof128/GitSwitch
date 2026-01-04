import { create } from 'zustand'
import type {
  Account,
  DiffMode,
  GitStatus,
  PublishStatus,
  PullRequestOptions,
  RepoSummary
} from '../../../index'

type RepoState = {
  accounts: Account[]
  activeRepoPath: string | null
  addAccount: (name: string, privateKey: string) => Promise<void>
  addRepo: () => Promise<void>
  addRepoPath: (path: string) => Promise<boolean>
  aiCloudModel: string
  aiLocalModel: string
  aiLocalUrl: string
  aiProvider: 'offline' | 'local' | 'cloud'
  aiPersona: 'standard' | 'cybersecurity'
  aiRedactionEnabled: boolean
  aiTimeoutSec: number
  applyStatusUpdate: (repoPath: string, status: GitStatus) => void
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
  defaultAccountId: string | null
  defaultBaseBranch: 'main' | 'master'
  deleteAccount: (id: string) => Promise<void>
  diffLimitKb: number
  diffLimitLines: number
  diffText: string
  generateCommitMessage: () => Promise<void>
  generateStatus: 'idle' | 'loading'
  hasAiKey: boolean
  hasGitHubToken: boolean
  hasGitLabToken: boolean
  likeApp: boolean
  lastUpdatedAt: number | null
  loadDiff: (mode?: DiffMode) => Promise<void>
  loadStagedDiff: () => Promise<void>
  openPrModal: (title?: string, body?: string) => Promise<void>
  prForm: PullRequestOptions
  prModalOpen: boolean
  prResult: { status: 'idle' | 'loading' | 'success' | 'error'; message?: string; url?: string }
  publishStatus: PublishStatus | null
  push: () => Promise<boolean>
  reducedMotion: boolean
  refreshAccounts: () => Promise<void>
  refreshPublishStatus: () => Promise<void>
  refreshSettings: () => Promise<void>
  refreshStatus: () => Promise<void>
  repos: RepoSummary[]
  renameAccount: (id: string, name: string) => Promise<void>
  saveAiKey: (key: string) => Promise<void>
  saveGitHubToken: (token: string) => Promise<void>
  saveGitLabToken: (token: string) => Promise<void>
  selectedAccountId: string | null
  setActiveRepo: (path: string) => Promise<void>
  setCommitBody: (body: string) => void
  setCommitTitle: (title: string) => void
  setSelectedAccountId: (id: string | null) => void
  setSettingsOpen: (open: boolean) => void
  settingsOpen: boolean
  stageAll: () => Promise<void>
  stageStatus: 'idle' | 'loading'
  stagedDiffText: string
  stagedSummary: {
    count: number
    files: string[]
  }
  status: GitStatus | null
  strictHostKeyChecking: boolean
  submitPullRequest: () => Promise<void>
  theme: 'dark'
  remotes: Array<{ name: string; url: string }>
  refreshRemotes: () => Promise<void>
  setRemoteOrigin: (url: string) => Promise<{ ok: boolean; error?: string }>
  addToIgnore: (filePath: string) => Promise<{ ok: boolean; error?: string }>
  updatePrForm: (input: Partial<PullRequestOptions>) => void
  updateSettings: (
    input: Partial<{
      aiCloudModel: string
      aiLocalModel: string
      aiLocalUrl: string
      aiProvider: 'offline' | 'local' | 'cloud'
      aiPersona: 'standard' | 'cybersecurity'
      aiRedactionEnabled: boolean
      aiTimeoutSec: number
      defaultAccountId: string | null
      defaultBaseBranch: 'main' | 'master'
      diffLimitKb: number
      diffLimitLines: number
      likeApp: boolean
      reducedMotion: boolean
      strictHostKeyChecking: boolean
      theme: 'dark'
    }>
  ) => Promise<void>
}

const getRepoName = (path: string): string => {
  const segments = path.split(/[\\/]/)
  return segments[segments.length - 1] || path
}

let commitResetTimer: ReturnType<typeof setTimeout> | null = null
const clearCommitTimer = (): void => {
  if (commitResetTimer) {
    clearTimeout(commitResetTimer)
    commitResetTimer = null
  }
}

export const useRepoStore = create<RepoState>((set, get) => ({
  repos: [],
  activeRepoPath: null,
  status: null,
  diffText: '',
  stagedDiffText: '',
  stagedSummary: {
    count: 0,
    files: []
  },
  commitTitle: '',
  commitBody: '',
  commitError: null,
  commitStatus: 'idle',
  generateStatus: 'idle',
  lastUpdatedAt: null,
  aiCloudModel: 'gpt-4o-mini',
  aiLocalModel: 'qwen2.5-coder:7b',
  aiLocalUrl: 'http://localhost:11434/api/generate',
  aiProvider: 'offline',
  aiPersona: 'standard',
  aiRedactionEnabled: true,
  aiTimeoutSec: 7,
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
  stageStatus: 'idle',
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
      return false
    }

    try {
      const status = await window.api.getGitStatus(selected)
      set((state) => {
        if (state.repos.some((repo) => repo.path === selected)) {
          return {
            ...state,
            activeRepoPath: selected,
            status,
            stagedSummary: {
              count: status.staged.length,
              files: status.staged.slice(0, 5)
            }
          }
        }

        return {
          repos: [...state.repos, { path: selected, name: getRepoName(selected) }],
          activeRepoPath: selected,
          status,
          stagedSummary: {
            count: status.staged.length,
            files: status.staged.slice(0, 5)
          },
          publishStatus: null
        }
      })

      await get().loadDiff('unstaged')
      return true
    } catch {
      return false
    }
  },
  setActiveRepo: async (path) => {
    set({ activeRepoPath: path, publishStatus: null, remotes: [] })
    await get().refreshStatus()
    await get().loadDiff('unstaged')
    await get().refreshRemotes()
  },
  refreshStatus: async () => {
    const repoPath = get().activeRepoPath
    if (!repoPath) {
      set({
        publishStatus: null,
        status: null,
        stagedSummary: { count: 0, files: [] }
      })
      return
    }

    try {
      const status = await window.api.getGitStatus(repoPath)
      set({
        status,
        stagedSummary: {
          count: status.staged.length,
          files: status.staged.slice(0, 5)
        },
        lastUpdatedAt: Date.now()
      })
    } catch {
      set({
        status: null,
        stagedSummary: { count: 0, files: [] }
      })
    }
  },
  loadDiff: async (mode: DiffMode = 'unstaged') => {
    const repoPath = get().activeRepoPath
    if (!repoPath) {
      set({ diffText: '' })
      return
    }

    try {
      const diffText = await window.api.getGitDiff(repoPath, mode)
      set({ diffText })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load diff'
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
      const stagedDiffText = await window.api.getGitDiff(repoPath, 'staged')
      set({ stagedDiffText })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load staged diff'
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
      set({ stageStatus: 'loading' })
      await window.api.gitStageAll(repoPath)
      await get().refreshStatus()
      await get().loadDiff('unstaged')
      await get().loadStagedDiff()
      set({ stageStatus: 'idle' })
    } catch {
      set({ stageStatus: 'idle' })
    }
  },
  refreshRemotes: async () => {
    const repoPath = get().activeRepoPath
    if (!repoPath || !window.api?.gitGetRemotes) {
      return
    }
    try {
      const remotes = await window.api.gitGetRemotes(repoPath)
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
      await window.api.gitSetRemoteOrigin(repoPath, url)
      await get().refreshRemotes()
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set remote origin.'
      return { ok: false, error: message }
    }
  },
  addToIgnore: async (filePath: string) => {
    const repoPath = get().activeRepoPath
    if (!repoPath || !window.api?.gitIgnore) {
      return { ok: false, error: 'No active repository.' }
    }
    try {
      await window.api.gitIgnore(repoPath, filePath)
      await get().refreshStatus()
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Failed to ignore file.' }
    }
  },
  setCommitTitle: (title) => set({ commitTitle: title, commitError: null, commitStatus: 'idle' }),
  setCommitBody: (body) => set({ commitBody: body, commitError: null, commitStatus: 'idle' }),
  generateCommitMessage: async () => {
    const repoPath = get().activeRepoPath
    const status = get().status
    const hasChanges = Boolean(status?.files.length) || Boolean(status?.staged.length)
    if (!repoPath || !hasChanges) {
      return
    }

    try {
      set({ generateStatus: 'loading', commitError: null })
      const message = await window.api.generateCommitMessage(repoPath)
      set({
        commitTitle: message.title || 'chore: update files',
        commitBody: message.body ?? '',
        commitStatus: 'idle',
        generateStatus: 'idle'
      })
    } catch {
      set({
        commitTitle: 'chore: update files',
        commitBody: '',
        commitStatus: 'idle',
        generateStatus: 'idle'
      })
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
      set({ commitError: null, commitStatus: 'loading' })
      await window.api.gitCommit(repoPath, title, body || undefined)
      await get().refreshStatus()
      await get().loadDiff('unstaged')
      await get().loadStagedDiff()
      set({ commitTitle: '', commitBody: '', commitStatus: 'success' })
      clearCommitTimer()
      // Clear any existing timer before setting new one
      if (commitResetTimer) {
        clearTimeout(commitResetTimer)
      }
      commitResetTimer = setTimeout(() => {
        set({ commitStatus: 'idle' })
        commitResetTimer = null
      }, 220)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Commit failed.'
      set({ commitError: message, commitStatus: 'error' })
    }
  },
  clearCommitResetTimer: () => {
    clearCommitTimer()
  },
  push: async () => {
    const repoPath = get().activeRepoPath
    const accountId = get().selectedAccountId
    if (!repoPath || !accountId) {
      return false
    }

    try {
      await window.api.gitPush(repoPath, accountId)
      return true
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Push failed. Check your connection and authentication.'
      set({
        commitError: `Push failed: ${message}`,
        commitStatus: 'error'
      })
      // Clear error after delay
      setTimeout(() => set({ commitError: null, commitStatus: 'idle' }), 8000)
      return false
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
    set({
      aiCloudModel: settings.aiCloudModel,
      aiLocalModel: settings.aiLocalModel,
      aiLocalUrl: settings.aiLocalUrl,
      aiProvider: settings.aiProvider,
      aiRedactionEnabled: settings.aiRedactionEnabled,
      aiTimeoutSec: settings.aiTimeoutSec,
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
  saveAiKey: async (key: string) => {
    try {
      const result = await window.api.saveSecret({ type: 'ai', value: key })
      if (result.ok) {
        set({ hasAiKey: result.secrets.hasAiKey })
      }
    } catch {
      // Ignore secret save failures to keep UI responsive.
    }
  },
  clearAiKey: async () => {
    try {
      const result = await window.api.deleteSecret({ type: 'ai' })
      if (result.ok) {
        set({ hasAiKey: result.secrets.hasAiKey })
      }
    } catch {
      // Ignore secret delete failures to keep UI responsive.
    }
  },
  saveGitHubToken: async (token: string) => {
    try {
      const result = await window.api.saveSecret({ type: 'github', value: token })
      if (result.ok) {
        set({ hasGitHubToken: result.secrets.hasGitHubToken })
      }
    } catch {
      // Ignore secret save failures to keep UI responsive.
    }
  },
  clearGitHubToken: async () => {
    try {
      const result = await window.api.deleteSecret({ type: 'github' })
      if (result.ok) {
        set({ hasGitHubToken: result.secrets.hasGitHubToken })
      }
    } catch {
      // Ignore secret delete failures to keep UI responsive.
    }
  },
  saveGitLabToken: async (token: string) => {
    try {
      const result = await window.api.saveSecret({ type: 'gitlab', value: token })
      if (result.ok) {
        set({ hasGitLabToken: result.secrets.hasGitLabToken })
      }
    } catch {
      // Ignore secret save failures to keep UI responsive.
    }
  },
  clearGitLabToken: async () => {
    try {
      const result = await window.api.deleteSecret({ type: 'gitlab' })
      if (result.ok) {
        set({ hasGitLabToken: result.secrets.hasGitLabToken })
      }
    } catch {
      // Ignore secret delete failures to keep UI responsive.
    }
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
      set({ prResult: { status: 'loading' } })
      const result = await window.api.createPullRequest(repoPath, prForm)
      if (result.success) {
        set({ prResult: { status: 'success', url: result.url } })
      } else {
        set({ prResult: { status: 'error', message: result.error } })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'PR creation failed.'
      set({ prResult: { status: 'error', message } })
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
    try {
      const result = await window.api.saveSecret({ type: 'ssh', action: 'add', name, privateKey })
      if (!result.ok) {
        return
      }
      const account = result.secrets.accounts[result.secrets.accounts.length - 1]
      set((state) => ({
        accounts: result.secrets.accounts,
        selectedAccountId: account?.id ?? state.selectedAccountId
      }))
    } catch {
      // Ignore secret save failures to keep UI responsive.
    }
  },
  deleteAccount: async (id: string) => {
    try {
      const result = await window.api.deleteSecret({ type: 'ssh', id })
      if (get().defaultAccountId === id) {
        await get().updateSettings({ defaultAccountId: null })
      }
      if (result.ok) {
        set((state) => ({
          accounts: result.secrets.accounts,
          selectedAccountId: state.selectedAccountId === id ? null : state.selectedAccountId
        }))
      }
    } catch {
      // Ignore secret delete failures to keep UI responsive.
    }
  },
  renameAccount: async (id: string, name: string) => {
    try {
      const result = await window.api.saveSecret({ type: 'ssh', action: 'rename', id, name })
      if (result.ok) {
        set({ accounts: result.secrets.accounts })
      }
    } catch {
      // Ignore secret rename failures to keep UI responsive.
    }
  },
  setSelectedAccountId: (id) => set({ selectedAccountId: id }),
  applyStatusUpdate: (repoPath, status) => {
    if (get().activeRepoPath !== repoPath) {
      return
    }
    set({
      status,
      stagedSummary: {
        count: status.staged.length,
        files: status.staged.slice(0, 5)
      },
      lastUpdatedAt: Date.now()
    })
  }
}))
