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
    <section className="glass-card rounded-[24px] border border-[var(--glass-border)] p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--ui-accent)]">
            First-Run Flow
          </div>
          <h2 className="mt-3 text-2xl font-semibold leading-tight text-[var(--ui-text)] sm:text-3xl">
            GitSwitch helps you move between repos, branches, and review-ready changes without
            losing trust in what Git is doing.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--ui-text-muted)]">
            The fastest way to get value is simple: load a repository, choose the SSH identity you
            want for sync operations, and connect AI only if it supports your workflow.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="self-start rounded-full border border-[var(--glass-border)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ui-text-muted)] hover:bg-[var(--ui-hover)]"
        >
          Hide
        </button>
      </div>

      <div className="mt-6 grid gap-3 xl:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.title}
            className={`rounded-2xl border p-4 ${
              step.done
                ? 'border-[var(--ui-status-added-border)] bg-[var(--ui-status-added-bg)]'
                : 'border-[var(--glass-border)] bg-[var(--ui-panel)]/50'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[var(--ui-text)]">{step.title}</div>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                  step.done
                    ? 'bg-[var(--ui-status-added-bg)] text-[var(--ui-status-added)]'
                    : 'bg-[var(--ui-hover)] text-[var(--ui-text-muted)]'
                }`}
              >
                {step.done ? 'Ready' : 'Pending'}
              </span>
            </div>
            <div className="mt-2 text-xs leading-5 text-[var(--ui-text-muted)]">{step.detail}</div>
            <button
              type="button"
              onClick={step.onAction}
              className="mt-4 rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-hover)]"
            >
              {step.done ? 'Review' : step.actionLabel}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
