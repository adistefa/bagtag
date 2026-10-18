/* @vitest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react'
import { cleanup, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import Leaderboard from './Leaderboard'
import { getPreviewRosterOwners } from '../data/previewRoster'

afterEach(() => {
  cleanup()
})

function getRenderedTags(container) {
  return [...container.querySelectorAll('.tag-row .tag-inner')].map((node) => Number(node.textContent.replace('#', '')))
}

describe('Leaderboard sorting UI', () => {
  it('defaults to TAG NUMBER ordering and keeps #1, #10, #100 numeric', () => {
    const owners = getPreviewRosterOwners()
    const { container } = render(<Leaderboard owners={owners} loading={false} error={null} />)

    expect(screen.getByRole('button', { name: 'TAG NUMBER' }).getAttribute('aria-pressed')).toBe('true')

    const tags = getRenderedTags(container)
    expect(tags[0]).toBe(1)
    expect(tags[9]).toBe(10)
    expect(tags[99]).toBe(100)
  })

  it('switches to PLAYER NAME ordering with sections and stable roster count', () => {
    const owners = getPreviewRosterOwners()
    const { container } = render(<Leaderboard owners={owners} loading={false} error={null} />)
    const ui = within(container)

    const beforeCount = container.querySelectorAll('.tag-row').length

    fireEvent.click(ui.getByRole('button', { name: 'PLAYER NAME' }))

    expect(ui.getByRole('button', { name: 'PLAYER NAME' }).getAttribute('aria-pressed')).toBe('true')

    const labels = [...container.querySelectorAll('.leaderboard-group-label')].map((node) => node.textContent)
    expect(labels).toContain('CONFIRMED PLAYERS')
    expect(labels).toContain('UNKNOWN / UNASSIGNED')
    expect(labels).toContain('OWNERSHIP CONFLICTS')

    const afterCount = container.querySelectorAll('.tag-row').length
    expect(afterCount).toBe(beforeCount)
    expect(afterCount).toBe(100)

    expect(ui.getByText('Conflict: Gregory Klisch / Lucas Wolharn')).toBeTruthy()
    expect(ui.getByText('Conflict: Thomi Seitz / Lukas Voellmy')).toBeTruthy()
  })

  it('does not mutate the provided ownership map when switching sort modes', () => {
    const owners = getPreviewRosterOwners()
    const snapshot = JSON.stringify([...owners.entries()])

    const { container } = render(<Leaderboard owners={owners} loading={false} error={null} />)
    const ui = within(container)

    fireEvent.click(ui.getByRole('button', { name: 'PLAYER NAME' }))
    fireEvent.click(ui.getByRole('button', { name: 'TAG NUMBER' }))

    expect(JSON.stringify([...owners.entries()])).toBe(snapshot)
  })
})
