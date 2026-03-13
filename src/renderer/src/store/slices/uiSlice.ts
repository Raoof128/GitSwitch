import {
  beginTask,
  buildFeedback,
  normalizeErrorMessage,
  type SliceCreator,
  type UiSliceState
} from './types'

export const createUiSlice: SliceCreator<UiSliceState> = (set, get) => ({
  actionFeedback: null,
  activeTask: null,
  diffViewType: 'split',
  focusedDiffFile: null,
  ignoreWhitespace: false,
  onboardingDismissed: false,
  prForm: {
    title: '',
    body: '',
    baseBranch: 'main',
    headBranch: '',
    draft: false
  },
  prModalOpen: false,
  prResult: { status: 'idle' },
  settingsOpen: false,
  settingsTab: 'general',

  clearActionFeedback: () => set({ actionFeedback: null }),
  dismissOnboarding: () => set({ onboardingDismissed: true }),
  setDiffViewType: (viewType) => set({ diffViewType: viewType }),
  setIgnoreWhitespace: (value) => set({ ignoreWhitespace: value }),
  setFocusedDiffFile: (filePath) => set({ focusedDiffFile: filePath }),
  openSettings: (tab = 'general') => set({ settingsOpen: true, settingsTab: tab }),
  setSettingsTab: (tab) => set({ settingsTab: tab }),
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
      beginTask(set, 'Creating pull request', `${prForm.headBranch} -> ${prForm.baseBranch}`)
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
  }
})
