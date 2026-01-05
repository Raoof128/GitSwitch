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

  const handleAdd = async (): Promise<void> => {
    if (!accountName.trim() || !privateKey.trim()) {
      return
    }
    await addAccount(accountName.trim(), privateKey)
    setAccountName('')
    setPrivateKey('')
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
    await renameAccount(editingId, editingName.trim())
    setEditingId(null)
  }

  const handleDefaultChange = async (value: string): Promise<void> => {
    await updateSettings({ defaultAccountId: value || null })
  }

  return (
    <section className="space-y-4">
      <div className="text-sm font-semibold">Accounts (SSH identities)</div>

      <div className="rounded-md border-2 border-[var(--ui-border)] bg-[var(--ui-panel)]/60 p-4 text-xs">
        <div className="mb-3">
          <label className="mb-1 block text-[var(--ui-text-muted)]">Default account</label>
          <select
            value={defaultAccountId ?? ''}
            onChange={(event) => handleDefaultChange(event.target.value)}
            className="w-full rounded-md border-2 border-[var(--ui-border)] bg-[var(--ui-panel-muted)] px-2 py-1 text-xs"
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
              className={`flex items - center justify - between rounded - md border border - [var(--ui - border)]px - 2 py - 1 ${
                selectedAccountId === account.id ? 'bg-[var(--ui-hover)]' : ''
              } `}
            >
              {editingId === account.id ? (
                <input
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  className="mr-2 flex-1 rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] px-2 py-1 text-xs"
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
                  className="mr-2 rounded-md border border-[var(--ui-border)] px-2 py-1 text-[10px] hover:bg-[var(--ui-hover)]"
                >
                  Save
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startRename(account.id, account.name)}
                  className="mr-2 rounded-md border border-[var(--ui-border)] px-2 py-1 text-[10px] hover:bg-[var(--ui-hover)]"
                >
                  Rename
                </button>
              )}
              <button
                type="button"
                onClick={() => deleteAccount(account.id)}
                className="rounded-md border border-[var(--ui-border)] px-2 py-1 text-[10px] hover:bg-[var(--ui-hover)]"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] p-3">
          <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-[var(--ui-text-muted)]">
            Add account
          </div>
          <input
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
            placeholder="Account name"
            className="mb-2 w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] px-2 py-1 text-xs"
          />
          <textarea
            value={privateKey}
            onChange={(event) => setPrivateKey(event.target.value)}
            placeholder="Paste private key"
            rows={4}
            className="mb-2 w-full resize-none rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-md border border-[var(--ui-border)] px-3 py-1 text-xs font-semibold hover:bg-[var(--ui-hover)]"
          >
            Save account
          </button>
        </div>
      </div>
    </section>
  )
}
