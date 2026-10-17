const UNICODE_MINUS = '−'

function isBlankScoreValue(value) {
  return value === '' || value == null
}

function toFiniteScoreOrNull(value) {
  if (isBlankScoreValue(value)) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function formatSignedScore(numeric) {
  if (numeric === 0) return 'Even'
  if (numeric > 0) return `+${numeric}`
  return `${UNICODE_MINUS}${String(Math.abs(numeric))}`
}

export function formatBattleScoreDisplay(value, options = {}) {
  const { blankText = '—', blankAriaLabel = 'No score entered' } = options
  const numeric = toFiniteScoreOrNull(value)

  if (numeric == null) {
    return {
      text: blankText,
      ariaLabel: blankAriaLabel,
      isBlank: true,
    }
  }

  if (numeric === 0) {
    return {
      text: 'Even',
      ariaLabel: 'Even',
      isBlank: false,
    }
  }

  if (numeric > 0) {
    return {
      text: `+${numeric}`,
      ariaLabel: `Plus ${numeric}`,
      isBlank: false,
    }
  }

  const magnitude = String(Math.abs(numeric))
  return {
    text: `${UNICODE_MINUS}${magnitude}`,
    ariaLabel: `Minus ${magnitude}`,
    isBlank: false,
  }
}

export default { formatBattleScoreDisplay }
