import { beforeEach, describe, it, expect } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SettingsView } from './components/settings/SettingsView'
import { useRepoStore } from './store/useRepoStore'

describe('SettingsView', () => {
  beforeEach(() => {
    useRepoStore.setState({
      settingsOpen: false,
      settingsTab: 'general'
    })
  })

  it('switches tabs on click', async () => {
    render(<SettingsView />)

    expect(screen.getByText('Theme')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Integrations' }))

    expect(await screen.findByText('AI Commit Generator')).toBeInTheDocument()
  })

  it('cycles tabs with arrow keys when navigation is focused', async () => {
    render(<SettingsView />)

    const nav = screen.getByRole('navigation')
    fireEvent.keyDown(nav, { key: 'ArrowRight' })

    expect(await screen.findByText('AI Commit Generator')).toBeInTheDocument()
  })
})
