const http = require('http')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { URL } = require('url')

const DOMAIN = 'njv.edu.pk'
const SHEETS_URL =
  'https://script.google.com/macros/s/AKfycbwHBO0lxcKS9X2dFtSTMN-GLzgFjZjJy_LeP1JMXUHhLCOezRfeACUjzux8rmmaBEvnqQ/exec'
const SHEETS_SECRET = 'njv-sync-2026'
const COLORS = ['#0d7a3e', '#1d4ed8', '#b45309', '#7c3aed', '#be123c', '#0f766e']

function sha(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex')
}

function token() {
  return crypto.randomBytes(24).toString('hex')
}

function nowIso() {
  return new Date().toISOString()
}

function seed() {
  return {
    users: [
      { id: 1, name: 'NJV Principal', email: `admin@${DOMAIN}`, password_sha: sha('admin12345'), role: 'admin' },
      { id: 2, name: 'Ms. Ayesha Khan', email: `teacher@${DOMAIN}`, password_sha: sha('teacher12345'), role: 'teacher' },
    ],
    candidates: [
      { id: 1, name: 'Ahmed Farooq', position: 'Head Boy', photo_url: null, vote_count: 0, color_tag: '#0d7a3e', is_active: true },
      { id: 2, name: 'Sara Malik', position: 'Head Girl', photo_url: null, vote_count: 0, color_tag: '#1d4ed8', is_active: true },
      { id: 3, name: 'Hassan Raza', position: 'Head Boy', photo_url: null, vote_count: 0, color_tag: '#b45309', is_active: true },
      { id: 4, name: 'Zainab Ali', position: 'Head Girl', photo_url: null, vote_count: 0, color_tag: '#7c3aed', is_active: true },
      { id: 5, name: 'Bilal Hussain', position: 'Sports Captain', photo_url: null, vote_count: 0, color_tag: '#be123c', is_active: true },
      { id: 6, name: 'Fatima Noor', position: 'Sports Captain', photo_url: null, vote_count: 0, color_tag: '#0f766e', is_active: true },
    ],
    votes: [],
    sessions: [],
    events: [],
    tokens: [],
    settings: {
      voting_open: true,
      election_title: 'NJV Government School Student Council Election 2026',
      eligible_students: 450,
    },
    next: { user: 3, candidate: 7, vote: 1, event: 1 },
  }
}

function startServer(dataDir, port = 8765) {
  fs.mkdirSync(dataDir, { recursive: true })
  const file = path.join(dataDir, 'njv-data.json')
  let db = seed()
  if (fs.existsSync(file)) {
    try {
      db = { ...seed(), ...JSON.parse(fs.readFileSync(file, 'utf8')) }
    } catch {
      db = seed()
    }
  }

  const recalc = () => {
    const seen = new Set()
    const unique = []
    for (const v of db.votes || []) {
      const e = String(v.student_email || '').toLowerCase().trim()
      if (!e || seen.has(e)) continue
      seen.add(e)
      unique.push({ ...v, student_email: e })
    }
    db.votes = unique
    const counts = {}
    unique.forEach((v) => {
      counts[v.candidate_id] = (counts[v.candidate_id] || 0) + 1
    })
    ;(db.candidates || []).forEach((c) => {
      c.vote_count = counts[c.id] || 0
    })
  }

  const save = () => {
    recalc()
    fs.writeFileSync(file, JSON.stringify(db))
  }
  recalc()

  const deletedFile = path.join(dataDir, 'deleted-candidates.json')
  let deletedIds = []
  try {
    if (fs.existsSync(deletedFile)) deletedIds = JSON.parse(fs.readFileSync(deletedFile, 'utf8'))
  } catch {
    deletedIds = []
  }
  const saveDeleted = () => fs.writeFileSync(deletedFile, JSON.stringify(deletedIds))

  const queueFile = path.join(dataDir, 'sheets-queue.json')
  let queue = []
  try {
    if (fs.existsSync(queueFile)) queue = JSON.parse(fs.readFileSync(queueFile, 'utf8'))
  } catch {
    queue = []
  }
  const saveQueue = () => fs.writeFileSync(queueFile, JSON.stringify(queue))

  const statusFile = path.join(dataDir, 'sheets-status.json')
  const writeStatus = (obj) => {
    try {
      fs.writeFileSync(statusFile, JSON.stringify({ ...obj, at: new Date().toISOString() }, null, 2))
    } catch {
      /* ignore */
    }
  }

  const sheetsCall = async (payload) => {
    const body = { ...payload, secret: SHEETS_SECRET }
    const payloadStr = JSON.stringify(body)
    const res = await fetch(SHEETS_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams({ payload: payloadStr }).toString(),
    }).catch(() => fetch(`${SHEETS_URL}?payload=${encodeURIComponent(payloadStr)}`, { redirect: 'follow' }))
    let text = await res.text()
    text = String(text || '').trim()
    if (!text || text.startsWith('<')) {
      throw new Error('Google returned a web page, not data. Redeploy Apps Script (Anyone).')
    }
    const wrapped = text.match(/^[$\w]+\(([\s\S]*)\)\s*$/)
    if (wrapped) text = wrapped[1]
    const data = JSON.parse(text)
    if (data && data.ok === false && !data.skipped) {
      throw new Error(data.message || 'Sheets rejected the request')
    }
    return data
  }

  const flushSheet = async () => {
    if (!queue.length || !SHEETS_URL) return
    const job = queue[0]
    try {
      await sheetsCall(job)
      queue.shift()
      saveQueue()
      writeStatus({ ok: true, last: 'push', remaining: queue.length })
    } catch (err) {
      writeStatus({ ok: false, last: 'push', error: String(err.message || err), remaining: queue.length })
    }
  }

  const pushSheet = (payload) => {
    const email = String(payload.student_email || '').toLowerCase()
    if (payload.action === 'ingestVote' && queue.some((j) => j.action === 'ingestVote' && String(j.student_email).toLowerCase() === email)) {
      return
    }
    queue.push(payload)
    saveQueue()
    flushSheet()
  }

  const applyPull = (remote) => {
    if (!remote || !remote.ok) return
    if (Array.isArray(remote.candidates) && remote.candidates.length) {
      const photos = {}
      db.candidates.forEach((c) => {
        if (c.photo_url) photos[c.id] = c.photo_url
      })
      db.candidates = remote.candidates
        .filter((c) => !deletedIds.includes(Number(c.id)))
        .map((c) => ({
        id: c.id,
        name: c.name,
        position: c.position,
        photo_url: c.photo_url || photos[c.id] || null,
        vote_count: Number(c.vote_count || 0),
        color_tag: c.color_tag,
        is_active: c.is_active !== false,
      }))
      db.next.candidate = Math.max(db.next.candidate, ...db.candidates.map((c) => c.id + 1))
    }
    if (Array.isArray(remote.votes)) {
      const localOnly = db.votes.filter(
        (v) => !remote.votes.some((r) => String(r.student_email).toLowerCase() === String(v.student_email).toLowerCase()),
      )
      db.votes = remote.votes
        .filter((v) => !deletedIds.includes(Number(v.candidate_id)))
        .map((v) => ({
        id: v.id,
        candidate_id: v.candidate_id,
        student_email: String(v.student_email || '').toLowerCase(),
        voted_at: v.voted_at,
      }))
      localOnly.forEach((v) => {
        if (deletedIds.includes(Number(v.candidate_id))) return
        db.votes.push(v)
        pushSheet({ action: 'ingestVote', student_email: v.student_email, candidate_id: v.candidate_id })
      })
      db.next.vote = Math.max(1, ...db.votes.map((v) => Number(v.id) + 1), db.next.vote)
    }
    if (remote.election_title) db.settings.election_title = remote.election_title
    if (remote.voting_open != null) db.settings.voting_open = !!remote.voting_open
    if (remote.eligible_students != null) db.settings.eligible_students = Number(remote.eligible_students)
    recalc()
    save()
  }

  const pullSheets = async () => {
    try {
      const remote = await sheetsCall({ action: 'syncPull' })
      applyPull(remote)
      writeStatus({ ok: true, last: 'pull', votes: db.votes.length })
    } catch (err) {
      writeStatus({ ok: false, last: 'pull', error: String(err.message || err) })
    }
  }

  pullSheets()
  setInterval(pullSheets, 20000)
  setInterval(flushSheet, 4000)
  flushSheet()

  const auth = (req, role) => {
    const h = req.headers.authorization || ''
    const t = h.startsWith('Bearer ') ? h.slice(7) : ''
    const rec = db.tokens.find((x) => x.token === t)
    if (!rec) return null
    if (role && rec.role !== role) return null
    return db.users.find((u) => u.id === rec.user_id) || null
  }

  const send = (res, code, obj) => {
    const body = JSON.stringify(obj)
    res.writeHead(code, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    })
    res.end(body)
  }

  const readBody = (req) =>
    new Promise((resolve) => {
      const chunks = []
      req.on('data', (c) => chunks.push(c))
      req.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8')
        if (!raw) return resolve({})
        try {
          resolve(JSON.parse(raw))
        } catch {
          resolve({})
        }
      })
    })

  const serialize = (c) => ({
    id: c.id,
    name: c.name,
    position: c.position,
    photo_url: c.photo_url || null,
    vote_count: c.vote_count || 0,
    color_tag: c.color_tag,
    is_active: !!c.is_active,
    has_photo: !!c.photo_url,
  })

  const results = () => {
    const list = [...db.candidates].map(serialize).sort((a, b) => b.vote_count - a.vote_count || a.name.localeCompare(b.name))
    const total = db.votes.length
    const eligible = Number(db.settings.eligible_students || 0)
    const leader = list[0]
    return {
      election_title: db.settings.election_title,
      voting_open: !!db.settings.voting_open,
      eligible_students: eligible,
      total_votes: total,
      turnout_percent: eligible > 0 ? Math.round((total / eligible) * 1000) / 10 : 0,
      leader_id: leader && leader.vote_count > 0 ? leader.id : null,
      candidates: list,
    }
  }

  const login = (body, role, res) => {
    const email = String(body.email || '').toLowerCase().trim()
    const user = db.users.find((u) => u.email === email && u.role === role)
    if (!user || user.password_sha !== sha(body.password || '')) {
      return send(res, 422, { message: 'The provided credentials are incorrect.', ok: false })
    }
    const tok = token()
    db.tokens.push({ token: tok, user_id: user.id, role })
    save()
    const payload = {
      ok: true,
      token: tok,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    }
    if (role === 'admin') payload.results = results()
    if (role === 'teacher') payload.candidates = db.candidates.filter((c) => c.is_active).map(serialize)
    return send(res, 200, payload)
  }

  const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return send(res, 204, {})
    const url = new URL(req.url, 'http://127.0.0.1')
    const p = url.pathname
    const method = req.method

    try {
      if (p === '/api/ping' && method === 'GET') return send(res, 200, { ok: true })

      if (p === '/api/teacher/login' && method === 'POST') return login(await readBody(req), 'teacher', res)
      if (p === '/api/admin/login' && method === 'POST') return login(await readBody(req), 'admin', res)

      if ((p === '/api/teacher/logout' || p === '/api/admin/logout') && method === 'POST') {
        return send(res, 200, { ok: true, message: 'Logged out.' })
      }

      if (p === '/api/session/start' && method === 'POST') {
        const user = auth(req, 'teacher')
        if (!user) return send(res, 401, { message: 'Not authenticated.', ok: false })
        if (!db.settings.voting_open) return send(res, 403, { message: 'Voting is currently closed.', ok: false })
        const email = String((await readBody(req)).student_email || '').toLowerCase().trim()
        if (!/^[a-z0-9._%+\-]+@njv\.edu\.pk$/.test(email)) {
          return send(res, 422, { message: `Email must be a valid @${DOMAIN} address.`, ok: false })
        }
        if (db.votes.some((v) => v.student_email === email)) {
          return send(res, 409, { message: 'This student has already voted.', ok: false })
        }
        const tok = token()
        const exp = new Date(Date.now() + 5 * 60 * 1000).toISOString()
        db.sessions.push({ token: tok, teacher_id: user.id, student_email: email, expires_at: exp, status: 'active' })
        save()
        return send(res, 200, {
          ok: true,
          session_token: tok,
          student_email: email,
          expires_at: exp,
          election_title: db.settings.election_title,
          candidates: db.candidates.filter((c) => c.is_active).map(serialize),
        })
      }

      if (p === '/api/session/end' && method === 'POST') {
        const body = await readBody(req)
        const s = db.sessions.find((x) => x.token === body.session_token)
        if (s) s.status = 'ended'
        save()
        return send(res, 200, { ok: true })
      }

      if (p === '/api/candidates' && method === 'GET') {
        const st = url.searchParams.get('session_token')
        const s = db.sessions.find((x) => x.token === st && x.status === 'active' && new Date(x.expires_at) > new Date())
        if (!s) return send(res, 403, { message: 'An active teacher-authorized session is required.', ok: false })
        return send(res, 200, {
          ok: true,
          election_title: db.settings.election_title,
          student_email: s.student_email,
          expires_at: s.expires_at,
          candidates: db.candidates.filter((c) => c.is_active).map(serialize),
        })
      }

      if (p === '/api/ballot' && method === 'GET') {
        if (!auth(req)) return send(res, 401, { message: 'Not authenticated.', ok: false })
        return send(res, 200, {
          ok: true,
          candidates: db.candidates.filter((c) => c.is_active).map(serialize),
        })
      }

      if (p.startsWith('/api/photo/') && method === 'GET') {
        if (!auth(req)) return send(res, 401, { message: 'Not authenticated.', ok: false })
        const id = Number(p.split('/').pop())
        const c = db.candidates.find((x) => x.id === id)
        if (!c) return send(res, 404, { message: 'Candidate not found.', ok: false })
        return send(res, 200, { ok: true, id, photo_url: c.photo_url })
      }

      if (p === '/api/vote' && method === 'POST') {
        const body = await readBody(req)
        if (!db.settings.voting_open) return send(res, 403, { message: 'Voting is currently closed.', ok: false })
        const s = db.sessions.find((x) => x.token === body.session_token && x.status === 'active' && new Date(x.expires_at) > new Date())
        if (!s) return send(res, 403, { message: 'This voting session is no longer active.', ok: false })
        if (db.votes.some((v) => v.student_email === s.student_email)) {
          return send(res, 409, { message: 'This student has already voted.', ok: false })
        }
        const cand = db.candidates.find((c) => c.id === Number(body.candidate_id) && c.is_active)
        if (!cand) return send(res, 404, { message: 'Candidate not found.', ok: false })
        const prev = [...db.candidates].sort((a, b) => b.vote_count - a.vote_count)[0]
        db.votes.push({
          id: db.next.vote++,
          candidate_id: cand.id,
          student_email: s.student_email,
          voted_at: nowIso(),
        })
        recalc()
        s.status = 'voted'
        const leader = [...db.candidates].sort((a, b) => b.vote_count - a.vote_count)[0]
        const leadChanged = prev && leader && prev.id !== leader.id
        db.events.push({
          id: db.next.event++,
          candidate_id: cand.id,
          candidate_name: cand.name,
          new_count: cand.vote_count,
          lead_changed: !!leadChanged,
          leader_id: leader.id,
          leader_name: leader.name,
          created_at: nowIso(),
        })
        save()
        pushSheet({ action: 'ingestVote', student_email: s.student_email, candidate_id: cand.id })
        return send(res, 200, {
          ok: true,
          message: 'Vote cast successfully.',
          candidate_id: cand.id,
          candidate_name: cand.name,
          new_count: cand.vote_count,
          lead_changed: !!leadChanged,
          leader_id: leader.id,
        })
      }

      if (p === '/api/admin/results' && method === 'GET') {
        if (!auth(req, 'admin')) return send(res, 401, { message: 'Not authenticated.', ok: false })
        const after = Number(url.searchParams.get('after_id') || 0)
        const payload = results()
        payload.ok = true
        payload.events = db.events.filter((e) => e.id > after).slice(-50)
        return send(res, 200, payload)
      }

      if (p === '/api/admin/events' && method === 'GET') {
        if (!auth(req, 'admin')) return send(res, 401, { message: 'Not authenticated.', ok: false })
        const after = Number(url.searchParams.get('after_id') || 0)
        return send(res, 200, { ok: true, events: db.events.filter((e) => e.id > after).slice(-50) })
      }

      if (p === '/api/admin/voting/toggle' && method === 'POST') {
        if (!auth(req, 'admin')) return send(res, 401, { message: 'Not authenticated.', ok: false })
        const body = await readBody(req)
        db.settings.voting_open = body.open === true || body.open === 'true'
        save()
        return send(res, 200, { ok: true, voting_open: db.settings.voting_open })
      }

      if (p === '/api/admin/settings' && (method === 'GET' || method === 'PUT' || method === 'POST')) {
        if (!auth(req, 'admin')) return send(res, 401, { message: 'Not authenticated.', ok: false })
        if (method !== 'GET') {
          const body = await readBody(req)
          if (body.election_title) db.settings.election_title = body.election_title
          if (body.eligible_students != null) db.settings.eligible_students = Number(body.eligible_students)
          save()
        }
        return send(res, 200, {
          ok: true,
          election_title: db.settings.election_title,
          eligible_students: db.settings.eligible_students,
          total_eligible_students: db.settings.eligible_students,
          voting_open: db.settings.voting_open,
        })
      }

      if (p === '/api/admin/teachers' && method === 'GET') {
        if (!auth(req, 'admin')) return send(res, 401, { message: 'Not authenticated.', ok: false })
        return send(res, 200, {
          ok: true,
          teachers: db.users.filter((u) => u.role === 'teacher').map((u) => ({ id: u.id, name: u.name, email: u.email })),
        })
      }

      if (p === '/api/admin/teachers' && method === 'POST') {
        if (!auth(req, 'admin')) return send(res, 401, { message: 'Not authenticated.', ok: false })
        const body = await readBody(req)
        const email = String(body.email || '').toLowerCase().trim()
        if (!body.name || !email || String(body.password || '').length < 8) {
          return send(res, 422, { message: 'Name, school email, and password (8+ chars) required.', ok: false })
        }
        db.users.push({
          id: db.next.user++,
          name: body.name,
          email,
          password_sha: sha(body.password),
          role: 'teacher',
        })
        save()
        return send(res, 201, { ok: true, teacher: { name: body.name, email } })
      }

      if (p === '/api/admin/candidates' && method === 'POST') {
        if (!auth(req, 'admin')) return send(res, 401, { message: 'Not authenticated.', ok: false })
        const body = await readBody(req)
        const id = db.next.candidate++
        const c = {
          id,
          name: body.name,
          position: body.position,
          photo_url: body.photo_base64 || null,
          vote_count: 0,
          color_tag: body.color_tag || COLORS[(id - 1) % COLORS.length],
          is_active: true,
        }
        db.candidates.push(c)
        save()
        return send(res, 201, { ok: true, candidate: serialize(c) })
      }

      if (p.startsWith('/api/admin/candidates/') && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
        if (!auth(req, 'admin')) return send(res, 401, { message: 'Not authenticated.', ok: false })
        const id = Number(p.split('/').pop())
        const idx = db.candidates.findIndex((c) => c.id === id)
        if (idx < 0) return send(res, 404, { message: 'Candidate not found.', ok: false })
        if (method === 'DELETE') {
          db.votes = db.votes.filter((v) => Number(v.candidate_id) !== id)
          db.events = (db.events || []).filter((e) => Number(e.candidate_id) !== id)
          db.candidates.splice(idx, 1)
          if (!deletedIds.includes(id)) {
            deletedIds.push(id)
            saveDeleted()
          }
          save()
          pushSheet({ action: 'ingestDeleteCandidate', candidate_id: id })
          return send(res, 200, { ok: true, message: 'Candidate removed.' })
        }
        const body = await readBody(req)
        const c = db.candidates[idx]
        if (body.name) c.name = body.name
        if (body.position) c.position = body.position
        if (body.photo_base64) c.photo_url = body.photo_base64
        save()
        return send(res, 200, { ok: true, candidate: serialize(c) })
      }

      return send(res, 404, { message: 'Not found', ok: false })
    } catch (err) {
      return send(res, 500, { message: String(err.message || err), ok: false })
    }
  })

  return new Promise((resolve, reject) => {
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') return resolve(null)
      reject(err)
    })
    server.listen(port, '0.0.0.0', () => resolve(server))
  })
}

module.exports = { startServer }

if (require.main === module) {
  const dir = path.join(__dirname, '..', 'data')
  startServer(dir).then(() => console.log('NJV API http://127.0.0.1:8765'))
}
