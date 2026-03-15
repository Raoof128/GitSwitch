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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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

  const handleExport = async (): Promise<void> => {
    if (!window.api?.exportData) return
    const result = await window.api.exportData()
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gitswitch-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteAll = async (): Promise<void> => {
    if (!window.api?.deleteAllData) return
    await window.api.deleteAllData()
    setShowDeleteConfirm(false)
    // Reload the app to reset state
    window.location.reload()
  }

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
      <div className="mt-4 rounded-none border border-[#2a2a2a] bg-[#141414] p-4 text-xs">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#00ffaa]">
          Data Management
        </div>
        <div className="mb-3 text-[10px] text-[#666666]">
          Export all settings and account metadata as JSON, or permanently delete all local data
          including encrypted keys and tokens.
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleExport()}
            className="btn-neon rounded-none px-3 py-1 text-xs"
          >
            Export Data
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-none border border-[#ff3366] px-3 py-1 text-xs font-bold text-[#ff3366] hover:bg-[#ff3366]/10"
          >
            Delete All Data
          </button>
        </div>
        {showDeleteConfirm && (
          <div className="mt-3 border border-[#ff3366]/30 bg-[#ff3366]/5 p-3">
            <div className="mb-2 text-[10px] font-bold text-[#ff3366]">
              This will permanently delete all SSH keys, API tokens, settings, and audit logs. This
              cannot be undone.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleDeleteAll()}
                className="rounded-none border border-[#ff3366] bg-[#ff3366] px-3 py-1 text-xs font-bold text-[#0a0a0a]"
              >
                Confirm Delete
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-neon rounded-none px-3 py-1 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
