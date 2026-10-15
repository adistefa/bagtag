export const DISC_COLORS = ['disc-white', 'disc-orange', 'disc-pink', 'disc-sky', 'disc-mint']
export const DISC_COLOR_VALUES = {
  'disc-white': '#F6F6F1',
  'disc-orange': '#FF9F2E',
  'disc-pink': '#FF5BA7',
  'disc-sky': '#78CFFF',
  'disc-mint': '#81E4C2',
}

export function getPlayerDisplayName(player) {
  const fromName = typeof player?.name === 'string' ? player.name.trim() : ''
  if (fromName) return fromName

  const fromDisplayName = typeof player?.display_name === 'string' ? player.display_name.trim() : ''
  if (fromDisplayName) return fromDisplayName

  const fromUsername = typeof player?.username === 'string' ? player.username.trim() : ''
  if (fromUsername) return fromUsername

  return null
}

export function getPlayerIdentitySeed(player) {
  if (player?.id != null) return String(player.id)

  const username = typeof player?.username === 'string' ? player.username.trim().toLowerCase() : ''
  if (username) return username

  const display = getPlayerDisplayName(player)
  return display ? display.toLowerCase() : ''
}

export function getPlayerDiscColorClass(player) {
  const seed = getPlayerIdentitySeed(player)
  if (!seed) return 'disc-white'

  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }

  return DISC_COLORS[Math.abs(hash) % DISC_COLORS.length]
}

export function getPlayerInitials(player) {
  const label = getPlayerDisplayName(player)
  if (!label) return '??'

  const words = label.split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()

  return (words[0][0] + words[1][0]).toUpperCase()
}
