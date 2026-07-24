// ============================================
// AbsensiKu - Express Server + REST API (Vercel & Local)
// ============================================

try { require('dotenv').config(); } catch(e) {}
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');
const DB = require('./db');

// Load holidays
let holidays = {};
try {
  holidays = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'holidays.json'), 'utf8'));
} catch(e) {}

// Initialize database
DB.init();

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = 3443;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware
async function authRequired(req, res, next) {
  try {
    const token = req.cookies.token || req.headers['x-auth-token'];
    const user = await DB.getUserByToken(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
    next();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

function adminRequired(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

// ============ AUTH ROUTES ============

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username dan password diperlukan' });

    const result = await DB.login(username, password);
    if (!result || !result.success) return res.status(401).json({ error: result?.message || 'Gagal terhubung ke Database' });

    res.cookie('token', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({ success: true, user: result.user });
  } catch (e) {
    res.status(500).json({ error: 'Server Error: ' + e.message });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  const token = req.cookies.token;
  if (token) await DB.logout(token);
  res.clearCookie('token');
  res.json({ success: true });
});

app.get('/api/auth/me', authRequired, (req, res) => {
  res.json(req.user);
});

// ============ USER ROUTES ============

app.get('/api/users', authRequired, async (req, res) => {
  if (req.user.role === 'admin') {
    res.json(await DB.getUsers());
  } else {
    res.json([req.user]);
  }
});

app.get('/api/users/teachers', authRequired, async (req, res) => {
  res.json(await DB.getTeachers());
});

app.get('/api/users/:id', authRequired, async (req, res) => {
  const user = await DB.getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

app.post('/api/users', authRequired, adminRequired, async (req, res) => {
  const { name, username, password, nip, mapel } = req.body;
  if (!name || !username || !password) return res.status(400).json({ error: 'Data tidak lengkap' });

  const result = await DB.addUser({ name, username, password, nip, mapel, role: 'guru' });
  if (!result.success) return res.status(400).json({ error: result.message });
  res.json(result);
});

app.put('/api/users/:id', authRequired, adminRequired, async (req, res) => {
  const result = await DB.updateUser(req.params.id, req.body);
  res.json(result);
});

app.delete('/api/users/:id', authRequired, adminRequired, async (req, res) => {
  const result = await DB.deleteUser(req.params.id);
  res.json(result);
});

// ============ ATTENDANCE ROUTES ============

app.get('/api/attendance', authRequired, async (req, res) => {
  const filters = {};
  if (req.query.userId) filters.userId = req.query.userId;
  if (req.query.date) filters.date = req.query.date;
  if (req.query.year) filters.year = parseInt(req.query.year);
  if (req.query.month !== undefined) filters.month = parseInt(req.query.month);

  if (req.user.role !== 'admin' && !filters.userId) {
    filters.userId = req.user.id;
  }

  res.json(await DB.getAttendance(filters));
});

app.get('/api/attendance/today', authRequired, async (req, res) => {
  const userId = req.query.userId || req.user.id;
  const today = new Date().toISOString().split('T')[0];
  const record = await DB.getAttendanceByUserAndDate(userId, today);
  res.json(record);
});

app.post('/api/attendance/clock-in', authRequired, async (req, res) => {
  const userId = req.user.id;
  // Gunakan timezone Jakarta untuk pengecekan hari
  const dateObj = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  if (dateObj.getDay() === 0 || dateObj.getDay() === 6) {
    return res.status(400).json({ error: 'Hari ini adalah hari libur (Akhir Pekan), tidak bisa melakukan absen' });
  }
  const localDateStr = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
  if (holidays[localDateStr]) {
    return res.status(400).json({ error: 'Hari ini adalah hari libur nasional (' + holidays[localDateStr] + ')' });
  }
  // Tetap gunakan format ISO untuk query DB agar kompatibel dengan data lama
  const today = new Date().toISOString().split('T')[0];

  const existing = await DB.getAttendanceByUserAndDate(userId, today);
  if (existing && existing.clock_in) {
    return res.status(400).json({ error: 'Sudah melakukan absen masuk hari ini' });
  }

  const record = {
    userId,
    date: today,
    clockIn: req.body.clockIn || new Date().toISOString(),
    clockOut: null,
    status: req.body.status || 'hadir',
    reason: req.body.reason || '',
    reasonDetail: req.body.reasonDetail || '',
    isInRadius: req.body.isInRadius !== undefined ? req.body.isInRadius : true,
    locationIn: req.body.locationIn || null,
    locationOut: null
  };

  if (existing) {
    await DB.updateAttendance(existing.id, record);
    res.json({ success: true, id: existing.id });
  } else {
    const result = await DB.addAttendance(record);
    res.json(result);
  }
});

app.post('/api/attendance/clock-out', authRequired, async (req, res) => {
  const userId = req.user.id;
  // Gunakan timezone Jakarta untuk pengecekan hari
  const dateObj = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  if (dateObj.getDay() === 0 || dateObj.getDay() === 6) {
    return res.status(400).json({ error: 'Hari ini adalah hari libur (Akhir Pekan), tidak bisa melakukan absen' });
  }
  const localDateStr = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
  if (holidays[localDateStr]) {
    return res.status(400).json({ error: 'Hari ini adalah hari libur nasional (' + holidays[localDateStr] + ')' });
  }
  const today = new Date().toISOString().split('T')[0];

  const existing = await DB.getAttendanceByUserAndDate(userId, today);
  if (!existing || !existing.clock_in) {
    return res.status(400).json({ error: 'Belum melakukan absen masuk hari ini' });
  }
  if (existing.clock_out) {
    return res.status(400).json({ error: 'Sudah melakukan absen pulang hari ini' });
  }

  await DB.updateAttendance(existing.id, {
    clockOut: req.body.clockOut || new Date().toISOString(),
    locationOut: req.body.locationOut || null,
    clockOutReason: req.body.clockOutReason || '',
    clockOutReasonDetail: req.body.clockOutReasonDetail || '',
  });

  res.json({ success: true });
});

// ============ SETTINGS ROUTES ============

app.get('/api/settings', authRequired, async (req, res) => {
  res.json(await DB.getSettings());
});

app.put('/api/settings', authRequired, adminRequired, async (req, res) => {
  const result = await DB.updateSettings(req.body);
  res.json(result);
});

// ============ EXPORT ROUTE ============

app.get('/api/export', authRequired, adminRequired, async (req, res) => {
  res.json(await DB.exportAllData());
});

// ============ FALLBACK ============
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// For Vercel serverless export
module.exports = app;

// Local standalone server execution
if (process.env.VERCEL !== '1') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 HTTP  → http://localhost:${PORT}`);
  });

  try {
    const certDir = __dirname;
    const keyPath = path.join(certDir, 'key.pem');
    const certPath = path.join(certDir, 'cert.pem');

    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=AbsensiKu" -addext "subjectAltName=IP:0.0.0.0,IP:127.0.0.1,IP:192.168.1.9"`, { stdio: 'pipe' });
    }

    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };

    https.createServer(httpsOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
      console.log(`🔒 HTTPS → https://localhost:${HTTPS_PORT}`);
    });
  } catch (e) {}
}
