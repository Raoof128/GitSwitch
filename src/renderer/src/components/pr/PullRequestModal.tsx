import { useCallback, useMemo, useEffect, useRef, JSX } from 'react'
import type { ChangeEvent } from 'react'
import { useRepoStore } from '../../store/useRepoStore'

export function PullRequestModal(): JSX.Element | null {
  const {
    prModalOpen,
    prForm,
    hasGitHubToken,
    hasGitLabToken,
    prResult,
    updatePrForm,
    closePrModal,
    submitPullRequest
  } = useRepoStore()

  const modalRef = useRef<HTMLDivElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (prModalOpen && firstInputRef.current) {
      firstInputRef.current.focus()
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && prModalOpen) {
        closePrModal()
      }
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'input, textarea, button, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [prModalOpen, closePrModal])

  const isDisabled = useMemo(() => {
    if (!prModalOpen) return true
    if (!hasGitHubToken && !hasGitLabToken) return true
    if (!prForm.title.trim()) return true
    if (!prForm.baseBranch.trim()) return true
    if (!prForm.headBranch.trim()) return true
    return false
  }, [hasGitHubToken, hasGitLabToken, prForm, prModalOpen])

  const handleBaseChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      updatePrForm({ baseBranch: event.target.value })
    },
    [updatePrForm]
  )

  const handleBodyChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      updatePrForm({ body: event.target.value })
    },
    [updatePrForm]
  )

  const handleClose = useCallback(() => {
    closePrModal()
  }, [closePrModal])

  const handleDraftChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      updatePrForm({ draft: event.target.checked })
    },
    [updatePrForm]
  )

  const handleHeadChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      updatePrForm({ headBranch: event.target.value })
    },
    [updatePrForm]
  )

  const handleOpenPr = useCallback(() => {
    if (prResult.url && window.api?.openExternal) {
      void window.api.openExternal(prResult.url)
    }
  }, [prResult.url])

  const handleSubmit = useCallback(() => {
    submitPullRequest()
  }, [submitPullRequest])

  const handleTitleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      updatePrForm({ title: event.target.value })
    },
    [updatePrForm]
  )

  if (!prModalOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        ref={modalRef}
        className="w-full max-w-lg rounded-lg border-2 border-[var(--ui-border)] bg-[var(--ui-panel)] p-4 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pr-modal-title"
      >
        <div id="pr-modal-title" className="mb-3 text-sm font-semibold">
          Create Pull Request
        </div>
        <div className="space-y-2">
          <input
            ref={firstInputRef}
            value={prForm.title}
            onChange={handleTitleChange}
            placeholder="Title"
            className="w-full rounded-md border-2 border-[var(--ui-border)] bg-[var(--ui-panel-muted)] px-2 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ui-accent)]"
          />
          <textarea
            value={prForm.body}
            onChange={handleBodyChange}
            placeholder="Description"
            rows={4}
            className="w-full resize-none rounded-md border-2 border-[var(--ui-border)] bg-[var(--ui-panel-muted)] px-2 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ui-accent)]"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={prForm.baseBranch}
              onChange={handleBaseChange}
              placeholder="Base branch"
              className="w-full rounded-md border-2 border-[var(--ui-border)] bg-[var(--ui-panel-muted)] px-2 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ui-accent)]"
            />
            <input
              value={prForm.headBranch}
              onChange={handleHeadChange}
              placeholder="Head branch"
              className="w-full rounded-md border-2 border-[var(--ui-border)] bg-[var(--ui-panel-muted)] px-2 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ui-accent)]"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={Boolean(prForm.draft)}
              onChange={handleDraftChange}
              className="h-4 w-4 accent-[var(--ui-accent)]"
            />
            Draft PR
          </label>
        </div>

        {prResult.status === 'error' && (
          <div className="mt-3 text-xs text-rose-300">{prResult.message}</div>
        )}
        {prResult.status === 'success' && prResult.url && (
          <div className="mt-3 flex items-center justify-between text-xs text-emerald-300">
            <span>PR created</span>
            <button
              type="button"
              onClick={handleOpenPr}
              className="rounded-md border border-[var(--ui-border)] px-2 py-1 text-xs hover:bg-[var(--ui-hover)]"
            >
              Open PR
            </button>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border border-[var(--ui-border)] px-3 py-1 text-xs hover:bg-[var(--ui-hover)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDisabled || prResult.status === 'loading'}
            onClick={handleSubmit}
            className="rounded-md border border-[var(--ui-border)] px-3 py-1 text-xs font-semibold disabled:opacity-40 hover:bg-[var(--ui-hover)]"
          >
            {prResult.status === 'loading' ? 'Creating…' : 'Create PR'}
          </button>
        </div>
      </div>
    </div>
  )
}
