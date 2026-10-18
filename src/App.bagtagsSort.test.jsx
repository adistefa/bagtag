/* @vitest-environment jsdom */

import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

function clickMainTab(label) {
  fireEvent.click(screen.getByRole('button', { name: label, exact: true }))
}

beforeAll(() => {
  installViewportMocks()
})

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', '/')
})

describe('BAGTAGS sorting in app navigation', () => {
  it('preserves selected sort mode when navigating away and back', async () => {
    render(<App />)

    clickMainTab('BAGTAGS')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'BAGTAGS', exact: true }).getAttribute('aria-current')).toBe('page')
    })

    fireEvent.click(screen.getByRole('button', { name: 'PLAYER NAME' }))
    expect(screen.getByRole('button', { name: 'PLAYER NAME' }).getAttribute('aria-pressed')).toBe('true')

    clickMainTab('HISTORY')
    clickMainTab('BAGTAGS')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'PLAYER NAME' }).getAttribute('aria-pressed')).toBe('true')
    })
  }, 15000)

  it('does not create browser history entries when changing sort mode', async () => {
    const originalPushState = window.history.pushState.bind(window.history)
    let pushCount = 0
    window.history.pushState = (...args) => {
      pushCount += 1
      return originalPushState(...args)
    }

    try {
      render(<App />)
      clickMainTab('BAGTAGS')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'BAGTAGS', exact: true }).getAttribute('aria-current')).toBe('page')
      })

      const beforeSort = pushCount
      fireEvent.click(screen.getByRole('button', { name: 'PLAYER NAME' }))
      fireEvent.click(screen.getByRole('button', { name: 'TAG NUMBER' }))

      expect(pushCount).toBe(beforeSort)
    } finally {
      window.history.pushState = originalPushState
    }
  })

  it('keeps roster entry count unchanged when switching sort modes', async () => {
    const { container } = render(<App />)
    clickMainTab('BAGTAGS')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'BAGTAGS', exact: true }).getAttribute('aria-current')).toBe('page')
    })

    const countBefore = container.querySelectorAll('.tag-row').length
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER NAME' }))
    const countAfter = container.querySelectorAll('.tag-row').length

    expect(countBefore).toBe(100)
    expect(countAfter).toBe(100)
  })
})
