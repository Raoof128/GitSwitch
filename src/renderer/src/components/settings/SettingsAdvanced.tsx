import { useEffect, useState } from 'react'
import { useRepoStore } from '../../store/useRepoStore'

export function SettingsAdvanced() {
  const {
    aiRedactionEnabled,
    aiTimeoutSec,
    diffLimitKb,
    diffLimitLines,
    strictHostKeyChecking,
    updateSettings
  } = useRepoStore()

  const [limitLines, setLimitLines] = useState(diffLimitLines)
  const [limitKb, setLimitKb] = useState(diffLimitKb)
  const [timeout, setTimeoutValue] = useState(aiTimeoutSec)
  const [redaction, setRedaction] = useState(aiRedactionEnabled)
  const [strictHost, setStrictHost] = useState(strictHostKeyChecking)

  useEffect(() => {
    setLimitLines(diffLimitLines)
  }, [diffLimitLines])

  useEffect(() => {
    setLimitKb(diffLimitKb)
  }, [diffLimitKb])

  useEffect(() => {
    setTimeoutValue(aiTimeoutSec)
  }, [aiTimeoutSec])

  useEffect(() => {
    setRedaction(aiRedactionEnabled)
  }, [aiRedactionEnabled])

  useEffect(() => {
    setStrictHost(strictHostKeyChecking)
  }, [strictHostKeyChecking])

  const handleSave = async (): Promise<void> => {
    await updateSettings({
      aiRedactionEnabled: redaction,
      aiTimeoutSec: timeout,
      diffLimitKb: limitKb,
      diffLimitLines: limitLines,
      strictHostKeyChecking: strictHost
    })
  }

  return (
    <section className="space-y-4">
      <div className="text-sm font-semibold">Advanced</div>
      <div className="rounded-md border-2 border-[var(--ui-border)] bg-[var(--ui-panel)]/60 p-4 text-xs">
        <div className="mb-3">
          <label className="mb-1 block text-[var(--ui-text-muted)]">Diff size limit (lines)</label>
          <input
            value={limitLines}
            onChange={(event) => setLimitLines(Number(event.target.value))}
            type="number"
            min={50}
            max={2000}
            className="w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] px-2 py-1 text-xs"
          />
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-[var(--ui-text-muted)]">Diff size limit (KB)</label>
          <input
            value={limitKb}
            onChange={(event) => setLimitKb(Number(event.target.value))}
            type="number"
            min={10}
            max={512}
            className="w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] px-2 py-1 text-xs"
          />
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-[var(--ui-text-muted)]">AI timeout (seconds)</label>
          <input
            value={timeout}
            onChange={(event) => setTimeoutValue(Number(event.target.value))}
            type="number"
            min={3}
            max={15}
            className="w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] px-2 py-1 text-xs"
          />
        </div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[var(--ui-text-muted)]">Enable AI redaction</span>
          <input
            type="checkbox"
            checked={redaction}
            onChange={(event) => setRedaction(event.target.checked)}
            className="h-4 w-4 accent-[var(--ui-accent)]"
          />
        </div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[var(--ui-text-muted)]">Strict host key checking</span>
          <input
            type="checkbox"
            checked={strictHost}
            onChange={(event) => setStrictHost(event.target.checked)}
            className="h-4 w-4 accent-[var(--ui-accent)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md border border-[var(--ui-border)] px-3 py-1 text-xs font-semibold hover:bg-[var(--ui-hover)]"
          >
            Save Advanced
          </button>
          <div className="text-[10px] text-[var(--ui-text-muted)]">
            Reset disabled in hardened mode.
          </div>
        </div>
      </div>
    </section>
  )
}
