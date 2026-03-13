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

  const badgeColor =
    tone === 'danger' ? 'border-[#ff3366] text-[#ff3366]' : 'border-[#ffcc00] text-[#ffcc00]'

  const confirmBtnClass =
    tone === 'danger'
      ? 'btn-neon-pink rounded-none border border-[#ff3366] bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#ff3366] transition-shadow hover:shadow-[0_0_10px_rgba(255,51,102,0.3)]'
      : 'btn-neon-yellow rounded-none border border-[#ffcc00] bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#ffcc00] transition-shadow hover:shadow-[0_0_10px_rgba(255,204,0,0.3)]'

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg rounded-none border border-[#2a2a2a] bg-[#0e0e0e] p-5"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-action-title"
      >
        <div
          className={`neon-badge inline-flex rounded-none border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${badgeColor}`}
        >
          Confirm Action
        </div>
        <h2
          id="confirm-action-title"
          className="mt-4 font-mono text-xl font-bold uppercase tracking-[0.12em] text-[#e0e0e0]"
        >
          {title}
        </h2>
        <div className="mt-3 text-sm leading-6 text-[#c0c0c0]">{detail}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn-neon rounded-none border border-[#00ffaa] bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#00ffaa] transition-shadow hover:shadow-[0_0_10px_rgba(0,255,170,0.3)]"
          >
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={confirmBtnClass}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
