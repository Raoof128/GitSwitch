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
    await updateSettings({
      aiCloudModel: cloudModel,
      aiLocalModel: localModel,
      aiLocalUrl: localUrl,
      aiProvider: provider,
      aiPersona: persona
    })
  }

  const handleSaveCloudKey = async (): Promise<void> => {
    if (!cloudKey.trim()) {
      return
    }
    await saveAiKey(cloudKey.trim())
    setCloudKey('')
  }

  const handleSaveGitHub = async (): Promise<void> => {
    if (!githubToken.trim()) {
      return
    }
    await saveGitHubToken(githubToken.trim())
    setGithubToken('')
  }

  const handleSaveGitLab = async (): Promise<void> => {
    if (!gitlabToken.trim()) {
      return
    }
    await saveGitLabToken(gitlabToken.trim())
    setGitlabToken('')
  }

  return (
    <section className="space-y-6">
      <div className="text-sm font-semibold">Integrations</div>

      <div className="rounded-md border-2 border-[var(--ui-border)] bg-[var(--ui-panel)]/60 p-4 text-xs">
        <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-[var(--ui-text-muted)]">
          AI Commit Generator
        </div>
        <div className="mb-3 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-[var(--ui-text-muted)]">Provider</label>
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value as typeof provider)}
              className="w-full rounded-md border-2 border-[var(--ui-border)] bg-[var(--ui-panel-muted)] px-2 py-1 text-xs"
            >
              <option value="offline">Offline</option>
              <option value="local">Local LLM</option>
              <option value="cloud">Cloud LLM</option>
            </select>
            <div className="mt-1 text-[10px] text-[var(--ui-text-muted)]">
              Active: {providerLabel}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[var(--ui-text-muted)]">Persona</label>
            <select
              value={persona}
              onChange={(event) => setPersona(event.target.value as typeof persona)}
              className="w-full rounded-md border-2 border-[var(--ui-border)] bg-[var(--ui-panel-muted)] px-2 py-1 text-xs"
            >
              <option value="standard">Standard Developer</option>
              <option value="cybersecurity">Cybersecurity Expert</option>
            </select>
            <div className="mt-1 text-[10px] text-[var(--ui-text-muted)]">
              Determines commit style
            </div>
          </div>
        </div>

        <div className="mb-3 rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] p-3">
          <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-[var(--ui-text-muted)]">
            Local LLM
          </div>
          <label className="mb-1 block text-[var(--ui-text-muted)]">Base URL</label>
          <input
            value={localUrl}
            onChange={(event) => setLocalUrl(event.target.value)}
            placeholder="http://localhost:11434/api/generate"
            className="mb-2 w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] px-2 py-1 text-xs"
          />
          <label className="mb-1 block text-[var(--ui-text-muted)]">Model</label>
          <input
            value={localModel}
            onChange={(event) => setLocalModel(event.target.value)}
            placeholder="qwen2.5-coder:7b"
            className="mb-2 w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] px-2 py-1 text-xs"
          />
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-[var(--ui-text-muted)]">
              Connection test disabled in hardened mode.
            </div>
          </div>
        </div>

        <div className="mb-3 rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] p-3">
          <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-[var(--ui-text-muted)]">
            Cloud LLM
          </div>
          <label className="mb-1 block text-[var(--ui-text-muted)]">API key</label>
          <input
            value={cloudKey}
            onChange={(event) => setCloudKey(event.target.value)}
            placeholder={hasAiKey ? 'API key stored' : 'API key'}
            type="password"
            className="mb-2 w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] px-2 py-1 text-xs"
          />
          <label className="mb-1 block text-[var(--ui-text-muted)]">Model</label>
          <select
            value={cloudModel}
            onChange={(event) => setCloudModel(event.target.value)}
            className="mb-2 w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] px-2 py-1 text-xs"
          >
            <optgroup label="Google Gemini 1.5 (Recommended)">
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast & Cheap)</option>
              <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash 8B (Fastest)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Best Quality)</option>
            </optgroup>
            <optgroup label="Google Gemini Experimental">
              <option value="gemini-exp-1206">Gemini Exp 1206 (Reasoning)</option>
              <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash Exp</option>
            </optgroup>
            <optgroup label="Legacy">
              <option value="gemini-1.0-pro">Gemini 1.0 Pro</option>
            </optgroup>
          </select>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveCloudKey}
              className="rounded-md border border-[var(--ui-border)] px-2 py-1 text-xs hover:bg-[var(--ui-hover)]"
            >
              Save key
            </button>
            <button
              type="button"
              onClick={clearAiKey}
              className="rounded-md border border-[var(--ui-border)] px-2 py-1 text-xs hover:bg-[var(--ui-hover)]"
            >
              Remove key
            </button>
            <span className={hasAiKey ? 'text-emerald-300' : 'text-[var(--ui-text-muted)]'}>
              {hasAiKey ? 'Connected' : 'Not connected'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveAi}
          className="rounded-md border border-[var(--ui-border)] px-3 py-1 text-xs font-semibold hover:bg-[var(--ui-hover)]"
        >
          Securely Save Configuration
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border-2 border-[var(--ui-border)] bg-[var(--ui-panel)]/60 p-4 text-xs">
          <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-[var(--ui-text-muted)]">
            GitHub
          </div>
          <label className="mb-1 block text-[var(--ui-text-muted)]">Personal Access Token</label>
          <input
            value={githubToken}
            onChange={(event) => setGithubToken(event.target.value)}
            placeholder={hasGitHubToken ? 'Token stored' : 'Token'}
            type="password"
            className="mb-2 w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] px-2 py-1 text-xs"
          />
          <div className="mb-3 text-[10px] text-[var(--ui-text-muted)]">
            Required scopes: repo, pull_requests
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveGitHub}
                className="flex-1 rounded-md border border-[var(--ui-border)] px-2 py-1 text-xs hover:bg-[var(--ui-hover)]"
              >
                Save token
              </button>
              <button
                type="button"
                onClick={clearGitHubToken}
                className="flex-1 rounded-md border border-[var(--ui-border)] px-2 py-1 text-xs hover:bg-[var(--ui-hover)]"
              >
                Remove
              </button>
            </div>
            <div className="flex justify-end">
              <span className={hasGitHubToken ? 'text-emerald-300' : 'text-[var(--ui-text-muted)]'}>
                {hasGitHubToken ? '✓ Connected' : 'Not connected'}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-md border-2 border-[var(--ui-border)] bg-[var(--ui-panel)]/60 p-4 text-xs">
          <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-[var(--ui-text-muted)]">
            GitLab
          </div>
          <label className="mb-1 block text-[var(--ui-text-muted)]">Access Token</label>
          <input
            value={gitlabToken}
            onChange={(event) => setGitlabToken(event.target.value)}
            placeholder={hasGitLabToken ? 'Token stored' : 'Token'}
            type="password"
            className="mb-2 w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] px-2 py-1 text-xs"
          />
          <div className="mb-3 text-[10px] text-[var(--ui-text-muted)]">Required scopes: api</div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveGitLab}
                className="flex-1 rounded-md border border-[var(--ui-border)] px-2 py-1 text-xs hover:bg-[var(--ui-hover)]"
              >
                Save token
              </button>
              <button
                type="button"
                onClick={clearGitLabToken}
                className="flex-1 rounded-md border border-[var(--ui-border)] px-2 py-1 text-xs hover:bg-[var(--ui-hover)]"
              >
                Remove
              </button>
            </div>
            <div className="flex justify-end">
              <span className={hasGitLabToken ? 'text-emerald-300' : 'text-[var(--ui-text-muted)]'}>
                {hasGitLabToken ? '✓ Connected' : 'Not connected'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
