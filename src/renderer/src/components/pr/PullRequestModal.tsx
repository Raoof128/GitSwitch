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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div
        ref={modalRef}
        className="w-full max-w-lg rounded-none border border-[#2a2a2a] bg-[#0e0e0e] p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pr-modal-title"
      >
        <div
          id="pr-modal-title"
          className="mb-3 font-mono text-sm font-bold uppercase tracking-[0.18em] text-[#e0e0e0]"
        >
          CREATE PULL REQUEST
        </div>
        <div className="space-y-2">
          <input
            ref={firstInputRef}
            value={prForm.title}
            onChange={handleTitleChange}
            placeholder="Title"
            className="w-full rounded-none border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-2 text-xs text-[#e0e0e0] placeholder-[#666666] focus:border-[#00ffaa] focus:shadow-[0_0_8px_rgba(0,255,170,0.2)] focus:outline-none"
          />
          <textarea
            value={prForm.body}
            onChange={handleBodyChange}
            placeholder="Description"
            rows={4}
            className="w-full resize-none rounded-none border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-2 text-xs text-[#e0e0e0] placeholder-[#666666] focus:border-[#00ffaa] focus:shadow-[0_0_8px_rgba(0,255,170,0.2)] focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={prForm.baseBranch}
              onChange={handleBaseChange}
              placeholder="Base branch"
              className="w-full rounded-none border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-2 text-xs text-[#e0e0e0] placeholder-[#666666] focus:border-[#00ffaa] focus:shadow-[0_0_8px_rgba(0,255,170,0.2)] focus:outline-none"
            />
            <input
              value={prForm.headBranch}
              onChange={handleHeadChange}
              placeholder="Head branch"
              className="w-full rounded-none border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-2 text-xs text-[#e0e0e0] placeholder-[#666666] focus:border-[#00ffaa] focus:shadow-[0_0_8px_rgba(0,255,170,0.2)] focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-[#e0e0e0]">
            <input
              type="checkbox"
              checked={Boolean(prForm.draft)}
              onChange={handleDraftChange}
              className="h-4 w-4 appearance-none rounded-none border border-[#2a2a2a] bg-[#0a0a0a] checked:border-[#00ffaa] checked:bg-[#00ffaa]"
            />
            Draft PR
          </label>
        </div>

        {prResult.status === 'error' && (
          <div className="mt-3 text-xs text-[#ff3366]" style={{ textShadow: '0 0 8px rgba(255,51,102,0.4)' }}>
            {prResult.message}
          </div>
        )}
        {prResult.status === 'success' && prResult.url && (
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-[#00ffaa]" style={{ textShadow: '0 0 8px rgba(0,255,170,0.4)' }}>
              PR created
            </span>
            <button
              type="button"
              onClick={handleOpenPr}
              className="btn-neon rounded-none border border-[#00ffaa] bg-transparent px-2 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#00ffaa] transition-shadow hover:shadow-[0_0_10px_rgba(0,255,170,0.3)]"
            >
              Open PR
            </button>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={closePrModal}
            className="rounded-none border border-[#2a2a2a] bg-transparent px-3 py-1 text-xs text-[#e0e0e0] transition-colors hover:border-[#666666]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDisabled || prResult.status === 'loading'}
            onClick={submitPullRequest}
            className="btn-neon rounded-none border border-[#00ffaa] bg-transparent px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#00ffaa] transition-shadow disabled:opacity-40 hover:shadow-[0_0_10px_rgba(0,255,170,0.3)]"
          >
            {prResult.status === 'loading' ? 'Creating...' : 'Create PR'}
          </button>
        </div>
      </div>
    </div>
  )
}
