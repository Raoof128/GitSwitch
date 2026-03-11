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
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#00ffaa]">
        General
      </div>
      <div className="rounded-none border border-[#2a2a2a] bg-[#141414] p-4 text-xs">
        <div className="mb-3">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">
            Theme
          </label>
          <select
            value={theme}
            disabled
            className="w-full rounded-none border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#e0e0e0] opacity-60"
          >
            <option value="dark">Dark (default)</option>
          </select>
        </div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[#666666]">Reduced motion</span>
          <input
            type="checkbox"
            checked={motion}
            onChange={(event) => setMotion(event.target.checked)}
            className="h-4 w-4 rounded-none"
          />
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">
            Default base branch
          </label>
          <select
            value={baseBranch}
            onChange={(event) => setBaseBranch(event.target.value as 'main' | 'master')}
            className="w-full rounded-none border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#e0e0e0]"
          >
            <option value="main">main</option>
            <option value="master">master</option>
          </select>
        </div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[#666666]">Like GitSwitch</span>
          <input
            type="checkbox"
            checked={liked}
            onChange={(event) => setLiked(event.target.checked)}
            className="h-4 w-4 rounded-none"
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="btn-neon rounded-none px-3 py-1 text-xs font-semibold"
        >
          Save General
        </button>
      </div>
    </section>
  )
}
