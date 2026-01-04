import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRepoStore } from '../../store/useRepoStore'
import { scaleTap, useReducedMotionSafe } from '../motion/motion'

export function RemoteConfig() {
    const { activeRepoPath, remotes, setRemoteOrigin, reducedMotion } = useRepoStore()
    const [remoteUrl, setRemoteUrl] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [saving, setSaving] = useState(false)
    const reduceMotion = useReducedMotionSafe(reducedMotion)

    const originRemote = remotes.find((r) => r.name === 'origin')
    const hasOrigin = Boolean(originRemote)

    const handleSave = async () => {
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
        <div className="mt-4 rounded-md border-2 border-[var(--ui-border)] bg-[var(--ui-panel)]/60 p-3">
            <div className="mb-2">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--ui-text-muted)]">
                    Remote Origin
                </div>
            </div>

            {hasOrigin ? (
                <div className="mb-2 text-[11px]">
                    <span className="text-emerald-300">✓</span>{' '}
                    <span className="break-all text-[var(--ui-text-muted)]">
                        {originRemote?.url || 'Set'}
                    </span>
                </div>
            ) : (
                <div className="mb-2 text-[11px] text-amber-400">⚠️ No remote origin configured</div>
            )}

            <div className="space-y-2">
                <input
                    value={remoteUrl}
                    onChange={(e) => {
                        setRemoteUrl(e.target.value)
                        setError(null)
                    }}
                    placeholder={hasOrigin ? 'Update remote URL...' : 'git@github.com:user/repo.git'}
                    className="w-full rounded-md border-2 border-[var(--ui-border)] bg-[var(--ui-panel)] px-2 py-1 text-xs text-slate-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ui-accent)]"
                />

                {error && (
                    <div className="rounded bg-rose-500/10 border border-rose-500/20 px-2 py-1 text-[10px] text-rose-400">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-[10px] text-emerald-300">
                        ✓ Remote origin saved
                    </div>
                )}

                <motion.button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !remoteUrl.trim()}
                    whileTap={scaleTap(reduceMotion)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md border-2 border-violet-500/40 bg-violet-500/10 py-1.5 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-500/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {saving ? (
                        <svg
                            className="h-3.5 w-3.5 animate-spin"
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
                    {hasOrigin ? 'Update Origin' : 'Set Origin'}
                </motion.button>
            </div>
        </div>
    )
}
