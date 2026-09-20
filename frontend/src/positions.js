export const GRADES = ['VIII', 'IX', 'X', 'XI', 'XII']

export const BALLOT_ORDER = [
  'President',
  'Vice President',
  'General Secretary',
  'Male Batch/Class Representative',
  'Female Batch/Class Representative',
  'Event Committee Head',
  'Deputy Event Committee Head',
  'Hostel Committee Head',
  'Deputy Hostel Committee Head',
  'Academics Committee Head',
  'Deputy Academics Committee Head',
  'Sports Committee Head',
  'Deputy Sports Committee Head',
]

export const CLASS_REP_POSTS = [
  'Male Batch/Class Representative',
  'Female Batch/Class Representative',
]

export const ELECTION_CATEGORIES = [
  {
    id: 'executive',
    title: '1. Executive Council',
    posts: ['President', 'Vice President', 'General Secretary'],
  },
  {
    id: 'class-reps',
    title: '3. Class Representatives',
    posts: CLASS_REP_POSTS,
  },
  {
    id: 'committees',
    title: '2. Committee Leadership',
    posts: [
      'Event Committee Head',
      'Deputy Event Committee Head',
      'Hostel Committee Head',
      'Deputy Hostel Committee Head',
      'Academics Committee Head',
      'Deputy Academics Committee Head',
      'Sports Committee Head',
      'Deputy Sports Committee Head',
    ],
  },
]

export const ALL_POSTS = BALLOT_ORDER

export function isClassRep(position) {
  return CLASS_REP_POSTS.includes(position)
}

export function categoryForPost(position) {
  return ELECTION_CATEGORIES.find((c) => c.posts.includes(position)) || null
}

export function orderedPositions(positions) {
  const set = new Set(positions)
  const ordered = BALLOT_ORDER.filter((p) => set.has(p))
  for (const p of positions) {
    if (!ordered.includes(p)) ordered.push(p)
  }
  return ordered
}

export function forLabel(position) {
  const v = String(position ?? '').trim()
  if (!v) return ''
  return /^for\s/i.test(v) ? v : `For ${v}`
}

export function hallKeys(candidates = []) {
  const keys = []
  for (const p of BALLOT_ORDER) {
    if (isClassRep(p)) {
      for (const g of GRADES) {
        if (candidates.some((c) => c.position === p && c.grade === g)) keys.push(`${p}::${g}`)
      }
    } else if (candidates.some((c) => c.position === p)) {
      keys.push(p)
    }
  }
  return keys
}

export function parseHallKey(key) {
  const value = String(key || '')
  const i = value.indexOf('::')
  if (i === -1) return { position: value, grade: null }
  return { position: value.slice(0, i), grade: value.slice(i + 2) }
}
