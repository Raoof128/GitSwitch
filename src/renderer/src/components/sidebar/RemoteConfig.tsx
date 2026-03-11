import { useState, JSX } from 'react'
import { motion } from 'framer-motion'
import { useRepoStore } from '../../store/useRepoStore'
import { scaleTap, useReducedMotionSafe } from '../motion/motion'

export function RemoteConfig(): JSX.Element | null {
  const { activeRepoPath, remotes, setRemoteOrigin, reducedMotion } = useRepoStore()
  const [remoteUrl, setRemoteUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const reduceMotion = useReducedMotionSafe(reducedMotion)

  const originRemote = remotes.find((r) => r.name === 'origin')
  const hasOrigin = Boolean(originRemote)

  const handleSave = async (): Promise<void> => {
    if (!remoteUrl.trim()) {
      setError('Please enter a remote URL.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    const result = await setRemoteOrigin(remoteUrl.trim())
    setSaving(false)

    if (result.ok) {
      setSuccess(true)
      setRemoteUrl('')
      setTimeout(() => setSuccess(false), 3000)
    } else {
      setError(result.error || 'Failed to set remote origin.')
    }
  }

  if (!activeRepoPath) {
    return null
  }

  return (
    <div className="mt-4 border border-[#2a2a2a] bg-[#141414] p-3">
      <div className="mb-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">
          Remote Origin
        </div>
      </div>

      {hasOrigin ? (
        <div className="mb-2 text-[11px]">
          <span className="text-[#00ffaa]" style={{ textShadow: '0 0 8px rgba(0, 255, 170, 0.6)' }}>✓</span>{' '}
          <span className="break-all font-mono text-[#666666]">
            {originRemote?.url || 'Set'}
          </span>
        </div>
      ) : (
        <div className="mb-2 text-[11px] font-bold text-[#ffcc00]" style={{ textShadow: '0 0 8px rgba(255, 204, 0, 0.4)' }}>
          WARNING: No remote origin configured
        </div>
      )}

      <div className="space-y-2">
        <input
          value={remoteUrl}
          onChange={(e) => {
            setRemoteUrl(e.target.value)
            setError(null)
          }}
          placeholder={hasOrigin ? 'Update remote URL...' : 'git@github.com:user/repo.git'}
          className="w-full border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#e0e0e0] placeholder-[#666666] focus:border-[#00ffaa] focus:shadow-[0_0_12px_rgba(0,255,170,0.15)] focus:outline-none"
        />

        {error && (
          <div className="border border-[#ff3366]/30 bg-[#ff3366]/5 px-2 py-1 text-[10px] font-bold text-[#ff3366]" style={{ textShadow: '0 0 8px rgba(255, 51, 102, 0.4)' }}>
            {error}
          </div>
        )}

        {success && (
          <div className="border border-[#00ffaa]/30 bg-[#00ffaa]/5 px-2 py-1 text-[10px] font-bold text-[#00ffaa]" style={{ textShadow: '0 0 8px rgba(0, 255, 170, 0.6)' }}>
            ORIGIN SAVED
          </div>
        )}

        <motion.button
          type="button"
          onClick={handleSave}
          disabled={saving || !remoteUrl.trim()}
          whileTap={scaleTap(reduceMotion)}
          className="flex w-full items-center justify-center gap-1.5 border border-[#00ffaa] py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#00ffaa] transition-shadow hover:shadow-[0_0_20px_rgba(0,255,170,0.15)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <svg
              className="h-3.5 w-3.5 animate-spin text-[#00ffaa]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              className="h-3.5 w-3.5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          )}
          {hasOrigin ? 'UPDATE ORIGIN' : 'SET ORIGIN'}
        </motion.button>
      </div>
    </div>
  )
}
