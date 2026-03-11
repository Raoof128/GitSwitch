import type { JSX, ReactNode } from 'react'

type ConfirmActionModalProps = {
  confirmLabel: string
  detail: ReactNode
  onCancel: () => void
  onConfirm: () => void
  open: boolean
  title: string
  tone?: 'danger' | 'warning'
}

export function ConfirmActionModal({
  confirmLabel,
  detail,
  onCancel,
  onConfirm,
  open,
  title,
  tone = 'warning'
}: ConfirmActionModalProps): JSX.Element | null {
  if (!open) {
    return null
  }

  const toneClasses =
    tone === 'danger'
      ? 'border-[var(--ui-status-deleted-border)] bg-[var(--ui-status-deleted-bg)] text-[var(--ui-status-deleted)]'
      : 'border-[var(--ui-status-modified-border)] bg-[var(--ui-status-modified-bg)] text-[var(--ui-status-modified)]'

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(8,15,14,0.72)] px-4"
      onClick={onCancel}
    >
      <div
        className="glass-elevated w-full max-w-lg rounded-[28px] border border-[var(--glass-border)] p-5"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-action-title"
      >
        <div
          className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${toneClasses}`}
        >
          Confirm Action
        </div>
        <h2 id="confirm-action-title" className="mt-4 text-xl font-semibold text-[var(--ui-text)]">
          {title}
        </h2>
        <div className="mt-3 text-sm leading-6 text-[var(--ui-text-muted)]">{detail}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[var(--glass-border)] px-4 py-2 text-xs font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-hover)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl border px-4 py-2 text-xs font-semibold ${toneClasses}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
