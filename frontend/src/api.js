const TOKEN_KEY = 'njv_token'
const ROLE_KEY = 'njv_role'
const USER_KEY = 'njv_user'
const PHOTO_CACHE_KEY = 'njv_photos'
const BALLOT_KEY = 'njv_ballot'
const API_BASE = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getRole() {
  return localStorage.getItem(ROLE_KEY)
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function setAuth({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(ROLE_KEY, user.role)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem(USER_KEY)
}

export function readPhotoCache() {
  try {
    return JSON.parse(localStorage.getItem(PHOTO_CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function writePhotoCache(map) {
  try {
    localStorage.setItem(PHOTO_CACHE_KEY, JSON.stringify(map))
  } catch {
    /* quota */
  }
}

export function readBallot() {
  try {
    return JSON.parse(localStorage.getItem(BALLOT_KEY) || '[]')
  } catch {
    return []
  }
}

export function writeBallot(candidates) {
  try {
    localStorage.setItem(BALLOT_KEY, JSON.stringify(candidates || []))
  } catch {
    /* quota */
  }
}

export async function prefetchBallot(candidates = []) {
  if (candidates.length) writeBallot(candidates)
  else {
    try {
      const data = await api.ballot()
      candidates = data.candidates || []
      writeBallot(candidates)
    } catch {
      candidates = readBallot()
    }
  }
  const cache = readPhotoCache()
  for (const c of candidates) {
    if (c.photo_url) cache[c.id] = c.photo_url
  }
  writePhotoCache(cache)
  return candidates
}

export function friendlyError(err) {
  const s = String(err?.message || err || '')
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'Please connect to the internet or check your connection.'
  }
  if (/timed out|Could not reach|Failed to fetch|NetworkError|ERR_INTERNET|offline/i.test(s)) {
    return 'This is taking longer than usual. Please try again.'
  }
  return s || 'Something went wrong. Please try again.'
}

function fail(data, fallback = 'Request failed') {
  const msg =
    data?.message ||
    data?.email?.[0] ||
    (data?.errors && Object.values(data.errors).flat()[0]) ||
    fallback
  const err = new Error(friendlyError({ message: msg }))
  err.status = data?.status || 400
  err.data = data
  throw err
}

async function request(path, { method = 'GET', json, form } = {}) {
  const headers = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const opts = { method, headers }
  if (form) {
    opts.body = form
  } else if (json !== undefined) {
    headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(json)
  }
  let res
  try {
    res = await fetch(`${API_BASE}/api${path}`, opts)
  } catch {
    fail({ message: 'Could not reach' })
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    data.status = res.status
    if (res.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('njv:unauthenticated'))
    }
    fail(data)
  }
  return data
}

export const api = {
  teacherLogin: (email, password) => request('/teacher/login', { method: 'POST', json: { email, password } }),
  adminLogin: (email, password) => request('/admin/login', { method: 'POST', json: { email, password } }),
  logout: () => {
    const role = getRole()
    if (role === 'admin') return request('/admin/logout', { method: 'POST', json: {} }).catch(() => ({ ok: true }))
    if (role === 'teacher') return request('/teacher/logout', { method: 'POST', json: {} }).catch(() => ({ ok: true }))
    return Promise.resolve({ ok: true })
  },
  me: (role) => request(role === 'admin' ? '/admin/me' : '/teacher/me'),
  startSession: (student_email, student_grade, student_boarding) =>
    request('/session/start', { method: 'POST', json: { student_email, student_grade, student_boarding } }),
  endSession: (session_token) => request('/session/end', { method: 'POST', json: { session_token } }),
  ballot: () => request('/ballot'),
  candidates: (session_token) => request(`/candidates?session_token=${encodeURIComponent(session_token || '')}`),
  candidatePhoto: async (_session, id) => {
    const cache = readPhotoCache()
    return { ok: true, id, photo_url: cache[id] || null }
  },
  vote: (session_token, candidate_ids) =>
    request('/vote', {
      method: 'POST',
      json: {
        session_token,
        candidate_ids: Array.isArray(candidate_ids) ? candidate_ids : [candidate_ids],
        candidate_id: Array.isArray(candidate_ids) ? candidate_ids[0] : candidate_ids,
      },
    }),
  ping: () => request('/up').catch(() => ({ ok: true })),
  results: async (opts = {}) => {
    const data = await request('/admin/results')
    try {
      const extra = await request(`/admin/events?after_id=${Number(opts.after_id || 0)}`)
      data.events = extra.events || []
    } catch {
      data.events = []
    }
    return data
  },
  events: (after_id = 0) => request(`/admin/events?after_id=${after_id}`),
  votes: () => request('/admin/votes'),
  toggleVoting: (open) => request('/admin/voting/toggle', { method: 'POST', json: { open: Boolean(open) } }),
  declareWinners: () => request('/admin/voting/declare', { method: 'POST' }),
  settings: () => request('/admin/settings'),
  updateSettings: (body) => request('/admin/settings', { method: 'POST', json: body }),
  teachers: () => request('/admin/teachers'),
  storeTeacher: (body) => request('/admin/teachers', { method: 'POST', json: body }),
  updateTeacher: (id, body) => request(`/admin/teachers/${id}`, { method: 'PUT', json: body }),
  destroyTeacher: (id) => request(`/admin/teachers/${id}`, { method: 'DELETE' }),
  updateTeacherPassword: (id, body) => request(`/admin/teachers/${id}/password`, { method: 'POST', json: body }),
  updateAdminPassword: (body) => request('/admin/password', { method: 'POST', json: body }),
  storeCandidate: (form) => request('/admin/candidates', { method: 'POST', form }),
  updateCandidate: (id, form) => request(`/admin/candidates/${id}`, { method: 'POST', form }),
  renameCandidate: (id, body) => request(`/admin/candidates/${id}`, { method: 'PUT', json: body }),
  destroyCandidate: (id) => request(`/admin/candidates/${id}`, { method: 'DELETE' }),
}
