import type { JSX } from 'react'
import type { SettingsTab } from '../../store/useRepoStore'

type OnboardingPanelProps = {
  hasAccounts: boolean
  hasAiConfigured: boolean
  hasRepos: boolean
  onAddRepo: () => void
  onDismiss: () => void
  onOpenSettings: (tab: SettingsTab) => void
}

export function OnboardingPanel({
  hasAccounts,
  hasAiConfigured,
  hasRepos,
  onAddRepo,
  onDismiss,
  onOpenSettings
}: OnboardingPanelProps): JSX.Element | null {
  if (hasRepos && hasAccounts && hasAiConfigured) {
    return null
  }

  const steps = [
    {
      title: 'Add a repository',
      detail: 'Load a real Git working copy so GitSwitch can watch status, diffs, and sync health.',
      actionLabel: 'Add Repo',
      done: hasRepos,
      onAction: onAddRepo
    },
    {
      title: 'Choose a default account',
      detail: 'Set the SSH identity you want pull, fetch, and push to use by default.',
      actionLabel: 'Accounts',
      done: hasAccounts,
      onAction: () => onOpenSettings('accounts')
    },
    {
      title: 'Connect AI',
      detail:
        'Configure offline, local, or cloud AI so commit drafting feels integrated instead of bolted on.',
      actionLabel: 'Integrations',
      done: hasAiConfigured,
      onAction: () => onOpenSettings('integrations')
    }
  ]

  return (
    <section className="border border-[#2a2a2a] bg-[#141414] p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="label-brutal label-accent">
            First-Run Flow
          </div>
          <h2
            className="mt-3 font-mono text-2xl font-bold uppercase leading-tight text-[#e0e0e0] sm:text-3xl"
            style={{ textShadow: '0 0 10px rgba(224, 224, 224, 0.15)' }}
          >
            GitSwitch helps you move between repos, branches, and review-ready changes without
            losing trust in what Git is doing.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#666666]">
            The fastest way to get value is simple: load a repository, choose the SSH identity you
            want for sync operations, and connect AI only if it supports your workflow.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="btn-neon self-start px-3 py-1 text-[10px]"
        >
          Hide
        </button>
      </div>

      <div className="mt-6 grid gap-3 xl:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.title}
            className="border border-[#2a2a2a] bg-[#0e0e0e] p-4"
            style={{
              borderLeftWidth: '2px',
              borderLeftColor: step.done ? '#00ffaa' : '#2a2a2a',
              ...(step.done ? { boxShadow: 'inset 2px 0 8px -4px rgba(0, 255, 170, 0.3)' } : {})
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[#e0e0e0]">{step.title}</div>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                  step.done
                    ? 'neon-badge neon-badge-green'
                    : 'neon-badge neon-badge-yellow'
                }`}
              >
                {step.done ? 'Ready' : 'Pending'}
              </span>
            </div>
            <div className="mt-2 text-xs leading-5 text-[#666666]">{step.detail}</div>
            <button
              type="button"
              onClick={step.onAction}
              className="btn-neon mt-4"
            >
              {step.done ? 'Review' : step.actionLabel}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
