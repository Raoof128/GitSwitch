import type { SettingsSliceState, SliceCreator } from './types'

export const createSettingsSlice: SliceCreator<SettingsSliceState> = (set, get) => ({
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
  strictHostKeyChecking: true,
  theme: 'dark',

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
  }
})
