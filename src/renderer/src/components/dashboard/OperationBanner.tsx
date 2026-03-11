import type { JSX } from 'react'

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

const toneClasses: Record<BannerTone, string> = {
  error:
    'border-[var(--ui-status-deleted-border)] bg-[var(--ui-status-deleted-bg)] text-[var(--ui-status-deleted)]',
  info: 'border-[var(--ui-accent-border)] bg-[var(--ui-accent-bg)] text-[var(--ui-accent)]',
  success:
    'border-[var(--ui-status-added-border)] bg-[var(--ui-status-added-bg)] text-[var(--ui-status-added)]',
  warning:
    'border-[var(--ui-status-modified-border)] bg-[var(--ui-status-modified-bg)] text-[var(--ui-status-modified)]'
}

export function OperationBanner({
  activeTask,
  feedback,
  onDismiss
}: OperationBannerProps): JSX.Element | null {
  if (!activeTask && !feedback) {
    return null
  }

  if (activeTask) {
    return (
      <div className="glass-card flex items-start justify-between gap-4 rounded-2xl border border-[var(--ui-accent-border)] px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-[var(--ui-accent)] border-t-transparent" />
          <div>
            <div className="text-sm font-semibold text-[var(--ui-text)]">{activeTask.label}</div>
            {activeTask.detail && (
              <div className="mt-1 text-xs text-[var(--ui-text-muted)]">{activeTask.detail}</div>
            )}
          </div>
        </div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ui-text-muted)]">
          Working
        </div>
      </div>
    )
  }

  if (!feedback) {
    return null
  }

  return (
    <div
      className={`glass-card flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 ${toneClasses[feedback.tone]}`}
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold">{feedback.title}</div>
        {feedback.detail && <div className="mt-1 text-xs opacity-90">{feedback.detail}</div>}
        {feedback.suggestion && (
          <div className="mt-2 text-[11px] text-[var(--ui-text)]/90">
            Next step: {feedback.suggestion}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-full border border-current/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] hover:bg-white/5"
      >
        Dismiss
      </button>
    </div>
  )
}
