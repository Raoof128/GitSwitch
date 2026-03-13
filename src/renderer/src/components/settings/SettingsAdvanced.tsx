import { useEffect, useState, JSX } from 'react'
import { useRepoStore } from '../../store/useRepoStore'

export function SettingsAdvanced(): JSX.Element {
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
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#00ffaa]">
        Advanced
      </div>
      <div className="rounded-none border border-[#2a2a2a] bg-[#141414] p-4 text-xs">
        <div className="mb-3">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">
            Diff size limit (lines)
          </label>
          <input
            value={limitLines}
            onChange={(event) => setLimitLines(Number(event.target.value))}
            type="number"
            min={50}
            max={2000}
            className="w-full rounded-none border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#e0e0e0]"
          />
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">
            Diff size limit (KB)
          </label>
          <input
            value={limitKb}
            onChange={(event) => setLimitKb(Number(event.target.value))}
            type="number"
            min={10}
            max={512}
            className="w-full rounded-none border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#e0e0e0]"
          />
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">
            AI timeout (seconds)
          </label>
          <input
            value={timeout}
            onChange={(event) => setTimeoutValue(Number(event.target.value))}
            type="number"
            min={3}
            max={60}
            className="w-full rounded-none border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#e0e0e0]"
          />
        </div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[#666666]">Enable AI redaction</span>
          <input
            type="checkbox"
            checked={redaction}
            onChange={(event) => setRedaction(event.target.checked)}
            className="h-4 w-4 rounded-none accent-[#00ffaa]"
          />
        </div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[#666666]">Strict host key checking</span>
          <input
            type="checkbox"
            checked={strictHost}
            onChange={(event) => setStrictHost(event.target.checked)}
            className="h-4 w-4 rounded-none accent-[#00ffaa]"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="btn-neon rounded-none px-3 py-1 text-xs font-semibold"
          >
            Save Advanced
          </button>
          <div className="text-[10px] text-[#666666]">Reset disabled in hardened mode.</div>
        </div>
      </div>
    </section>
  )
}
