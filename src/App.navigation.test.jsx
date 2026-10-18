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

async function addPlayer(name) {
  const search = screen.getByRole('textbox', { name: /search players/i })
  fireEvent.change(search, { target: { value: name } })
  await waitFor(() => {
    expect(screen.getByRole('button', { name: `add ${name}`, exact: true })).toBeTruthy()
  })
  fireEvent.click(screen.getByRole('button', { name: `add ${name}`, exact: true }))
}

function clickMainTab(label) {
  fireEvent.click(screen.getByRole('button', { name: label, exact: true }))
}

function expectMainView(label) {
  expect(screen.getByRole('button', { name: label, exact: true }).getAttribute('aria-current')).toBe('page')
}

async function waitForMainView(label) {
  await waitFor(() => {
    expectMainView(label)
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

describe('app navigation and browser history', () => {
  it('opens BATTLE by default', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'BATTLE' })).toBeTruthy()
    })

    expectMainView('BATTLE')
    expect(window.location.search).toBe('')
  })

  it('navigates main tabs and supports Back/Forward', async () => {
    render(<App />)

    clickMainTab('BAGTAGS')
    await waitForMainView('BAGTAGS')
    expect(window.location.search).toContain('view=bagtags')

    clickMainTab('HISTORY')
    await waitForMainView('HISTORY')
    expect(window.location.search).toContain('view=history')
    expect(window.location.search).toContain('history=matches')

    await browserBack()
    await waitForMainView('BAGTAGS')

    await browserBack()
    await waitForMainView('BATTLE')

    await browserForward()
    await waitForMainView('BAGTAGS')
  }, 15000)

  it('supports Back across HISTORY subviews', async () => {
    render(<App />)

    clickMainTab('HISTORY')
    await waitForMainView('HISTORY')

    fireEvent.click(screen.getByRole('tab', { name: 'PLAYERS', exact: true }))
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'PLAYERS', exact: true }).getAttribute('aria-selected')).toBe('true')
    })

    fireEvent.click(screen.getByRole('tab', { name: 'TAGS', exact: true }))
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'TAGS', exact: true }).getAttribute('aria-selected')).toBe('true')
    })

    await browserBack()
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'PLAYERS', exact: true }).getAttribute('aria-selected')).toBe('true')
    })

    await browserBack()
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'MATCHES', exact: true }).getAttribute('aria-selected')).toBe('true')
    })
  }, 15000)

  it('does not create duplicate history entries when selecting active destination', async () => {
    const pushStateSpy = window.history.pushState.bind(window.history)
    let pushCount = 0
    window.history.pushState = (...args) => {
      pushCount += 1
      return pushStateSpy(...args)
    }

    try {
      render(<App />)

      clickMainTab('BAGTAGS')
      await waitForMainView('BAGTAGS')
      clickMainTab('BAGTAGS')
      clickMainTab('BAGTAGS')

      expect(pushCount).toBe(1)
    } finally {
      window.history.pushState = pushStateSpy
    }
  })

  it('supports direct navigation and refresh for HISTORY subviews', async () => {
    window.history.replaceState({}, '', '/?view=history&history=players')

    const firstRender = render(<App />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'HISTORY', exact: true }).getAttribute('aria-current')).toBe('page')
    })
    expect(screen.getByRole('tab', { name: 'PLAYERS', exact: true }).getAttribute('aria-selected')).toBe('true')

    firstRender.unmount()

    render(<App />)
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'PLAYERS', exact: true }).getAttribute('aria-selected')).toBe('true')
    })
  })

  it('preserves unfinished NewMatch state across HISTORY and back to BATTLE', async () => {
    render(<App />)

    await addPlayer('Chris Walker')
    await addPlayer('Patrick Schweizer')

    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: 'CONFIRM BATTLE' })
      expect(confirmButton.disabled).toBe(false)
    })

    clickMainTab('HISTORY')
    await waitForMainView('HISTORY')

    clickMainTab('BATTLE')
    await waitForMainView('BATTLE')

    const confirmButton = screen.getByRole('button', { name: 'CONFIRM BATTLE' })
    expect(confirmButton.disabled).toBe(false)
    expect(screen.queryByLabelText('Battle result screen')).toBeNull()
  }, 15000)

  it('clears stale MatchResult after leaving and returning to BATTLE', async () => {
    render(<App />)

    await addPlayer('Chris Walker')
    await addPlayer('Patrick Schweizer')

    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: 'CONFIRM BATTLE' })
      expect(confirmButton.disabled).toBe(false)
    })

    fireEvent.click(screen.getByRole('button', { name: 'CONFIRM BATTLE' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Battle result screen')).toBeTruthy()
    })

    expect(screen.queryByText('ADD PLAYERS')).toBeNull()

    clickMainTab('HISTORY')
    await waitForMainView('HISTORY')

    clickMainTab('BATTLE')
    await waitForMainView('BATTLE')

    await waitFor(() => {
      expect(screen.queryByLabelText('Battle result screen')).toBeNull()
      expect(screen.getByText('ADD PLAYERS')).toBeTruthy()
    })
  }, 15000)

  it('keeps single destination rendering and active indicators aligned', async () => {
    render(<App />)

    clickMainTab('HISTORY')
    await waitForMainView('HISTORY')
    expect(screen.queryAllByRole('tablist', { name: 'History sections' }).length).toBe(1)

    clickMainTab('BAGTAGS')
    await waitForMainView('BAGTAGS')
    expect(screen.queryByRole('tablist', { name: 'History sections' })).toBeNull()
    expect(screen.getByRole('button', { name: 'BAGTAGS', exact: true }).getAttribute('aria-current')).toBe('page')
  })
})
