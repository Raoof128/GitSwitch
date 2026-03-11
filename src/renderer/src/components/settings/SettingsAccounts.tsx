import { useState, JSX } from 'react'
import { useRepoStore } from '../../store/useRepoStore'

export function SettingsAccounts(): JSX.Element {
  const {
    accounts,
    addAccount,
    defaultAccountId,
    deleteAccount,
    renameAccount,
    setSelectedAccountId,
    selectedAccountId,
    updateSettings
  } = useRepoStore()

  const [accountName, setAccountName] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(
    null
  )

  const handleAdd = async (): Promise<void> => {
    if (!accountName.trim() || !privateKey.trim()) {
      return
    }
    try {
      await addAccount(accountName.trim(), privateKey)
      setAccountName('')
      setPrivateKey('')
      setFeedback({ tone: 'success', message: 'SSH account saved securely.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save the SSH account.'
      setFeedback({ tone: 'error', message })
    }
  }

  const startRename = (id: string, name: string): void => {
    setEditingId(id)
    setEditingName(name)
  }

  const commitRename = async (): Promise<void> => {
    if (!editingId || !editingName.trim()) {
      setEditingId(null)
      return
    }
    try {
      await renameAccount(editingId, editingName.trim())
      setEditingId(null)
      setFeedback({ tone: 'success', message: 'SSH account renamed.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to rename the SSH account.'
      setFeedback({ tone: 'error', message })
    }
  }

  const handleDefaultChange = async (value: string): Promise<void> => {
    try {
      await updateSettings({ defaultAccountId: value || null })
      setFeedback({ tone: 'success', message: 'Default account updated.' })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update the default account.'
      setFeedback({ tone: 'error', message })
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await deleteAccount(id)
      setFeedback({ tone: 'success', message: 'SSH account removed.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove the SSH account.'
      setFeedback({ tone: 'error', message })
    }
  }

  return (
    <section className="space-y-4">
      <div className="text-sm font-semibold">Accounts (SSH identities)</div>

      {feedback && (
        <div
          className={`rounded-md border px-3 py-2 text-xs ${
            feedback.tone === 'success'
              ? 'border-[var(--ui-status-added-border)] bg-[var(--ui-status-added-bg)] text-[var(--ui-status-added)]'
              : 'border-[var(--ui-status-deleted-border)] bg-[var(--ui-status-deleted-bg)] text-[var(--ui-status-deleted)]'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="glass-card rounded-md p-4 text-xs">
        <div className="mb-3">
          <label className="mb-1 block text-[var(--ui-text-muted)]">Default account</label>
          <select
            value={defaultAccountId ?? ''}
            onChange={(event) => handleDefaultChange(event.target.value)}
            className="w-full rounded-md border border-[var(--glass-border)] bg-[var(--ui-panel-muted)] px-2 py-1 text-xs"
          >
            <option value="">None</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3 space-y-2">
          {accounts.length === 0 && (
            <div className="text-[var(--ui-text-muted)]">No accounts configured.</div>
          )}
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`flex items-center justify-between rounded-md border border-[var(--glass-border)] px-2 py-1 ${
                selectedAccountId === account.id ? 'bg-[var(--ui-hover)]' : ''
              }`}
            >
              {editingId === account.id ? (
                <input
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  className="mr-2 flex-1 rounded-md border border-[var(--glass-border)] bg-[var(--ui-panel)] px-2 py-1 text-xs"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedAccountId(account.id)}
                  className="mr-2 flex-1 text-left"
                >
                  {account.name}
                </button>
              )}
              {editingId === account.id ? (
                <button
                  type="button"
                  onClick={commitRename}
                  className="mr-2 rounded-md border border-[var(--glass-border)] px-2 py-1 text-[10px] hover:bg-[var(--ui-hover)]"
                >
                  Save
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startRename(account.id, account.name)}
                  className="mr-2 rounded-md border border-[var(--glass-border)] px-2 py-1 text-[10px] hover:bg-[var(--ui-hover)]"
                >
                  Rename
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleDelete(account.id)}
                className="rounded-md border border-[var(--glass-border)] px-2 py-1 text-[10px] hover:bg-[var(--ui-hover)]"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="glass-panel glass-panel-muted rounded-md border border-[var(--glass-border)] p-3">
          <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-[var(--ui-text-muted)]">
            Add account
          </div>
          <input
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
            placeholder="Account name"
            className="mb-2 w-full rounded-md border border-[var(--glass-border)] bg-[var(--ui-panel)] px-2 py-1 text-xs"
          />
          <textarea
            value={privateKey}
            onChange={(event) => setPrivateKey(event.target.value)}
            placeholder="Paste private key"
            rows={4}
            className="mb-2 w-full resize-none rounded-md border border-[var(--glass-border)] bg-[var(--ui-panel)] px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-md border border-[var(--glass-border)] px-3 py-1 text-xs font-semibold hover:bg-[var(--ui-hover)]"
          >
            Save account
          </button>
        </div>
      </div>
    </section>
  )
}
