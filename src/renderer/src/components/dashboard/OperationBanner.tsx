import { useEffect, useState, type JSX } from 'react'

type BannerTone = 'error' | 'info' | 'success' | 'warning'

type Feedback = {
  tone: BannerTone
  title: string
  detail?: string
  suggestion?: string
  ts: number
}

type ActiveTask = {
  label: string
  detail?: string
  startedAt: number
}

type OperationBannerProps = {
  activeTask: ActiveTask | null
  feedback: Feedback | null
  onDismiss: () => void
}

const toneBorderColor: Record<BannerTone, string> = {
  error: '#ff3366',
  info: '#00ffaa',
  success: '#00ffaa',
  warning: '#ffcc00'
}

const toneTextColor: Record<BannerTone, string> = {
  error: '#ff3366',
  info: '#00ffaa',
  success: '#00ffaa',
  warning: '#ffcc00'
}

const toneGlow: Record<BannerTone, string> = {
  error: '0 0 8px rgba(255, 51, 102, 0.4)',
  info: '0 0 8px rgba(0, 255, 170, 0.4)',
  success: '0 0 8px rgba(0, 255, 170, 0.4)',
  warning: '0 0 8px rgba(255, 204, 0, 0.4)'
}

export function OperationBanner({
  activeTask,
  feedback,
  onDismiss
}: OperationBannerProps): JSX.Element | null {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!activeTask) {
      return
    }
    const interval = setInterval(() => {
      setElapsed(Math.round((Date.now() - activeTask.startedAt) / 1000))
    }, 1000)
    return () => {
      clearInterval(interval)
      setElapsed(0)
    }
  }, [activeTask])

  if (!activeTask && !feedback) {
    return null
  }

  if (activeTask) {
    return (
      <div
        className="flex items-start justify-between gap-4 border border-[#2a2a2a] bg-[#141414] px-4 py-3"
        style={{ borderLeftWidth: '2px', borderLeftColor: '#00ffaa' }}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-[#00ffaa] border-t-transparent" />
          <div>
            <div className="text-sm font-semibold text-[#e0e0e0]">{activeTask.label}</div>
            {activeTask.detail && (
              <div className="mt-1 text-xs text-[#888888]">{activeTask.detail}</div>
            )}
          </div>
        </div>
        <div
          className="label-brutal text-[#00ffaa]"
          style={{ textShadow: '0 0 8px rgba(0, 255, 170, 0.4)' }}
        >
          {elapsed > 0 ? `${elapsed}s` : 'Working'}
        </div>
      </div>
    )
  }

  if (!feedback) {
    return null
  }

  const borderColor = toneBorderColor[feedback.tone]
  const textColor = toneTextColor[feedback.tone]
  const glow = toneGlow[feedback.tone]

  return (
    <div
      className="flex items-start justify-between gap-4 border border-[#2a2a2a] bg-[#141414] px-4 py-3"
      style={{ borderLeftWidth: '2px', borderLeftColor: borderColor }}
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold" style={{ color: textColor, textShadow: glow }}>
          {feedback.title}
        </div>
        {feedback.detail && (
          <div className="mt-1 text-xs text-[#e0e0e0] opacity-90">{feedback.detail}</div>
        )}
        {feedback.suggestion && (
          <div className="mt-2 text-[11px] text-[#e0e0e0]/90">Next step: {feedback.suggestion}</div>
        )}
      </div>
      <button type="button" onClick={onDismiss} className="btn-neon px-2 py-1 text-[10px]">
        Dismiss
      </button>
    </div>
  )
}
