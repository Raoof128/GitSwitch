import { assertSecretResult, type AccountsSliceState, type SliceCreator } from './types'

export const createAccountsSlice: SliceCreator<AccountsSliceState> = (set, get) => ({
  accounts: [],
  selectedAccountId: null,

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

  setSelectedAccountId: (id) => set({ selectedAccountId: id })
})
