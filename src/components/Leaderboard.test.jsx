/* @vitest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react'
import { cleanup, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

  it('opens player and tag history with distinct actions for confirmed owners', () => {
    const owners = getPreviewRosterOwners()
    const onOpenPlayerHistory = vi.fn()
    const onOpenTagHistory = vi.fn()

    const { container } = render(
      <Leaderboard
        owners={owners}
        loading={false}
        error={null}
        getPlayerHistoryId={(owner) => (owner?.name === 'Chris Walker' ? 'name:chris walker' : null)}
        onOpenPlayerHistory={onOpenPlayerHistory}
        onOpenTagHistory={onOpenTagHistory}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open player history for Chris Walker' }))
    expect(onOpenPlayerHistory).toHaveBeenCalledWith('name:chris walker')

    fireEvent.click(screen.getByRole('button', { name: 'Open tag history for #1' }))
    expect(onOpenTagHistory).toHaveBeenCalledWith(1)

    expect(container.querySelectorAll('.tag-row').length).toBe(100)
  })

  it('keeps player history action unavailable for unknown and conflict owners', () => {
    const owners = getPreviewRosterOwners()
    const { container } = render(
      <Leaderboard
        owners={owners}
        loading={false}
        error={null}
        getPlayerHistoryId={() => null}
        onOpenPlayerHistory={() => {}}
        onOpenTagHistory={() => {}}
      />
    )

    const unknownRow = [...container.querySelectorAll('.tag-row')].find((row) => row.textContent.includes('Unknown owner'))
    const conflictRow = [...container.querySelectorAll('.tag-row')].find((row) => row.textContent.includes('Conflict: Gregory Klisch / Lucas Wolharn'))

    expect(unknownRow.querySelector('.tag-owner-link')).toBeNull()
    expect(conflictRow.querySelector('.tag-owner-link')).toBeNull()
    expect(conflictRow.querySelector('.tag-history-link')).toBeTruthy()
  })
})
