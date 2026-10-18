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

function clickHistoryTab(label) {
  fireEvent.click(screen.getByRole('tab', { name: label, exact: true }))
}

async function openHistoryTags() {
  clickMainTab('HISTORY')
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'HISTORY', exact: true }).getAttribute('aria-current')).toBe('page')
  })
  clickHistoryTab('TAGS')
  await waitFor(() => {
    expect(screen.getByRole('tab', { name: 'TAGS', exact: true }).getAttribute('aria-selected')).toBe('true')
  })
}

function openSelector() {
  fireEvent.click(screen.getByRole('button', { name: 'Select tag' }))
}

function selectTag(tag) {
  fireEvent.click(screen.getByRole('option', { name: `#${tag}` }))
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

describe('C.3.1 HISTORY tag selector', () => {
  it('shows selector and instruction when TAGS opens without tag', async () => {
    render(<App />)
    await openHistoryTags()

    expect(screen.getByRole('button', { name: 'Select tag' })).toBeTruthy()
    expect(screen.getByText('Select a tag to explore its history.')).toBeTruthy()
    expect(screen.getByText('Select a BAGTAG or open a direct link with a valid tag parameter (1-100).')).toBeTruthy()
  }, 15000)

  it('opens selector and lists all 100 tags', async () => {
    render(<App />)
    await openHistoryTags()

    openSelector()
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Select tag' })).toBeTruthy()
    })

    const options = screen.getAllByRole('option')
    expect(options.length).toBe(100)
    expect(screen.getByRole('option', { name: '#1' })).toBeTruthy()
    expect(screen.getByRole('option', { name: '#100' })).toBeTruthy()
  }, 15000)

  it('selecting #34 updates URL and shows tag journey cards or truthful empty state', async () => {
    render(<App />)
    await openHistoryTags()

    openSelector()
    selectTag(34)

    await waitFor(() => {
      expect(screen.getByText('Selected tag: #34')).toBeTruthy()
    })

    const params = new URLSearchParams(window.location.search)
    expect(params.get('view')).toBe('history')
    expect(params.get('history')).toBe('tags')
    expect(params.get('tag')).toBe('34')

    const hasCards = document.querySelectorAll('.tag-history-card').length > 0
    const hasEmpty = !!screen.queryByText('No documented historical events were found for tag #34.')
    expect(hasCards || hasEmpty).toBe(true)
  }, 15000)

  it('switching #34 to #52 updates URL and selected tag label', async () => {
    render(<App />)
    await openHistoryTags()

    openSelector()
    selectTag(34)
    await waitFor(() => {
      expect(screen.getByText('Selected tag: #34')).toBeTruthy()
    })

    const before = document.querySelector('.history-list')?.textContent || ''

    openSelector()
    selectTag(52)
    await waitFor(() => {
      expect(screen.getByText('Selected tag: #52')).toBeTruthy()
    })

    const params = new URLSearchParams(window.location.search)
    expect(params.get('tag')).toBe('52')

    const after = document.querySelector('.history-list')?.textContent || ''
    expect(after !== before || document.querySelectorAll('.tag-history-card').length === 0).toBe(true)
  }, 15000)

  it('re-selecting same tag does not create duplicate history entry', async () => {
    const originalPushState = window.history.pushState.bind(window.history)
    let pushCount = 0
    window.history.pushState = (...args) => {
      pushCount += 1
      return originalPushState(...args)
    }

    try {
      render(<App />)
      await openHistoryTags()

      openSelector()
      selectTag(52)
      await waitFor(() => {
        expect(screen.getByText('Selected tag: #52')).toBeTruthy()
      })

      const before = pushCount
      openSelector()
      selectTag(52)

      await waitFor(() => {
        expect(screen.getByText('Selected tag: #52')).toBeTruthy()
      })
      expect(pushCount).toBe(before)
    } finally {
      window.history.pushState = originalPushState
    }
  }, 15000)

  it('Back restores previous tag and Forward restores next tag', async () => {
    render(<App />)
    await openHistoryTags()

    openSelector()
    selectTag(34)
    await waitFor(() => {
      expect(screen.getByText('Selected tag: #34')).toBeTruthy()
    })

    openSelector()
    selectTag(52)
    await waitFor(() => {
      expect(screen.getByText('Selected tag: #52')).toBeTruthy()
    })

    await browserBack()
    await waitFor(() => {
      expect(screen.getByText('Selected tag: #34')).toBeTruthy()
    })

    await browserForward()
    await waitFor(() => {
      expect(screen.getByText('Selected tag: #52')).toBeTruthy()
    })
  }, 15000)

  it('refresh keeps selected tag, and direct link to #100 works', async () => {
    window.history.replaceState({}, '', '/?view=history&history=tags&tag=100')
    const firstRender = render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Selected tag: #100')).toBeTruthy()
    })

    firstRender.unmount()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Selected tag: #100')).toBeTruthy()
    })
  }, 15000)

  it('handles invalid tag values safely and keeps selector available', async () => {
    window.history.replaceState({}, '', '/?view=history&history=tags&tag=999')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Select a BAGTAG or open a direct link with a valid tag parameter (1-100).')).toBeTruthy()
    })

    expect(screen.getByRole('button', { name: 'Select tag' })).toBeTruthy()
  }, 15000)

  it('selector can close without changing selection', async () => {
    render(<App />)
    await openHistoryTags()

    openSelector()
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Select tag' })).toBeTruthy()
    })

    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Select tag' })).toBeNull()
    })

    const params = new URLSearchParams(window.location.search)
    expect(params.get('tag')).toBeNull()
  }, 15000)

  it('BAGTAGS to tag still works and BAGTAGS to player still works', async () => {
    render(<App />)

    clickMainTab('BAGTAGS')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'BAGTAGS', exact: true }).getAttribute('aria-current')).toBe('page')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open tag history for #34' }))
    await waitFor(() => {
      expect(screen.getByText('Selected tag: #34')).toBeTruthy()
    })

    clickMainTab('BAGTAGS')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'BAGTAGS', exact: true }).getAttribute('aria-current')).toBe('page')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open player history for Chris Walker' }))
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'PLAYERS', exact: true }).getAttribute('aria-selected')).toBe('true')
    })
  }, 15000)
})
