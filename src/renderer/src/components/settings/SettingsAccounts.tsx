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
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#00ffaa]">
        Accounts (SSH identities)
      </div>

      {feedback && (
        <div
          className={`rounded-none border px-3 py-2 text-xs ${
            feedback.tone === 'success'
              ? 'border-[#00ffaa]/30 bg-[rgba(0,255,170,0.06)] text-[#00ffaa]'
              : 'border-[#ff3366]/30 bg-[rgba(255,51,102,0.06)] text-[#ff3366]'
          }`}
          style={
            feedback.tone === 'success'
              ? { textShadow: '0 0 6px rgba(0,255,170,0.4)' }
              : { textShadow: '0 0 6px rgba(255,51,102,0.4)' }
          }
        >
          {feedback.message}
        </div>
      )}

      <div className="rounded-none border border-[#2a2a2a] bg-[#141414] p-4 text-xs">
        <div className="mb-3">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">
            Default account
          </label>
          <select
            value={defaultAccountId ?? ''}
            onChange={(event) => handleDefaultChange(event.target.value)}
            className="w-full rounded-none border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#e0e0e0]"
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
          {accounts.length === 0 && <div className="text-[#666666]">No accounts configured.</div>}
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`flex items-center justify-between rounded-none border border-[#2a2a2a] px-2 py-1 ${
                selectedAccountId === account.id ? 'bg-[rgba(0,255,170,0.08)]' : ''
              }`}
            >
              {editingId === account.id ? (
                <input
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  className="mr-2 flex-1 rounded-none border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#e0e0e0]"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedAccountId(account.id)}
                  className="mr-2 flex-1 text-left text-[#e0e0e0]"
                >
                  {account.name}
                </button>
              )}
              {editingId === account.id ? (
                <button
                  type="button"
                  onClick={commitRename}
                  className="btn-neon mr-2 rounded-none px-2 py-1 text-[10px]"
                >
                  Save
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startRename(account.id, account.name)}
                  className="mr-2 rounded-none border border-[#2a2a2a] px-2 py-1 text-[10px] text-[#00ffaa] hover:bg-[rgba(0,255,170,0.08)] hover:underline"
                >
                  Rename
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleDelete(account.id)}
                className="btn-neon-pink rounded-none px-2 py-1 text-[10px]"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-none border border-[#2a2a2a] bg-[#0a0a0a] p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#00ffaa]">
            Add account
          </div>
          <input
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
            placeholder="Account name"
            className="mb-2 w-full rounded-none border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#e0e0e0]"
          />
          <textarea
            value={privateKey}
            onChange={(event) => setPrivateKey(event.target.value)}
            placeholder="Paste private key"
            rows={4}
            className="mb-2 w-full resize-none rounded-none border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#e0e0e0]"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="btn-neon rounded-none px-3 py-1 text-xs font-semibold"
          >
            Save account
          </button>
        </div>
      </div>
    </section>
  )
}
