var DOMAIN = 'njv.edu.pk';
var SESSION_MINUTES = 5;
var COLORS = ['#0d7a3e', '#1d4ed8', '#b45309', '#7c3aed', '#be123c', '#0f766e', '#c2410c', '#4338ca'];

function doPost(e) {
  try {
    var body = parseBody_(e);
    var out = dispatch_(String(body.action || ''), body);
    return json_(out, e && e.parameter && e.parameter.callback);
  } catch (err) {
    return json_({ ok: false, message: String(err.message || err), status: 500 }, e && e.parameter && e.parameter.callback);
  }
}

function doGet(e) {
  try {
    var body = parseBody_(e);
    var cb = e && e.parameter && e.parameter.callback;
    if (!body.action) {
      return json_({ ok: true, message: 'NJV voting Sheets API.' }, cb);
    }
    return json_(dispatch_(String(body.action), body), cb);
  } catch (err) {
    return json_({ ok: false, message: String(err.message || err), status: 500 }, e && e.parameter && e.parameter.callback);
  }
}

function parseBody_(e) {
  var body = {};
  if (e && e.parameter && e.parameter.payload) {
    body = JSON.parse(e.parameter.payload);
  } else if (e && e.postData && e.postData.contents && String(e.postData.type || '').indexOf('json') !== -1) {
    body = JSON.parse(e.postData.contents);
  } else if (e && e.postData && e.postData.contents && String(e.postData.contents).charAt(0) === '{') {
    body = JSON.parse(e.postData.contents);
  } else if (e && e.parameter && e.parameter.action) {
    body = e.parameter;
  }
  return body || {};
}

function setup() {
  var ss = SpreadsheetApp.getActive();
  ensureSheet_(ss, 'Users', ['id', 'name', 'email', 'password_sha', 'role']);
  ensureSheet_(ss, 'Candidates', ['id', 'name', 'position', 'photo_url', 'vote_count', 'color_tag', 'is_active']);
  ensureSheet_(ss, 'Votes', ['id', 'candidate_id', 'student_email', 'voted_at']);
  ensureSheet_(ss, 'Sessions', ['token', 'teacher_id', 'student_email', 'expires_at', 'status']);
  ensureSheet_(ss, 'Events', ['id', 'candidate_id', 'candidate_name', 'new_count', 'lead_changed', 'leader_id', 'leader_name', 'created_at']);
  ensureSheet_(ss, 'Settings', ['key', 'value']);
  ensureSheet_(ss, 'Tokens', ['token', 'user_id', 'role', 'expires_at']);

  var users = ss.getSheetByName('Users');
  if (users.getLastRow() < 2) {
    users.appendRow([1, 'NJV Principal', 'admin@' + DOMAIN, sha_('admin12345'), 'admin']);
    users.appendRow([2, 'Ms. Ayesha Khan', 'teacher@' + DOMAIN, sha_('teacher12345'), 'teacher']);
  }

  var cand = ss.getSheetByName('Candidates');
  if (cand.getLastRow() < 2) {
    var seed = [
      [1, 'Ahmed Farooq', 'Head Boy', '', 0, '#0d7a3e', 'TRUE'],
      [2, 'Sara Malik', 'Head Girl', '', 0, '#1d4ed8', 'TRUE'],
      [3, 'Hassan Raza', 'Head Boy', '', 0, '#b45309', 'TRUE'],
      [4, 'Zainab Ali', 'Head Girl', '', 0, '#7c3aed', 'TRUE'],
      [5, 'Bilal Hussain', 'Sports Captain', '', 0, '#be123c', 'TRUE'],
      [6, 'Fatima Noor', 'Sports Captain', '', 0, '#0f766e', 'TRUE'],
    ];
    seed.forEach(function (row) { cand.appendRow(row); });
  }

  setSetting_('voting_open', 'true');
  setSetting_('election_title', 'NJV Government School Student Council Election 2026');
  setSetting_('eligible_students', '450');
}

function dispatch_(action, body) {
  switch (action) {
    case 'ping':
      return { ok: true };
    case 'teacherLogin':
      return login_(body, 'teacher');
    case 'adminLogin':
      return login_(body, 'admin');
    case 'logout':
      return { ok: true, message: 'Logged out.' };
    case 'me':
      return { ok: true, user: requireUser_(body.token, body.role || null) };
    case 'startSession':
      return startSession_(body);
    case 'endSession':
      return endSession_(body);
    case 'candidates':
      return listCandidates_(body);
    case 'ballot':
      requireUser_(body.token, body.role || null);
      return {
        ok: true,
        election_title: setting_('election_title'),
        candidates: candidates_(true).map(function (row) { return serializeCandidate_(row, true); }),
      };
    case 'photo':
      return photo_(body);
    case 'vote':
      return vote_(body);
    case 'ingestVote':
      return ingestVote_(body);
    case 'ingestDeleteCandidate':
      return ingestDeleteCandidate_(body);
    case 'syncPull':
      return syncPull_(body);
    case 'results':
      requireUser_(body.token, 'admin');
      return results_(body);
    case 'toggleVoting':
      requireUser_(body.token, 'admin');
      setSetting_('voting_open', body.open === true || body.open === 'true' ? 'true' : 'false');
      return { ok: true, voting_open: setting_('voting_open') === 'true' };
    case 'events':
      requireUser_(body.token, 'admin');
      return events_(body);
    case 'settings':
      requireUser_(body.token, 'admin');
      return settingsPayload_();
    case 'updateSettings':
      requireUser_(body.token, 'admin');
      if (body.election_title) setSetting_('election_title', body.election_title);
      if (body.eligible_students != null) setSetting_('eligible_students', String(body.eligible_students));
      return settingsPayload_();
    case 'teachers':
      requireUser_(body.token, 'admin');
      return { ok: true, teachers: listUsers_('teacher') };
    case 'storeTeacher':
      requireUser_(body.token, 'admin');
      return storeTeacher_(body);
    case 'storeCandidate':
      requireUser_(body.token, 'admin');
      return storeCandidate_(body);
    case 'updateCandidate':
      requireUser_(body.token, 'admin');
      return updateCandidate_(body);
    case 'destroyCandidate':
      requireUser_(body.token, 'admin');
      return destroyCandidate_(body);
    default:
      return { ok: false, message: 'Unknown action', status: 400 };
  }
}

function login_(body, role) {
  var email = String(body.email || '').toLowerCase().trim();
  var password = String(body.password || '');
  var rows = dataRows_('Users');
  var user = null;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][2]).toLowerCase() === email && String(rows[i][4]) === role) {
      user = rows[i];
      break;
    }
  }
  if (!user || sha_(password) !== String(user[3])) {
    return { ok: false, message: 'The provided credentials are incorrect.', status: 422 };
  }
  var token = randomToken_();
  CacheService.getScriptCache().put(
    'tok_' + token,
    JSON.stringify({ user_id: Number(user[0]), role: role }),
    21600
  );
  return {
    ok: true,
    token: token,
    user: { id: Number(user[0]), name: user[1], email: user[2], role: role },
  };
}

function requireUser_(token, role) {
  if (!token) throw err_('Not authenticated.', 401);
  var rec = null;
  var cached = CacheService.getScriptCache().get('tok_' + token);
  if (cached) {
    rec = JSON.parse(cached);
  } else {
    var rows = dataRows_('Tokens');
    var now = new Date();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][0]) === token) {
        if (rows[i][3] && new Date(rows[i][3]) < now) throw err_('Session expired.', 401);
        rec = { user_id: Number(rows[i][1]), role: String(rows[i][2]) };
        break;
      }
    }
  }
  if (!rec) throw err_('Not authenticated.', 401);
  if (role && String(rec.role) !== role) throw err_('Forbidden.', 403);
  var users = dataRows_('Users');
  for (var j = 0; j < users.length; j++) {
    if (Number(users[j][0]) === Number(rec.user_id)) {
      return { id: Number(users[j][0]), name: users[j][1], email: users[j][2], role: users[j][4] };
    }
  }
  throw err_('Not authenticated.', 401);
}

function startSession_(body) {
  var teacher = requireUser_(body.token, 'teacher');
  if (setting_('voting_open') !== 'true') {
    return { ok: false, message: 'Voting is currently closed.', status: 403 };
  }
  var email = String(body.student_email || '').toLowerCase().trim();
  if (!isSchoolEmail_(email)) {
    return { ok: false, message: 'Email must be a valid @' + DOMAIN + ' address.', status: 422 };
  }
  if (hasVoted_(email)) {
    return { ok: false, message: 'This student has already voted.', status: 409 };
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (hasVoted_(email)) {
      return { ok: false, message: 'This student has already voted.', status: 409 };
    }
    var sh = sh_('Sessions');
    var token = randomToken_();
    var exp = new Date();
    exp.setMinutes(exp.getMinutes() + SESSION_MINUTES);
    sh.appendRow([token, teacher.id, email, exp.toISOString(), 'active']);
    return {
      ok: true,
      session_token: token,
      student_email: email,
      expires_at: exp.toISOString(),
      election_title: setting_('election_title'),
      candidates: candidates_(true).map(function (row) {
        return serializeCandidate_(row, true);
      }),
    };
  } finally {
    lock.releaseLock();
  }
}

function endSession_(body) {
  requireUser_(body.token, 'teacher');
  var sh = sh_('Sessions');
  var rows = dataRows_('Sessions');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === String(body.session_token)) {
      sh.getRange(i + 2, 5).setValue('ended');
      break;
    }
  }
  return { ok: true, message: 'Session ended.' };
}

function listCandidates_(body) {
  var session = activeSession_(body.session_token);
  if (!session) {
    return { ok: false, message: 'An active teacher-authorized session is required.', status: 403 };
  }
  return {
    ok: true,
    election_title: setting_('election_title'),
    student_email: session.email,
    expires_at: session.expires_at,
    candidates: candidates_(true).map(function (row) {
      return serializeCandidate_(row, true);
    }),
  };
}

function photo_(body) {
  if (body.session_token) {
    if (!activeSession_(body.session_token)) {
      return { ok: false, message: 'An active teacher-authorized session is required.', status: 403 };
    }
  } else {
    requireUser_(body.token, body.role || null);
  }
  var id = Number(body.id);
  var rows = candidates_(true);
  for (var i = 0; i < rows.length; i++) {
    if (Number(rows[i][0]) === id) {
      var c = serializeCandidate_(rows[i], false);
      return { ok: true, id: c.id, photo_url: c.photo_url };
    }
  }
  return { ok: false, message: 'Candidate not found.', status: 404 };
}

function syncPull_(body) {
  if (String(body.secret || '') !== 'njv-sync-2026') {
    return { ok: false, message: 'Forbidden', status: 403 };
  }
  var votes = dataRows_('Votes').map(function (r) {
    return {
      id: Number(r[0]),
      candidate_id: Number(r[1]),
      student_email: String(r[2] || '').toLowerCase(),
      voted_at: r[3],
    };
  });
  return {
    ok: true,
    candidates: candidates_(false).map(function (row) {
      return serializeCandidate_(row, true);
    }),
    votes: votes,
    election_title: setting_('election_title'),
    voting_open: setting_('voting_open') === 'true',
    eligible_students: Number(setting_('eligible_students') || 0),
  };
}

function ingestDeleteCandidate_(body) {
  if (String(body.secret || '') !== 'njv-sync-2026') {
    return { ok: false, message: 'Forbidden', status: 403 };
  }
  var id = Number(body.candidate_id);
  var ss = SpreadsheetApp.getActive();
  var cand = ss.getSheetByName('Candidates');
  var crows = dataRows_('Candidates');
  for (var i = crows.length - 1; i >= 0; i--) {
    if (Number(crows[i][0]) === id) cand.deleteRow(i + 2);
  }
  var votes = ss.getSheetByName('Votes');
  var vrows = dataRows_('Votes');
  for (var j = vrows.length - 1; j >= 0; j--) {
    if (Number(vrows[j][1]) === id) votes.deleteRow(j + 2);
  }
  var events = sh_('Events');
  if (events) {
    var erows = dataRows_('Events');
    for (var k = erows.length - 1; k >= 0; k--) {
      if (Number(erows[k][1]) === id) events.deleteRow(k + 2);
    }
  }
  return { ok: true };
}

function ingestVote_(body) {
  if (String(body.secret || '') !== 'njv-sync-2026') {
    return { ok: false, message: 'Forbidden', status: 403 };
  }
  var email = String(body.student_email || '').toLowerCase().trim();
  if (!email || hasVoted_(email)) {
    return { ok: true, skipped: true };
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    if (hasVoted_(email)) return { ok: true, skipped: true };
    var cid = Number(body.candidate_id);
    var candSheet = SpreadsheetApp.getActive().getSheetByName('Candidates');
    var rows = dataRows_('Candidates');
    var idx = -1;
    var cand = null;
    for (var i = 0; i < rows.length; i++) {
      if (Number(rows[i][0]) === cid && isTrue_(rows[i][6])) {
        idx = i;
        cand = rows[i];
        break;
      }
    }
    if (!cand) return { ok: false, message: 'Candidate not found.', status: 404 };
    var newCount = Number(cand[4] || 0) + 1;
    candSheet.getRange(idx + 2, 5).setValue(newCount);
    var votes = SpreadsheetApp.getActive().getSheetByName('Votes');
    votes.appendRow([nextId_(votes), cid, email, new Date().toISOString()]);
    return { ok: true, new_count: newCount };
  } finally {
    lock.releaseLock();
  }
}

function vote_(body) {
  if (setting_('voting_open') !== 'true') {
    return { ok: false, message: 'Voting is currently closed.', status: 403 };
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var session = activeSession_(body.session_token);
    if (!session) {
      return { ok: false, message: 'This voting session is no longer active.', status: 403 };
    }
    if (hasVoted_(session.email)) {
      return { ok: false, message: 'This student has already voted.', status: 409 };
    }

    var ids = body.candidate_ids || body.candidate_id;
    if (Object.prototype.toString.call(ids) !== '[object Array]') ids = [ids];
    ids = ids.map(function (x) { return Number(x); }).filter(function (x) { return x > 0; });

    var candSheet = sh_('Candidates');
    var rows = dataRows_('Candidates');
    var required = {};
    var i;
    for (i = 0; i < rows.length; i++) {
      if (isTrue_(rows[i][6])) required[String(rows[i][2])] = true;
    }
    var requiredList = Object.keys(required);
    var picked = {};
    var chosen = [];
    for (i = 0; i < ids.length; i++) {
      var cid = ids[i];
      var idx = -1;
      var cand = null;
      for (var r = 0; r < rows.length; r++) {
        if (Number(rows[r][0]) === cid && isTrue_(rows[r][6])) {
          idx = r;
          cand = rows[r];
          break;
        }
      }
      if (!cand) return { ok: false, message: 'Candidate not found.', status: 404 };
      var pos = String(cand[2]);
      if (picked[pos]) {
        return { ok: false, message: 'Pick only one candidate for ' + pos + '.', status: 422 };
      }
      picked[pos] = true;
      chosen.push({ cid: cid, idx: idx, cand: cand, pos: pos });
    }
    for (i = 0; i < requiredList.length; i++) {
      if (!picked[requiredList[i]]) {
        return { ok: false, message: 'Select one candidate for every post, including ' + requiredList[i] + '.', status: 422 };
      }
    }

    var prevLeader = leaderId_(rows);
    var votes = sh_('Votes');
    var names = [];
    var now = new Date().toISOString();
    for (i = 0; i < chosen.length; i++) {
      var item = chosen[i];
      var newCount = Number(item.cand[4] || 0) + 1;
      candSheet.getRange(item.idx + 2, 5).setValue(newCount);
      rows[item.idx][4] = newCount;
      votes.appendRow([nextId_(votes), item.cid, session.email, now]);
      names.push(item.cand[1]);
    }
    var newLeader = leaderId_(rows);
    var leadChanged = prevLeader && newLeader && Number(prevLeader) !== Number(newLeader);
    var events = sh_('Events');
    events.appendRow([
      nextId_(events),
      chosen[0].cid,
      names.join(', '),
      chosen.length,
      leadChanged ? 'TRUE' : 'FALSE',
      newLeader,
      nameById_(rows, newLeader),
      now,
    ]);

    var sessSheet = sh_('Sessions');
    var srows = dataRows_('Sessions');
    for (var s = 0; s < srows.length; s++) {
      if (String(srows[s][0]) === String(body.session_token)) {
        sessSheet.getRange(s + 2, 5).setValue('voted');
        break;
      }
    }

    return {
      ok: true,
      message: 'Vote cast successfully.',
      candidate_ids: ids,
      candidate_name: names.join(', '),
      lead_changed: !!leadChanged,
      leader_id: newLeader,
    };
  } finally {
    lock.releaseLock();
  }
}

function results_(body) {
  body = body || {};
  var skipPhoto = body.include_photos === false || body.include_photos === 'false';
  var list = candidates_(false).map(function (row) {
    return serializeCandidate_(row, skipPhoto);
  });
  list.sort(function (a, b) {
    if (b.vote_count !== a.vote_count) return b.vote_count - a.vote_count;
    return String(a.name).localeCompare(String(b.name));
  });
  var total = dataRows_('Votes').length;
  var eligible = Number(setting_('eligible_students') || 0);
  var leader = list[0];
  var bundled = events_(body);
  return {
    ok: true,
    election_title: setting_('election_title'),
    voting_open: setting_('voting_open') === 'true',
    eligible_students: eligible,
    total_votes: total,
    turnout_percent: eligible > 0 ? Math.round((total / eligible) * 1000) / 10 : 0,
    leader_id: leader && leader.vote_count > 0 ? leader.id : null,
    candidates: list,
    events: bundled.events,
  };
}

function events_(body) {
  var after = Number(body.after_id || 0);
  var rows = dataRows_('Events');
  var events = [];
  for (var i = 0; i < rows.length; i++) {
    var id = Number(rows[i][0]);
    if (id > after) {
      events.push({
        id: id,
        candidate_id: Number(rows[i][1]),
        candidate_name: rows[i][2],
        new_count: Number(rows[i][3]),
        lead_changed: isTrue_(rows[i][4]),
        leader_id: rows[i][5] ? Number(rows[i][5]) : null,
        leader_name: rows[i][6] || null,
        created_at: rows[i][7],
      });
    }
  }
  return { ok: true, events: events.slice(-50) };
}

function storeTeacher_(body) {
  var email = String(body.email || '').toLowerCase().trim();
  if (!email || !body.password || String(body.password).length < 8) {
    return { ok: false, message: 'Name, school email, and password (8+ chars) required.', status: 422 };
  }
  var users = SpreadsheetApp.getActive().getSheetByName('Users');
  var rows = dataRows_('Users');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][2]).toLowerCase() === email) {
      return { ok: false, message: 'That email is already in use.', status: 422 };
    }
  }
  var id = nextId_(users);
  users.appendRow([id, body.name, email, sha_(body.password), 'teacher']);
  return { ok: true, teacher: { id: id, name: body.name, email: email } };
}

function storeCandidate_(body) {
  var sh = SpreadsheetApp.getActive().getSheetByName('Candidates');
  var id = nextId_(sh);
  var photo = savePhoto_(body);
  var color = body.color_tag || COLORS[(id - 1) % COLORS.length];
  sh.appendRow([id, body.name, body.position, photo || '', 0, color, 'TRUE']);
  return { ok: true, candidate: serializeCandidate_([id, body.name, body.position, photo || '', 0, color, true]) };
}

function updateCandidate_(body) {
  var id = Number(body.id);
  var sh = SpreadsheetApp.getActive().getSheetByName('Candidates');
  var rows = dataRows_('Candidates');
  for (var i = 0; i < rows.length; i++) {
    if (Number(rows[i][0]) === id) {
      if (body.name) sh.getRange(i + 2, 2).setValue(body.name);
      if (body.position) sh.getRange(i + 2, 3).setValue(body.position);
      if (body.color_tag) sh.getRange(i + 2, 6).setValue(body.color_tag);
      if (body.is_active != null) sh.getRange(i + 2, 7).setValue(body.is_active ? 'TRUE' : 'FALSE');
      var photo = savePhoto_(body);
      if (photo) sh.getRange(i + 2, 4).setValue(photo);
      var fresh = dataRows_('Candidates')[i];
      return { ok: true, candidate: serializeCandidate_(fresh) };
    }
  }
  return { ok: false, message: 'Candidate not found.', status: 404 };
}

function destroyCandidate_(body) {
  return ingestDeleteCandidate_({ secret: 'njv-sync-2026', candidate_id: body.id || body.candidate_id });
}

function savePhoto_(body) {
  if (!body.photo_base64) return '';
  var raw = String(body.photo_base64);
  if (raw.indexOf('data:image') === 0) {
    if (raw.length > 49000) {
      throw new Error('Photo is too large. Use a smaller jpg.');
    }
    return raw;
  }
  return '';
}

function photoFolder_() {
  var it = DriveApp.getFoldersByName('NJV-Candidate-Photos');
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder('NJV-Candidate-Photos');
}

function serializeCandidate_(row, skipPhoto) {
  var url = row[3] ? String(row[3]) : '';
  if (url.indexOf('script.google.com') !== -1) url = '';
  return {
    id: Number(row[0]),
    name: row[1],
    position: row[2],
    photo_url: skipPhoto ? null : (url || null),
    vote_count: Number(row[4] || 0),
    color_tag: row[5] || '#FFC72C',
    is_active: isTrue_(row[6]),
    has_photo: !!url,
  };
}

function candidates_(activeOnly) {
  var rows = dataRows_('Candidates');
  if (!activeOnly) return rows;
  return rows.filter(function (r) { return isTrue_(r[6]); });
}

function activeSession_(token) {
  if (!token) return null;
  var rows = dataRows_('Sessions');
  var now = new Date();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === String(token) && String(rows[i][4]) === 'active') {
      var exp = new Date(rows[i][3]);
      if (exp < now) return null;
      return { token: token, teacher_id: rows[i][1], email: String(rows[i][2]).toLowerCase(), expires_at: rows[i][3] };
    }
  }
  return null;
}

function hasVoted_(email) {
  var rows = dataRows_('Votes');
  email = String(email).toLowerCase();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][2]).toLowerCase() === email) return true;
  }
  return false;
}

function leaderId_(rows) {
  var best = null;
  var bestCount = -1;
  for (var i = 0; i < rows.length; i++) {
    if (!isTrue_(rows[i][6])) continue;
    var c = Number(rows[i][4] || 0);
    if (c > bestCount) {
      bestCount = c;
      best = Number(rows[i][0]);
    }
  }
  return bestCount > 0 ? best : null;
}

function nameById_(rows, id) {
  for (var i = 0; i < rows.length; i++) {
    if (Number(rows[i][0]) === Number(id)) return rows[i][1];
  }
  return '';
}

function listUsers_(role) {
  return dataRows_('Users').filter(function (r) { return String(r[4]) === role; }).map(function (r) {
    return { id: Number(r[0]), name: r[1], email: r[2] };
  });
}

function settingsPayload_() {
  var eligible = Number(setting_('eligible_students') || 0);
  return {
    ok: true,
    election_title: setting_('election_title'),
    eligible_students: eligible,
    total_eligible_students: eligible,
    voting_open: setting_('voting_open') === 'true',
  };
}

function setting_(key) {
  var rows = dataRows_('Settings');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === key) return String(rows[i][1]);
  }
  return '';
}

function setSetting_(key, value) {
  var sh = SpreadsheetApp.getActive().getSheetByName('Settings');
  var rows = dataRows_('Settings');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === key) {
      sh.getRange(i + 2, 2).setValue(value);
      return;
    }
  }
  sh.appendRow([key, value]);
}

function sh_(name) {
  var headers = {
    Users: ['id', 'name', 'email', 'password_sha', 'role'],
    Candidates: ['id', 'name', 'position', 'photo_url', 'vote_count', 'color_tag', 'is_active'],
    Votes: ['id', 'candidate_id', 'student_email', 'voted_at'],
    Sessions: ['token', 'teacher_id', 'student_email', 'expires_at', 'status'],
    Events: ['id', 'candidate_id', 'candidate_name', 'new_count', 'lead_changed', 'leader_id', 'leader_name', 'created_at'],
    Settings: ['key', 'value'],
    Tokens: ['token', 'user_id', 'role', 'expires_at'],
  };
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    var cols = headers[name] || ['id'];
    sh.getRange(1, 1, 1, cols.length).setValues([cols]);
  }
  return sh;
}

function dataRows_(name) {
  var sh = sh_(name);
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
}

function nextId_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 1;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return Number(r[0]) || 0; });
  return Math.max.apply(null, ids) + 1;
}

function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function isSchoolEmail_(email) {
  return /^[a-z0-9._%+\-]+@njv\.edu\.pk$/.test(email);
}

function isTrue_(v) {
  return v === true || String(v).toUpperCase() === 'TRUE' || v === 1 || v === '1';
}

function sha_(s) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s);
  return bytes.map(function (b) {
    var v = b < 0 ? b + 256 : b;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

function randomToken_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

function err_(message, status) {
  var e = new Error(message);
  e.status = status;
  throw e;
}

function json_(obj, callback) {
  if (obj && obj.ok === false && !obj.message) obj.message = 'Request failed';
  var text = JSON.stringify(obj);
  if (callback && /^njv_/.test(String(callback))) {
    return ContentService.createTextOutput(callback + '(' + text + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}
