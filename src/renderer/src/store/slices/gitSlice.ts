import type { DiffMode, GitStatus } from '../../../../index'
import { getEffectiveAccountId } from '../account-selection'
import {
  beginTask,
  EMPTY_STAGED_SUMMARY,
  normalizeErrorMessage,
  setErrorFeedback,
  setFeedback,
  updateRecentBranches,
  type GitSliceState,
  type RepoState,
  type SliceCreator
} from './types'

let commitResetTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Cancellation token for diff/status loads.
 * When the active repo changes, any in-flight loads for the old repo are abandoned
 * by bumping the generation counter. Each async action captures the counter at start
 * and bails if it no longer matches when the response arrives.
 */
let loadGeneration = 0

const clearCommitTimer = (): void => {
  if (commitResetTimer) {
    clearTimeout(commitResetTimer)
    commitResetTimer = null
  }
}

export const bumpLoadGeneration = (): void => {
  loadGeneration++
}

export const getLoadGeneration = (): number => loadGeneration

const applyStatusState = (
  set: (
    partial: Partial<RepoState> | ((state: RepoState) => Partial<RepoState>),
    replace?: false
  ) => void,
  get: () => RepoState,
  repoPath: string,
  status: GitStatus
): void => {
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

const clearRepoSurface = (set: (partial: Partial<RepoState>) => void): void => {
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

export const createGitSlice: SliceCreator<GitSliceState> = (set, get) => ({
  branchStatus: 'idle',
  branches: [],
  commitBody: '',
  commitError: null,
  commitStatus: 'idle',
  commitTitle: '',
  diffText: '',
  generateStatus: 'idle',
  lastFetchAt: null,
  lastUpdatedAt: null,
  publishStatus: null,
  remotes: [],
  stageStatus: 'idle',
  stagedDiffText: '',
  stagedSummary: EMPTY_STAGED_SUMMARY,
  status: null,
  statusRepoPath: null,
  syncAction: null,
  syncStatus: 'idle',

  setCommitTitle: (title) => set({ commitTitle: title, commitError: null, commitStatus: 'idle' }),
  setCommitBody: (body) => set({ commitBody: body, commitError: null, commitStatus: 'idle' }),

  refreshStatus: async () => {
    const repoPath = get().activeRepoPath
    if (!repoPath) {
      clearRepoSurface(set)
      return
    }

    const gen = loadGeneration
    try {
      const status = await window.api.getGitStatus(repoPath)
      if (gen !== loadGeneration || get().activeRepoPath !== repoPath) {
        return
      }
      applyStatusState(set, get, repoPath, status)
    } catch {
      if (gen !== loadGeneration) return
      const previousStatus = get().status
      const previousRepoPath = get().statusRepoPath
      if (previousStatus && previousRepoPath === repoPath) {
        return
      }
      clearRepoSurface(set)
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
      beginTask(set, 'Switching branch', branchName)
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
        recentBranchesByRepo: updateRecentBranches(state.recentBranchesByRepo, repoPath, branchName)
      }))
      setFeedback(
        set,
        'success',
        'Branch switched',
        `${branchName} is now active.`,
        'Review the repo overview to confirm ahead/behind state after switching.'
      )
      return true
    } catch (error) {
      set({ branchStatus: 'idle' })
      setErrorFeedback(
        set,
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
        set,
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
        recentBranchesByRepo: updateRecentBranches(state.recentBranchesByRepo, repoPath, branchName)
      }))
      setFeedback(
        set,
        'success',
        'Branch created',
        `${branchName} is ready for work.`,
        'Use the command palette or branch panel to jump back to recent branches.'
      )
      return true
    } catch (error) {
      set({ branchStatus: 'idle' })
      setErrorFeedback(
        set,
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

    const gen = loadGeneration
    try {
      const diffText = await window.api.getGitDiff(repoPath, mode, {
        ignoreWhitespace: get().ignoreWhitespace
      })
      // Discard stale response if repo changed during load
      if (gen !== loadGeneration) return
      set({ diffText })
    } catch (error) {
      if (gen !== loadGeneration) return
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

    const gen = loadGeneration
    try {
      const stagedDiffText = await window.api.getGitDiff(repoPath, 'staged', {
        ignoreWhitespace: get().ignoreWhitespace
      })
      if (gen !== loadGeneration) return
      set({ stagedDiffText })
    } catch (error) {
      if (gen !== loadGeneration) return
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
      beginTask(set, 'Staging all changes', 'Adding tracked worktree changes to the next commit.')
      set({ stageStatus: 'loading' })
      await window.api.gitStageAll(repoPath)
      await Promise.all([get().refreshStatus(), get().loadDiff('unstaged'), get().loadStagedDiff()])
      set({ stageStatus: 'idle' })
      setFeedback(
        set,
        'success',
        'Changes staged',
        'All tracked changes are now staged for commit.',
        'Review the staged diff before committing.'
      )
    } catch (error) {
      set({ stageStatus: 'idle' })
      setErrorFeedback(
        set,
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
        set,
        'Discarding unstaged changes',
        'Tracked worktree edits will be restored to HEAD.'
      )
      await window.api.gitDiscardChanges(repoPath)
      await Promise.all([get().refreshStatus(), get().loadDiff('unstaged'), get().loadStagedDiff()])
      set({ focusedDiffFile: null })
      setFeedback(
        set,
        'warning',
        'Unstaged changes discarded',
        'Tracked worktree edits were restored to HEAD. Untracked files were preserved.'
      )
      return true
    } catch (error) {
      setErrorFeedback(
        set,
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
        set,
        'Hard resetting repository',
        'Staged and unstaged tracked changes will be lost.'
      )
      await window.api.gitHardReset(repoPath)
      await Promise.all([get().refreshStatus(), get().loadDiff('unstaged'), get().loadStagedDiff()])
      set({ focusedDiffFile: null })
      setFeedback(
        set,
        'warning',
        'Repository reset',
        'Tracked staged and unstaged changes were discarded and HEAD was restored.'
      )
      return true
    } catch (error) {
      setErrorFeedback(
        set,
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
      beginTask(set, 'Saving remote origin', url)
      await window.api.gitSetRemoteOrigin(repoPath, url)
      await get().refreshRemotes()
      setFeedback(
        set,
        'success',
        'Remote origin updated',
        'Future fetch, pull, and push operations will use the saved origin URL.'
      )
      return { ok: true }
    } catch (error) {
      const message = normalizeErrorMessage(error, 'Failed to set remote origin.')
      setErrorFeedback(
        set,
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
      beginTask(set, 'Updating .gitignore', filePath)
      await window.api.gitIgnore(repoPath, filePath)
      await get().refreshStatus()
      setFeedback(
        set,
        'info',
        'File ignored',
        `${filePath} was added to .gitignore.`,
        'Review the file list to confirm the ignore rule behaves as expected.'
      )
      return { ok: true }
    } catch (error) {
      const message = normalizeErrorMessage(error, 'Failed to ignore file.')
      setErrorFeedback(
        set,
        'Ignore failed',
        error,
        'Failed to add the file to .gitignore.',
        'Confirm the file still exists in the repository and retry if needed.'
      )
      return { ok: false, error: message }
    }
  },

  generateCommitMessage: async () => {
    const repoPath = get().activeRepoPath
    const status = get().status
    const hasChanges = Boolean(status?.files.length) || Boolean(status?.staged.length)
    if (!repoPath || !hasChanges) {
      return
    }

    try {
      beginTask(
        set,
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
        set,
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
        set,
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
      beginTask(set, 'Creating commit', title)
      set({ commitError: null, commitStatus: 'loading' })
      const result = await window.api.gitCommit(repoPath, title, body || undefined)
      await Promise.all([get().refreshStatus(), get().loadDiff('unstaged'), get().loadStagedDiff()])
      set({ commitTitle: '', commitBody: '', commitStatus: 'success' })
      clearCommitTimer()

      if (commitResetTimer) {
        clearTimeout(commitResetTimer)
      }

      if (get().autoPush) {
        setFeedback(
          set,
          'success',
          'Commit created',
          'The commit was saved locally. Auto-push is running next.'
        )
        await get().push()
      } else {
        setFeedback(
          set,
          'success',
          'Commit created',
          result.hash ? `Commit ${result.hash.slice(0, 7)} was recorded locally.` : 'Commit saved.'
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
        set,
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
        set,
        'Push unavailable',
        new Error('No SSH account selected.'),
        'Push requires an SSH account.',
        'Choose a default SSH account in Settings -> Accounts or use the quick account switcher.'
      )
      return false
    }

    try {
      beginTask(set, 'Pushing to origin', 'Publishing the current branch to the configured remote.')
      set({ syncStatus: 'loading', syncAction: 'push' })
      await window.api.gitPush(repoPath, accountId)
      await get().refreshStatus()
      setFeedback(
        set,
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
        set,
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
        set,
        'Pull unavailable',
        new Error('No SSH account selected.'),
        'Pull requires an SSH account.',
        'Choose a default SSH account in Settings -> Accounts or use the quick account switcher.'
      )
      return false
    }

    try {
      beginTask(set, 'Pulling from origin', 'Fetching and applying the latest remote changes.')
      set({ syncStatus: 'loading', syncAction: 'pull', commitStatus: 'loading' })
      const result = await window.api.gitPull(repoPath, accountId)

      await Promise.all([get().refreshStatus(), get().loadDiff('unstaged'), get().loadStagedDiff()])

      set({ commitStatus: 'idle', lastFetchAt: Date.now() })
      setFeedback(
        set,
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
        set,
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
        beginTask(set, 'Fetching remote state', 'Refreshing ahead/behind status from origin.')
      }
      set({ syncStatus: 'loading', syncAction: 'fetch' })
      await window.api.gitFetch(repoPath, accountId)
      await get().refreshStatus()
      set({ lastFetchAt: Date.now() })
      if (!silent) {
        setFeedback(
          set,
          'success',
          'Fetch complete',
          'Remote branch status has been refreshed.',
          'Review ahead/behind counts in the repo overview.'
        )
      }
    } catch (error) {
      if (!silent) {
        setErrorFeedback(
          set,
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

  applyStatusUpdate: (repoPath, status) => {
    if (get().activeRepoPath !== repoPath) {
      return
    }

    applyStatusState(set, get, repoPath, status)
  }
})
