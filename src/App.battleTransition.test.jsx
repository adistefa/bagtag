/* @vitest-environment jsdom */

import { beforeAll, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'

function installViewportMocks() {
  if (!window.matchMedia) {
    window.matchMedia = () => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })
  }

  if (!window.visualViewport) {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        height: 844,
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    })
  }
}

beforeAll(() => {
  installViewportMocks()
})

describe('battle transition rendering', () => {
  it('renders only MatchResult after confirming a battle', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /search players/i })).toBeTruthy()
    })

    const search = screen.getByRole('textbox', { name: /search players/i })

    fireEvent.change(search, { target: { value: 'Chris Walker' } })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'add Chris Walker', exact: true })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'add Chris Walker', exact: true }))

    fireEvent.change(search, { target: { value: 'Patrick Schweizer' } })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'add Patrick Schweizer', exact: true })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'add Patrick Schweizer', exact: true }))

    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: 'CONFIRM BATTLE' })
      expect(confirmButton.disabled).toBe(false)
    })

    fireEvent.click(screen.getByRole('button', { name: 'CONFIRM BATTLE' }))

    await waitFor(() => {
      expect(screen.getByText('PHYSICAL EXCHANGES')).toBeTruthy()
    })

    expect(screen.getByLabelText('Battle result screen')).toBeTruthy()
    expect(screen.queryByText('ADD PLAYERS')).toBeNull()
    expect(screen.queryByRole('tablist', { name: 'Result entry mode' })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Remove / })).toBeNull()
  }, 15000)
})
