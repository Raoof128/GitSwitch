import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SettingsView } from './components/settings/SettingsView'

describe('SettingsView', () => {
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
