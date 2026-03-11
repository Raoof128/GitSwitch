import { useEffect, useMemo, useState, JSX } from 'react'
import { useRepoStore } from '../../store/useRepoStore'

export function SettingsIntegrations(): JSX.Element {
  const {
    aiCloudModel,
    aiLocalModel,
    aiLocalUrl,
    aiProvider,
    aiPersona,
    hasAiKey,
    hasGitHubToken,
    hasGitLabToken,
    saveAiKey,
    clearAiKey,
    saveGitHubToken,
    clearGitHubToken,
    saveGitLabToken,
    clearGitLabToken,
    updateSettings
  } = useRepoStore()

  const [provider, setProvider] = useState(aiProvider)
  const [persona, setPersona] = useState(aiPersona)
  const [localUrl, setLocalUrl] = useState(aiLocalUrl)
  const [localModel, setLocalModel] = useState(aiLocalModel)
  const [cloudModel, setCloudModel] = useState(aiCloudModel)
  const [cloudKey, setCloudKey] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [gitlabToken, setGitlabToken] = useState('')
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(
    null
  )

  useEffect(() => {
    setProvider(aiProvider)
  }, [aiProvider])

  useEffect(() => {
    setPersona(aiPersona)
  }, [aiPersona])

  useEffect(() => {
    setLocalUrl(aiLocalUrl)
  }, [aiLocalUrl])

  useEffect(() => {
    setLocalModel(aiLocalModel)
  }, [aiLocalModel])

  useEffect(() => {
    setCloudModel(aiCloudModel)
  }, [aiCloudModel])

  const providerLabel = useMemo(() => {
    if (provider === 'local') return 'Local LLM'
    if (provider === 'cloud') return 'Cloud LLM'
    return 'Offline'
  }, [provider])

  const handleSaveAi = async (): Promise<void> => {
    try {
      await updateSettings({
        aiCloudModel: cloudModel,
        aiLocalModel: localModel,
        aiLocalUrl: localUrl,
        aiProvider: provider,
        aiPersona: persona
      })
      setFeedback({ tone: 'success', message: 'AI integration settings saved.' })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save AI integration settings.'
      setFeedback({ tone: 'error', message })
    }
  }

  const handleSaveCloudKey = async (): Promise<void> => {
    if (!cloudKey.trim()) {
      return
    }
    try {
      await saveAiKey(cloudKey.trim())
      setCloudKey('')
      setFeedback({ tone: 'success', message: 'AI API key saved securely.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save the AI API key.'
      setFeedback({ tone: 'error', message })
    }
  }

  const handleSaveGitHub = async (): Promise<void> => {
    if (!githubToken.trim()) {
      return
    }
    try {
      await saveGitHubToken(githubToken.trim())
      setGithubToken('')
      setFeedback({ tone: 'success', message: 'GitHub token saved securely.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save the GitHub token.'
      setFeedback({ tone: 'error', message })
    }
  }

  const handleSaveGitLab = async (): Promise<void> => {
    if (!gitlabToken.trim()) {
      return
    }
    try {
      await saveGitLabToken(gitlabToken.trim())
      setGitlabToken('')
      setFeedback({ tone: 'success', message: 'GitLab token saved securely.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save the GitLab token.'
      setFeedback({ tone: 'error', message })
    }
  }

  const handleClearAi = async (): Promise<void> => {
    try {
      await clearAiKey()
      setFeedback({ tone: 'success', message: 'AI API key removed.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove the AI API key.'
      setFeedback({ tone: 'error', message })
    }
  }

  const handleClearGitHub = async (): Promise<void> => {
    try {
      await clearGitHubToken()
      setFeedback({ tone: 'success', message: 'GitHub token removed.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove the GitHub token.'
      setFeedback({ tone: 'error', message })
    }
  }

  const handleClearGitLab = async (): Promise<void> => {
    try {
      await clearGitLabToken()
      setFeedback({ tone: 'success', message: 'GitLab token removed.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove the GitLab token.'
      setFeedback({ tone: 'error', message })
    }
  }

  return (
    <section className="space-y-6">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#00ffaa]">
        Integrations
      </div>

      {feedback && (
        <div
          className={`rounded-none border px-3 py-2 text-xs ${
            feedback.tone === 'success'
              ? 'border-[#00ffaa]/30 bg-[rgba(0,255,170,0.06)] text-[#00ffaa]'
              : 'border-[#ff3366]/30 bg-[rgba(255,51,102,0.06)] text-[#ff3366]'
          }`}
          style={
            feedback.tone === 'success'
              ? { textShadow: '0 0 6px rgba(0,255,170,0.4)' }
              : { textShadow: '0 0 6px rgba(255,51,102,0.4)' }
          }
        >
          {feedback.message}
        </div>
      )}

      <div className="rounded-none border border-[#2a2a2a] bg-[#141414] p-4 text-xs">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#00ffaa]">
          AI Commit Generator
        </div>
        <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">
              Provider
            </label>
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value as typeof provider)}
              className="w-full rounded-none border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#e0e0e0]"
            >
              <option value="offline">Offline</option>
              <option value="local">Local LLM</option>
              <option value="cloud">Cloud LLM</option>
            </select>
            <div className="mt-1 text-[10px] text-[#666666]">
              Active: {providerLabel}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">
              Persona
            </label>
            <select
              value={persona}
              onChange={(event) => setPersona(event.target.value as typeof persona)}
              className="w-full rounded-none border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#e0e0e0]"
            >
              <option value="standard">Standard Developer</option>
              <option value="cybersecurity">Cybersecurity Expert</option>
            </select>
            <div className="mt-1 text-[10px] text-[#666666]">
              Determines commit style
            </div>
          </div>
        </div>

        <div className="mb-3 rounded-none border border-[#2a2a2a] bg-[#0a0a0a] p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#00ffaa]">
            Local LLM
          </div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">
            Base URL
          </label>
          <input
            value={localUrl}
            onChange={(event) => setLocalUrl(event.target.value)}
            placeholder="http://localhost:11434/api/generate"
            className="mb-2 w-full rounded-none border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#e0e0e0]"
          />
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">
            Model
          </label>
          <input
            value={localModel}
            onChange={(event) => setLocalModel(event.target.value)}
            placeholder="qwen2.5-coder:7b"
            className="mb-2 w-full rounded-none border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#e0e0e0]"
          />
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-[#666666]">
              Connection test disabled in hardened mode.
            </div>
          </div>
        </div>

        <div className="mb-3 rounded-none border border-[#2a2a2a] bg-[#0a0a0a] p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#00ffaa]">
            Cloud LLM
          </div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">
            API key
          </label>
          <input
            value={cloudKey}
            onChange={(event) => setCloudKey(event.target.value)}
            placeholder={hasAiKey ? 'API key stored' : 'API key'}
            type="password"
            className="mb-2 w-full rounded-none border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#e0e0e0]"
          />
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">
            Model
          </label>
          <select
            value={cloudModel}
            onChange={(event) => setCloudModel(event.target.value)}
            className="mb-2 w-full rounded-none border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#e0e0e0]"
          >
            <optgroup label="Google Gemini 3 (Latest)">
              <option value="gemini-3-flash">Gemini 3 Flash (Fastest & Efficient)</option>
              <option value="gemini-3-pro">Gemini 3 Pro (Most Capable)</option>
              <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite (Preview)</option>
            </optgroup>
            <optgroup label="Google Gemini 2.5">
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Budget)</option>
            </optgroup>
            <optgroup label="Google Gemini 2.0">
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              <option value="gemini-2.0-pro-exp">Gemini 2.0 Pro (Exp)</option>
              <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite</option>
            </optgroup>
            <optgroup label="Google Gemini 1.5 (Legacy)">
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash 8B</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            </optgroup>
            <optgroup label="Legacy / Experimental">
              <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash Exp</option>
              <option value="gemini-exp-1206">Gemini Exp 1206</option>
              <option value="gemini-1.0-pro">Gemini 1.0 Pro</option>
            </optgroup>
          </select>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveCloudKey}
              className="btn-neon rounded-none px-2 py-1 text-xs"
            >
              Save key
            </button>
            <button
              type="button"
              onClick={() => void handleClearAi()}
              className="btn-neon-pink rounded-none px-2 py-1 text-xs"
            >
              Remove key
            </button>
            <span
              className={hasAiKey ? 'text-[#00ffaa]' : 'text-[#666666]'}
              style={hasAiKey ? { textShadow: '0 0 6px rgba(0,255,170,0.4)' } : undefined}
            >
              {hasAiKey ? 'Connected' : 'Not connected'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveAi}
          className="btn-neon rounded-none px-3 py-1 text-xs font-semibold"
        >
          Securely Save Configuration
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-none border border-[#2a2a2a] bg-[#141414] p-4 text-xs">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#00ffaa]">
            GitHub
          </div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">
            Personal Access Token
          </label>
          <input
            value={githubToken}
            onChange={(event) => setGithubToken(event.target.value)}
            placeholder={hasGitHubToken ? 'Token stored' : 'Token'}
            type="password"
            className="mb-2 w-full rounded-none border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#e0e0e0]"
          />
          <div className="mb-3 text-[10px] text-[#666666]">
            Required scopes: repo, pull_requests
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveGitHub}
                className="btn-neon flex-1 rounded-none px-2 py-1 text-xs"
              >
                Save token
              </button>
              <button
                type="button"
                onClick={() => void handleClearGitHub()}
                className="btn-neon-pink flex-1 rounded-none px-2 py-1 text-xs"
              >
                Remove
              </button>
            </div>
            <div className="flex justify-end">
              <span
                className={hasGitHubToken ? 'text-[#00ffaa]' : 'text-[#666666]'}
                style={hasGitHubToken ? { textShadow: '0 0 6px rgba(0,255,170,0.4)' } : undefined}
              >
                {hasGitHubToken ? 'Connected' : 'Not connected'}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-none border border-[#2a2a2a] bg-[#141414] p-4 text-xs">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#00ffaa]">
            GitLab
          </div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">
            Access Token
          </label>
          <input
            value={gitlabToken}
            onChange={(event) => setGitlabToken(event.target.value)}
            placeholder={hasGitLabToken ? 'Token stored' : 'Token'}
            type="password"
            className="mb-2 w-full rounded-none border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#e0e0e0]"
          />
          <div className="mb-3 text-[10px] text-[#666666]">Required scopes: api</div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveGitLab}
                className="btn-neon flex-1 rounded-none px-2 py-1 text-xs"
              >
                Save token
              </button>
              <button
                type="button"
                onClick={() => void handleClearGitLab()}
                className="btn-neon-pink flex-1 rounded-none px-2 py-1 text-xs"
              >
                Remove
              </button>
            </div>
            <div className="flex justify-end">
              <span
                className={hasGitLabToken ? 'text-[#00ffaa]' : 'text-[#666666]'}
                style={hasGitLabToken ? { textShadow: '0 0 6px rgba(0,255,170,0.4)' } : undefined}
              >
                {hasGitLabToken ? 'Connected' : 'Not connected'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
