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

async function openBagtags() {
  clickMainTab('BAGTAGS')
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'BAGTAGS', exact: true }).getAttribute('aria-current')).toBe('page')
  })
}

async function browserBack() {
  window.history.back()
  await new Promise((resolve) => setTimeout(resolve, 0))
  window.dispatchEvent(new PopStateEvent('popstate'))
}

async function browserForward() {
  window.history.forward()
  await new Promise((resolve) => setTimeout(resolve, 0))
  window.dispatchEvent(new PopStateEvent('popstate'))
}

beforeAll(() => {
  installViewportMocks()
})

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', '/')
})

describe('C.3 BAGTAGS to HISTORY navigation', () => {
  it('opens confirmed player in HISTORY/PLAYERS first slot with other slots empty', async () => {
    render(<App />)
    await openBagtags()

    fireEvent.click(screen.getByRole('button', { name: 'Open player history for Chris Walker' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'HISTORY', exact: true }).getAttribute('aria-current')).toBe('page')
      expect(screen.getByRole('tab', { name: 'PLAYERS', exact: true }).getAttribute('aria-selected')).toBe('true')
    })

    const params = new URLSearchParams(window.location.search)
    expect(params.get('view')).toBe('history')
    expect(params.get('history')).toBe('players')
    expect(params.get('player')).toBe('name:chris walker')

    expect(screen.getAllByText('Chris Walker').length).toBeGreaterThan(0)
    expect(document.querySelectorAll('.player-timeline-selection-slot--selected').length).toBe(1)
    expect(screen.getAllByRole('button', { name: 'Add player' }).length).toBe(2)
  }, 15000)

  it('keeps normal HISTORY/PLAYERS entry at zero selected players', async () => {
    render(<App />)

    clickMainTab('HISTORY')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'HISTORY', exact: true }).getAttribute('aria-current')).toBe('page')
    })

    fireEvent.click(screen.getByRole('tab', { name: 'PLAYERS', exact: true }))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'PLAYERS', exact: true }).getAttribute('aria-selected')).toBe('true')
    })

    expect(document.querySelectorAll('.player-timeline-selection-slot--selected').length).toBe(0)
    expect(screen.getAllByRole('button', { name: 'Add player' }).length).toBe(3)
  })

  it('does not expose player-history action for unknown owners and conflict owners', async () => {
    render(<App />)
    await openBagtags()

    expect(screen.queryByRole('button', { name: 'Open player history for Unknown owner' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Open player history for Conflict: Gregory Klisch / Lucas Wolharn' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Open tag history for #11' })).toBeTruthy()
  })

  it('opens tag history for selected tags including #1, #34 and #100', async () => {
    render(<App />)
    await openBagtags()

    fireEvent.click(screen.getByRole('button', { name: 'Open tag history for #34' }))
    await waitFor(() => {
      expect(screen.getByText('Selected tag: #34')).toBeTruthy()
    })

    let params = new URLSearchParams(window.location.search)
    expect(params.get('view')).toBe('history')
    expect(params.get('history')).toBe('tags')
    expect(params.get('tag')).toBe('34')

    clickMainTab('BAGTAGS')
    await openBagtags()
    fireEvent.click(screen.getByRole('button', { name: 'Open tag history for #1' }))
    await waitFor(() => {
      expect(screen.getByText('Selected tag: #1')).toBeTruthy()
    })

    clickMainTab('BAGTAGS')
    await openBagtags()
    fireEvent.click(screen.getByRole('button', { name: 'Open tag history for #100' }))
    await waitFor(() => {
      expect(screen.getByText('Selected tag: #100')).toBeTruthy()
    })

    params = new URLSearchParams(window.location.search)
    expect(params.get('tag')).toBe('100')
  }, 15000)

  it('supports direct links and refresh for player and tag selections', async () => {
    window.history.replaceState({}, '', '/?view=history&history=players&player=name%3Achris+walker')
    const firstRender = render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'PLAYERS', exact: true }).getAttribute('aria-selected')).toBe('true')
    })
    expect(document.querySelectorAll('.player-timeline-selection-slot--selected').length).toBe(1)

    firstRender.unmount()
    render(<App />)
    await waitFor(() => {
      expect(document.querySelectorAll('.player-timeline-selection-slot--selected').length).toBe(1)
    })

    cleanup()
    window.history.replaceState({}, '', '/?view=history&history=tags&tag=34')
    const secondRender = render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Selected tag: #34')).toBeTruthy()
    })

    secondRender.unmount()
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Selected tag: #34')).toBeTruthy()
    })
  }, 15000)

  it('handles invalid tag parameter safely', async () => {
    window.history.replaceState({}, '', '/?view=history&history=tags&tag=999')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Select a BAGTAG or open a direct link with a valid tag parameter (1-100).')).toBeTruthy()
    })

    const params = new URLSearchParams(window.location.search)
    expect(params.get('view')).toBe('history')
    expect(params.get('history')).toBe('tags')
    expect(params.get('tag')).toBeNull()
  })

  it('restores selection with browser Back/Forward between BAGTAGS and linked HISTORY destination', async () => {
    render(<App />)
    await openBagtags()

    fireEvent.click(screen.getByRole('button', { name: 'Open player history for Chris Walker' }))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'PLAYERS', exact: true }).getAttribute('aria-selected')).toBe('true')
    })

    await browserBack()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'BAGTAGS', exact: true }).getAttribute('aria-current')).toBe('page')
    })

    await browserForward()
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'PLAYERS', exact: true }).getAttribute('aria-selected')).toBe('true')
      expect(document.querySelectorAll('.player-timeline-selection-slot--selected').length).toBe(1)
    })
  }, 15000)

  it('does not push duplicate history entries for an already selected direct destination', async () => {
    const originalPushState = window.history.pushState.bind(window.history)
    let pushCount = 0
    window.history.pushState = (...args) => {
      pushCount += 1
      return originalPushState(...args)
    }

    try {
      window.history.replaceState({}, '', '/?view=history&history=players&player=name%3Achris+walker')
      const firstRender = render(<App />)
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'PLAYERS', exact: true }).getAttribute('aria-selected')).toBe('true')
      })
      expect(pushCount).toBe(0)

      firstRender.unmount()
      render(<App />)
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'PLAYERS', exact: true }).getAttribute('aria-selected')).toBe('true')
      })
      expect(pushCount).toBe(0)
    } finally {
      window.history.pushState = originalPushState
    }
  }, 15000)
})
