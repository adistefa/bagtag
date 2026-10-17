export const DISC_COLORS = ['disc-white', 'disc-orange', 'disc-pink', 'disc-sky', 'disc-mint']
export const DISC_COLOR_VALUES = {
  'disc-white': '#F6F6F1',
  'disc-orange': '#FF9F2E',
  'disc-pink': '#FF5BA7',
  'disc-sky': '#78CFFF',
  'disc-mint': '#81E4C2',
}

export function normalizePlayerIdentityText(value) {
  if (typeof value !== 'string') return ''

  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getPlayerDisplayName(player) {
  const fromName = typeof player?.name === 'string' ? player.name.trim() : ''
  if (fromName) return fromName

  const fromSourceName = typeof player?.source_player_name === 'string' ? player.source_player_name.trim() : ''
  if (fromSourceName) return fromSourceName

  const fromDisplayName = typeof player?.display_name === 'string' ? player.display_name.trim() : ''
  if (fromDisplayName) return fromDisplayName

  const fromNormalizedName = typeof player?.normalized_player_name === 'string' ? player.normalized_player_name.trim() : ''
  if (fromNormalizedName) return fromNormalizedName

  const fromUsername = typeof player?.username === 'string' ? player.username.trim() : ''
  if (fromUsername) return fromUsername

  return null
}

export function getPlayerIdentitySeed(player) {
  const display = getPlayerDisplayName(player)
  const normalizedDisplay = normalizePlayerIdentityText(display)
  if (normalizedDisplay) return `name:${normalizedDisplay}`

  const username = normalizePlayerIdentityText(typeof player?.username === 'string' ? player.username : '')
  if (username) return `user:${username}`

  const stableIdentity = [
    player?.source_player_id,
    player?.player_id,
    player?.identity_key,
    player?.participant_id,
    player?.player_key,
    player?.source_player_hash,
  ]
    .map((value) => normalizePlayerIdentityText(value == null ? '' : String(value)))
    .find(Boolean)
  if (stableIdentity) return `stable:${stableIdentity}`

  if (player?.id != null) {
    const idSeed = normalizePlayerIdentityText(String(player.id))
    if (idSeed) return `id:${idSeed}`
  }

  return ''
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
