// ============================================
// AbsensiKu - Database Layer (Turso Cloud for Vercel)
// ============================================

const bcrypt = require('bcryptjs');
const crypto = require('crypto');

let client;
let tablesReady = false;

function init() {
  const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (!tursoUrl) {
    console.error('TURSO_DATABASE_URL atau TURSO_URL tidak ditemukan!');
    return;
  }

  try {
    const formattedUrl = tursoUrl.replace('libsql://', 'https://');
    const { createClient } = require('@libsql/client/web');
    client = createClient({ url: formattedUrl, authToken: tursoToken });
    console.log('Connected to Turso Cloud');
  } catch (e) {
    console.error('Gagal koneksi Turso:', e.message);
  }
}

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

// Direct execute - NO deadlock risk
async function rawExec(sql, args) {
  return await client.execute({ sql, args: args || [] });
}

async function ensureTables() {
  if (tablesReady || !client) return;

  await rawExec("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, fullname TEXT NOT NULL, role TEXT DEFAULT 'guru', nip TEXT, mapel TEXT)");
  await rawExec("CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL)");
  await rawExec("CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, school_name TEXT, radius_meters INTEGER, school_lat TEXT, school_lng TEXT, clock_in_time TEXT, clock_out_time TEXT)");
  await rawExec("CREATE TABLE IF NOT EXISTS attendance (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, date TEXT NOT NULL, clock_in TEXT, clock_out TEXT, status TEXT, reason TEXT, reason_detail TEXT, is_in_radius INTEGER, location_in TEXT, location_out TEXT, clock_out_reason TEXT, clock_out_reason_detail TEXT)");

  // Default admin
  const res = await rawExec("SELECT id FROM users WHERE username = 'admin'");
  if (res.rows.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await rawExec("INSERT INTO users (id, username, password, fullname, role) VALUES (?, ?, ?, ?, ?)", ['admin', 'admin', hash, 'Administrator', 'admin']);
  }

  // Default settings
  const sRes = await rawExec("SELECT id FROM settings WHERE id = '1'");
  if (sRes.rows.length === 0) {
    await rawExec("INSERT INTO settings (id, school_name, radius_meters, school_lat, school_lng, clock_in_time, clock_out_time) VALUES (?, ?, ?, ?, ?, ?, ?)", ['1', 'MTs Al-Asyari', 500, '-6.8833', '112.0500', '07:00', '15:00']);
  }

  // Migrate off_days column if not exists
  try { await rawExec("ALTER TABLE settings ADD COLUMN off_days TEXT DEFAULT '0,6'"); } catch (e) {}

  tablesReady = true;
}

// Safe execute - ensures tables exist first
async function db(sql, args) {
  if (!client) throw new Error('Database not connected');
  await ensureTables();
  return await client.execute({ sql, args: args || [] });
}

// ----- AUTH -----
async function login(username, password) {
  const res = await db('SELECT * FROM users WHERE username = ?', [username]);
  const row = res.rows[0];
  if (!row) return { success: false, message: 'Username tidak ditemukan' };
  if (!bcrypt.compareSync(password, row.password)) return { success: false, message: 'Password salah' };

  const token = generateId() + generateId();
  await db('INSERT INTO sessions (token, user_id) VALUES (?, ?)', [token, row.id]);
  return { success: true, token, user: { id: row.id, username: row.username, fullname: row.fullname, role: row.role, name: row.fullname, nip: row.nip, mapel: row.mapel } };
}

async function logout(token) {
  if (token) await db('DELETE FROM sessions WHERE token = ?', [token]);
  return { success: true };
}

async function getUserByToken(token) {
  if (!token) return null;
  const res = await db('SELECT u.id, u.username, u.fullname, u.fullname as name, u.role, u.nip, u.mapel FROM users u JOIN sessions s ON u.id = s.user_id WHERE s.token = ?', [token]);
  return res.rows[0] || null;
}

// ----- SETTINGS -----
async function getSettings() {
  const res = await db("SELECT * FROM settings WHERE id = '1'");
  const row = res.rows[0];
  if (!row) return null;
  return {
    schoolName: row.school_name,
    schoolLat: parseFloat(row.school_lat) || 0,
    schoolLng: parseFloat(row.school_lng) || 0,
    radius: row.radius_meters || 100,
    workStartTime: row.clock_in_time || '07:00',
    lateThreshold: 60,
    workEndTime: row.clock_out_time || '15:00',
    offDays: row.off_days || '0,6'
  };
}

async function updateSettings(s) {
  await db("UPDATE settings SET school_name=?, radius_meters=?, school_lat=?, school_lng=?, clock_in_time=?, clock_out_time=?, off_days=? WHERE id='1'", [
    s.schoolName || s.school_name || '',
    s.radius || s.radius_meters || 100,
    s.schoolLat || s.school_lat || '',
    s.schoolLng || s.school_lng || '',
    s.workStartTime || s.clock_in_time || '07:00',
    s.workEndTime || s.clock_out_time || '15:00',
    s.offDays !== undefined ? s.offDays : '0,6'
  ]);
  return { success: true };
}

// ----- USERS -----
async function getUsers() {
  const res = await db("SELECT id, username, fullname, fullname as name, role, nip, mapel FROM users WHERE role != 'admin'");
  return res.rows;
}

async function getTeachers() {
  const res = await db("SELECT id, username, fullname, fullname as name, role, nip, mapel FROM users WHERE role = 'guru'");
  return res.rows;
}

async function getUserById(id) {
  const res = await db("SELECT id, username, fullname, fullname as name, role, nip, mapel FROM users WHERE id = ?", [id]);
  return res.rows[0] || null;
}

async function addUser(u) {
  try {
    const id = generateId();
    const hash = bcrypt.hashSync(u.password, 10);
    await db("INSERT INTO users (id, username, password, fullname, role, nip, mapel) VALUES (?, ?, ?, ?, ?, ?, ?)", [id, u.username, hash, u.name || u.fullname, u.role || 'guru', u.nip || '', u.mapel || '']);
    return { success: true, id };
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) return { success: false, message: 'Username sudah digunakan' };
    return { success: false, message: e.message };
  }
}

async function updateUser(id, u) {
  try {
    if (u.password) {
      const hash = bcrypt.hashSync(u.password, 10);
      await db("UPDATE users SET username=?, password=?, fullname=?, nip=?, mapel=? WHERE id=?", [u.username, hash, u.name || u.fullname, u.nip || '', u.mapel || '', id]);
    } else {
      await db("UPDATE users SET username=?, fullname=?, nip=?, mapel=? WHERE id=?", [u.username, u.name || u.fullname, u.nip || '', u.mapel || '', id]);
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

async function deleteUser(id) {
  await db("DELETE FROM attendance WHERE user_id = ?", [id]);
  await db("DELETE FROM sessions WHERE user_id = ?", [id]);
  await db("DELETE FROM users WHERE id = ?", [id]);
  return { success: true };
}

async function resetUserPassword(id, pw) {
  const hash = bcrypt.hashSync(pw, 10);
  await db("UPDATE users SET password=? WHERE id=?", [hash, id]);
  return { success: true };
}

// ----- ATTENDANCE -----
async function getAttendance(filters) {
  if (!filters) filters = {};
  let sql = 'SELECT a.*, u.fullname, u.fullname as name, u.nip FROM attendance a JOIN users u ON a.user_id = u.id WHERE 1=1';
  const args = [];
  if (filters.userId) { sql += ' AND a.user_id=?'; args.push(filters.userId); }
  if (filters.date) { sql += ' AND a.date=?'; args.push(filters.date); }
  if (filters.year && filters.month !== undefined) {
    const m = String(filters.month + 1).padStart(2, '0');
    sql += ' AND a.date LIKE ?'; args.push(filters.year + '-' + m + '-%');
  }
  sql += ' ORDER BY a.date DESC, a.clock_in DESC LIMIT 1000';
  const res = await db(sql, args);
  return res.rows.map(r => ({
    ...r,
    isInRadius: !!r.is_in_radius,
    locationIn: safeParse(r.location_in),
    locationOut: safeParse(r.location_out)
  }));
}

function safeParse(v) {
  if (!v) return {};
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch (e) { return {}; }
}

async function getAttendanceByUserAndDate(userId, date) {
  const res = await db('SELECT * FROM attendance WHERE user_id=? AND date=?', [userId, date]);
  const r = res.rows[0];
  if (!r) return null;
  return { ...r, isInRadius: !!r.is_in_radius, locationIn: safeParse(r.location_in), locationOut: safeParse(r.location_out) };
}

async function addAttendance(rec) {
  const id = generateId();
  await db("INSERT INTO attendance (id, user_id, date, clock_in, clock_out, status, reason, reason_detail, is_in_radius, location_in, location_out, clock_out_reason, clock_out_reason_detail) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", [
    id, rec.userId, rec.date, rec.clockIn || null, rec.clockOut || null,
    rec.status || 'hadir', rec.reason || '', rec.reasonDetail || '',
    rec.isInRadius ? 1 : 0, JSON.stringify(rec.locationIn || {}),
    JSON.stringify(rec.locationOut || {}), rec.clockOutReason || '', rec.clockOutReasonDetail || ''
  ]);
  return { success: true, id };
}

async function updateAttendance(id, u) {
  const f = []; const a = [];
  if (u.clockIn !== undefined) { f.push('clock_in=?'); a.push(u.clockIn); }
  if (u.clockOut !== undefined) { f.push('clock_out=?'); a.push(u.clockOut); }
  if (u.status !== undefined) { f.push('status=?'); a.push(u.status); }
  if (u.reason !== undefined) { f.push('reason=?'); a.push(u.reason); }
  if (u.reasonDetail !== undefined) { f.push('reason_detail=?'); a.push(u.reasonDetail); }
  if (u.isInRadius !== undefined) { f.push('is_in_radius=?'); a.push(u.isInRadius ? 1 : 0); }
  if (u.locationIn !== undefined) { f.push('location_in=?'); a.push(JSON.stringify(u.locationIn)); }
  if (u.locationOut !== undefined) { f.push('location_out=?'); a.push(JSON.stringify(u.locationOut)); }
  if (u.clockOutReason !== undefined) { f.push('clock_out_reason=?'); a.push(u.clockOutReason); }
  if (u.clockOutReasonDetail !== undefined) { f.push('clock_out_reason_detail=?'); a.push(u.clockOutReasonDetail); }
  if (f.length === 0) return { success: false };
  a.push(id);
  await db('UPDATE attendance SET ' + f.join(', ') + ' WHERE id=?', a);
  return { success: true };
}

async function exportAllData() {
  const u = await db("SELECT * FROM users");
  const a = await db("SELECT * FROM attendance");
  const s = await db("SELECT * FROM settings");
  return { users: u.rows, attendance: a.rows, settings: s.rows };
}

module.exports = {
  init, login, logout, getUserByToken,
  getSettings, updateSettings,
  getUsers, getAllUsers: getUsers, getTeachers, getUserById,
  addUser, updateUser, deleteUser, resetUserPassword,
  getAttendance, getAttendanceByUserAndDate, addAttendance, updateAttendance,
  exportAllData
};
