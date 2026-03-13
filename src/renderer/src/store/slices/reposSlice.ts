import {
  beginTask,
  bumpRecent,
  EMPTY_STAGED_SUMMARY,
  getRepoName,
  MAX_RECENT_REPOS,
  setErrorFeedback,
  setFeedback,
  type ReposSliceState,
  type SliceCreator
} from './types'
import { bumpLoadGeneration } from './gitSlice'

const clearRepoSurface = (set: (partial: Record<string, unknown>) => void): void => {
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

export const createReposSlice: SliceCreator<ReposSliceState> = (set, get) => ({
  activeRepoPath: null,
  pinnedRepoPaths: [],
  recentBranchesByRepo: {},
  recentRepoPaths: [],
  repos: [],

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

    // Release the file watcher for the removed repo
    void window.api?.gitUnwatchRepo?.(path)

    if (!nextActiveRepoPath) {
      clearRepoSurface(set)
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
        set,
        'Could not add repository',
        new Error('No repository path was provided.'),
        'Choose a repository folder.',
        'Pick a folder that already contains a .git directory.'
      )
      return false
    }

    try {
      beginTask(set, 'Opening repository', selected)
      const status = await window.api.getGitStatus(selected)

      set((state) => ({
        activeRepoPath: selected,
        recentRepoPaths: bumpRecent(state.recentRepoPaths, selected, MAX_RECENT_REPOS),
        repos: state.repos.some((repo) => repo.path === selected)
          ? state.repos
          : [...state.repos, { path: selected, name: getRepoName(selected) }]
      }))

      // Apply status inline (mirrors original applyStatusState)
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
        statusRepoPath: selected,
        stagedSummary: {
          count: status.staged.length,
          files: status.staged.slice(0, 5)
        },
        lastUpdatedAt: hasMeaningfulChange ? Date.now() : get().lastUpdatedAt,
        publishStatus: null,
        focusedDiffFile: null
      })

      await Promise.all([
        get().loadDiff('unstaged'),
        get().refreshRemotes(),
        get().refreshBranches()
      ])

      setFeedback(
        set,
        'success',
        'Repository ready',
        `${getRepoName(selected)} is now loaded.`,
        'Use the branch panel or command palette to switch context quickly.'
      )
      return true
    } catch (error) {
      setErrorFeedback(
        set,
        'Could not add repository',
        error,
        'Failed to load the selected repository.',
        'Pick a folder that already contains a .git directory.'
      )
      return false
    }
  },

  setActiveRepo: async (path) => {
    // Cancel any in-flight loads for the previous repo
    bumpLoadGeneration()

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
  }
})
