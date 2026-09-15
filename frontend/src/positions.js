export const ELECTION_CATEGORIES = [
  {
    id: 'executive',
    title: '1. Executive Council',
    posts: [
      'President — Grade XII',
      'Vice President — Grade XI',
      'General Secretary — Grade X',
    ],
  },
  {
    id: 'committees',
    title: '2. Committee Leadership',
    posts: [
      'Academic Committee Head — Grade XII',
      'Academic Committee Deputy Head — Grade XI',
      'HR & Public Relations Committee Head — Grade XII',
      'HR & Public Relations Committee Deputy Head — Grade XI',
      'Hostel Committee Head — Grade XII',
      'Hostel Committee Deputy Head — Grade XI',
      'Sports Committee Head — Grade XII',
      'Sports Committee Deputy Head — Grade XI',
      'Events Committee Head — Grade XII',
      'Events Committee Deputy Head — Grade XI',
    ],
  },
  {
    id: 'class-reps',
    title: '3. Class Representatives',
    posts: [
      'Grade XII Male Representative',
      'Grade XII Female Representative',
      'Grade XI Male Representative',
      'Grade XI Female Representative',
      'Grade X Male Representative',
      'Grade X Female Representative',
      'Grade IX Male Representative',
      'Grade IX Female Representative',
      'Grade VIII Male Representative',
      'Grade VIII Female Representative',
    ],
  },
]

export const ALL_POSTS = ELECTION_CATEGORIES.flatMap((c) => c.posts)

export function categoryForPost(position) {
  return ELECTION_CATEGORIES.find((c) => c.posts.includes(position)) || null
}

export function orderedPositions(positions) {
  const set = new Set(positions)
  const ordered = []
  for (const cat of ELECTION_CATEGORIES) {
    for (const post of cat.posts) {
      if (set.has(post)) ordered.push(post)
    }
  }
  for (const p of positions) {
    if (!ordered.includes(p)) ordered.push(p)
  }
  return ordered
}
