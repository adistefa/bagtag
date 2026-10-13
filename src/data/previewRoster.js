export const PREVIEW_DATA_SOURCE = 'Preview roster · read-only snapshot from imports/source/current_bagtags.csv'
export const PREVIEW_DATA_NOTE = 'Preview data is isolated from the live Supabase ownership view and never writes back to live tag ownership.'

const previewKnownOwners = {
  1: 'Chris Walker',
  2: 'Patrick Schweizer',
  3: 'Reto Grogg',
  4: 'Daniel Kocsis',
  5: 'Andreas DeBais',
  6: 'Raffa Dreier',
  7: 'Lukas Oswald',
  8: 'Sam DuCharme',
  9: 'Aaron Hautle',
  10: 'Heidi Poutanen',
  12: 'Reto Glaus',
  13: 'Luca Valsecchi',
  14: 'Vitus Meier',
  15: 'Loreno Schaufelberger',
  16: 'Martin Jung',
  17: 'Nathan DeBais',
  18: 'Stefan Tanner',
  19: 'Sandro Cola',
  20: 'Melanie Meuter',
  21: 'Noah Kesseli',
  22: 'Marco Janisch',
  23: 'Daniel Keller',
  24: 'Dario Isidorius Flumini',
  25: 'Dominik Osterwalder',
  26: 'Tobi Bachmann',
  27: 'Jörg Sintermann',
  28: 'Luke Tapsak',
  29: 'Fadri Guetg',
  30: 'Cyril Quadri',
  31: 'Cornelius Gschwend',
  32: 'Andreas Ulmer',
  33: 'Magnus Gocke',
  34: 'Chris Solarski',
  35: 'Antti Rahikka',
  36: 'Falk Daubner',
  37: 'Guido Scartazzini',
  38: 'Ivan Schoch',
  39: 'Adam Schneiter',
  40: 'Reto Scartazzini',
  41: 'René Engi',
  42: 'Michael Saur',
  43: 'Pascal Hauri',
  44: 'Eric Mariotti',
  45: 'Johann Scholz',
  46: 'Alessandro Di Stefano',
  47: 'Cevret Sali',
  48: 'Sinan Agbuga',
  49: 'Jan Binder',
  50: 'Yoram Bielefeldt',
  51: 'Gian Minor',
  53: 'Valentin Vogt',
  54: 'Mirco Schoch',
  55: 'Krasimir Yonkov',
  56: 'Dominik Zetschok',
  57: 'Florian Christen',
  58: 'Lianel Spengler',
  59: 'Darius Lehmann',
  60: 'Sven Rindlisbacher',
  61: 'Kurt Schmid',
  62: 'Jakob Kreutzer',
  64: 'Jonathan Schmiedel',
  65: 'Bø Peek',
}

const previewConflicts = {
  11: ['Gregory Klisch', 'Lucas Wolharn'],
  52: ['Thomi Seitz', 'Lukas Voellmy'],
}

function makeOwner(tag, name, status, extra = {}) {
  return {
    id: status === 'known' ? `preview-tag-${tag}` : null,
    name,
    display_name: name,
    username: status === 'known' ? `preview-${tag}` : '',
    tag,
    status,
    source: PREVIEW_DATA_SOURCE,
    ...extra,
  }
}

export function getPreviewRosterOwners() {
  const owners = new Map()

  for (let tag = 1; tag <= 100; tag += 1) {
    if (previewConflicts[tag]) {
      const names = previewConflicts[tag]
      owners.set(tag, makeOwner(tag, `Conflict: ${names.join(' / ')}`, 'conflict', {
        conflictNames: names,
      }))
      continue
    }

    if (previewKnownOwners[tag]) {
      owners.set(tag, makeOwner(tag, previewKnownOwners[tag], 'known'))
      continue
    }

    owners.set(tag, makeOwner(tag, 'Unknown owner', 'unknown'))
  }

  return owners
}

export function getPreviewRosterStats() {
  const owners = getPreviewRosterOwners()
  const summary = { totalTags: 100, known: 0, conflicting: 0, unknown: 0 }

  owners.forEach((owner) => {
    if (owner.status === 'known') summary.known += 1
    if (owner.status === 'conflict') summary.conflicting += 1
    if (owner.status === 'unknown') summary.unknown += 1
  })

  return summary
}

export const PREVIEW_ROSTER_OWNERS = getPreviewRosterOwners()
export const PREVIEW_ROSTER_STATS = getPreviewRosterStats()
