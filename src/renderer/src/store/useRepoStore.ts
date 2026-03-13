import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createAccountsSlice } from './slices/accountsSlice'
import { createGitSlice } from './slices/gitSlice'
import { createReposSlice } from './slices/reposSlice'
import { createSettingsSlice } from './slices/settingsSlice'
import type { RepoState } from './slices/types'
import { createUiSlice } from './slices/uiSlice'

export type { SettingsTab } from './slices/types'

const UI_STORAGE_KEY = 'gitswitch-ui'

export const useRepoStore = create<RepoState>()(
  persist(
    (set, get) => ({
      ...createGitSlice(set, get),
      ...createSettingsSlice(set, get),
      ...createAccountsSlice(set, get),
      ...createUiSlice(set, get),
      ...createReposSlice(set, get)
    }),
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
