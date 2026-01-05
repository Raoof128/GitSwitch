import { useEffect, useState, JSX } from 'react'
import { useRepoStore } from '../../store/useRepoStore'

export function SettingsGeneral(): JSX.Element {
  const { defaultBaseBranch, likeApp, reducedMotion, theme, updateSettings } = useRepoStore()
  const [baseBranch, setBaseBranch] = useState(defaultBaseBranch)
  const [motion, setMotion] = useState(reducedMotion)
  const [liked, setLiked] = useState(likeApp)

  useEffect(() => {
    setBaseBranch(defaultBaseBranch)
  }, [defaultBaseBranch])

  useEffect(() => {
    setMotion(reducedMotion)
  }, [reducedMotion])

  useEffect(() => {
    setLiked(likeApp)
  }, [likeApp])

  const handleSave = async (): Promise<void> => {
    await updateSettings({
      defaultBaseBranch: baseBranch,
      reducedMotion: motion,
      likeApp: liked
    })
  }

  return (
    <section className="space-y-4">
      <div className="text-sm font-semibold">General</div>
      <div className="rounded-md border-2 border-[var(--ui-border)] bg-[var(--ui-panel)]/60 p-4 text-xs">
        <div className="mb-3">
          <label className="mb-1 block text-[var(--ui-text-muted)]">Theme</label>
          <select
            value={theme}
            disabled
            className="w-full rounded-md border-2 border-[var(--ui-border)] bg-[var(--ui-panel-muted)] px-2 py-1 text-xs opacity-60"
          >
            <option value="dark">Dark (default)</option>
          </select>
        </div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[var(--ui-text-muted)]">Reduced motion</span>
          <input
            type="checkbox"
            checked={motion}
            onChange={(event) => setMotion(event.target.checked)}
            className="h-4 w-4 accent-[var(--ui-accent)]"
          />
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-[var(--ui-text-muted)]">Default base branch</label>
          <select
            value={baseBranch}
            onChange={(event) => setBaseBranch(event.target.value as 'main' | 'master')}
            className="w-full rounded-md border-2 border-[var(--ui-border)] bg-[var(--ui-panel-muted)] px-2 py-1 text-xs"
          >
            <option value="main">main</option>
            <option value="master">master</option>
          </select>
        </div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[var(--ui-text-muted)]">Like GitSwitch</span>
          <input
            type="checkbox"
            checked={liked}
            onChange={(event) => setLiked(event.target.checked)}
            className="h-4 w-4 accent-[var(--ui-accent)]"
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-md border border-[var(--ui-border)] px-3 py-1 text-xs font-semibold hover:bg-[var(--ui-hover)]"
        >
          Save General
        </button>
      </div>
    </section>
  )
}
