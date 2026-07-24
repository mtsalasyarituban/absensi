// ============================================
// AbsensiKu - Dashboard Module (API)
// ============================================

const Dashboard = {
  async render() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    if (user.role === 'admin') {
      await this.renderAdminDashboard();
    } else {
      await this.renderTeacherDashboard();
    }
  },

  async renderTeacherDashboard() {
    const user = Auth.getCurrentUser();
    const main = document.getElementById('main-content');
    const todayAttendance = await Attendance.getTodayAttendance();
    const now = new Date();
    const settings = await Storage.getSettings();
    const monthSummary = await Attendance.getMonthSummary(user.id, now.getFullYear(), now.getMonth());

    let clockState = 'ready';
    if (todayAttendance) {
      if (todayAttendance.clockOut) clockState = 'done';
      else if (todayAttendance.clockIn) clockState = 'clocked-in';
    }
    const hasReasonNoClockOut = todayAttendance && ['izin', 'sakit'].includes(todayAttendance.status);
    const isDinasToday = todayAttendance && todayAttendance.status === 'dinas';
    
    let holidays = {};
    try {
      const res = await fetch('/holidays.json');
      if (res.ok) holidays = await res.json();
    } catch (e) {}

    const localDateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const isHoliday = isWeekend || !!holidays[localDateStr];
    const holidayName = holidays[localDateStr] ? holidays[localDateStr] : 'Akhir Pekan';

    main.innerHTML = `
      <div class="dashboard-page page-enter">
        <div class="dashboard-greeting">
          <div class="greeting-text">
            <h2>${Utils.getGreeting()}, ${user.name.split(' ')[0]}! 👋</h2>
            <p class="greeting-date">${Utils.formatDate(now)} • ${settings.schoolName}</p>
          </div>
          <div class="greeting-avatar" style="background: ${Utils.getAvatarColor(user.name)}">
            ${Utils.getInitials(user.name)}
          </div>
        </div>

        <div class="clock-section">
          <div class="digital-clock" id="digital-clock"></div>
          ${hasReasonNoClockOut ? `
            <div class="today-reason-card">
              <div class="reason-icon">${todayAttendance.status === 'sakit' ? '🤒' : '📋'}</div>
              <div class="reason-info">
                <h4>Status Hari Ini: ${Utils.getStatusLabel(todayAttendance.status)}</h4>
                <p>${todayAttendance.reasonDetail || '-'}</p>
                <span class="reason-time">Dicatat: ${Utils.formatTime(todayAttendance.clockIn)}</span>
              </div>
            </div>
          ` : isDinasToday ? `
            <div class="today-reason-card">
              <div class="reason-icon">🚗</div>
              <div class="reason-info">
                <h4>Status Hari Ini: ${Utils.getStatusLabel(todayAttendance.status)}</h4>
                <p>${todayAttendance.reasonDetail || '-'}</p>
                <span class="reason-time">Dicatat: ${Utils.formatTime(todayAttendance.clockIn)}</span>
              </div>
            </div>
            ${!todayAttendance.clockOut ? `
              <div class="clock-buttons" style="margin-top: 16px;">
                <button class="btn-clock btn-clock-out" id="clock-out-btn" onclick="Attendance.clockOut()">
                  <div class="btn-clock-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></div>
                  <span class="btn-clock-label">PULANG</span>
                  <span class="btn-clock-sub">Tap untuk absen pulang</span>
                </button>
              </div>
            ` : `
              <div class="done-summary" style="margin-top: 16px;">
                <div class="done-item"><span class="done-label">Pulang</span><span class="done-value">${Utils.formatTime(todayAttendance.clockOut)}</span></div>
              </div>
            `}
          ` : isHoliday ? `
            <div class="today-reason-card">
              <div class="reason-icon">🏖️</div>
              <div class="reason-info">
                <h4>Status Hari Ini: Libur</h4>
                <p>Hari ini adalah hari libur (${holidayName}). Tidak ada jadwal absensi hari ini.</p>
              </div>
            </div>
          ` : `
            <div class="clock-buttons">
              ${clockState === 'ready' ? `
                <button class="btn-clock btn-clock-in" id="clock-in-btn" onclick="Attendance.clockIn()">
                  <div class="btn-clock-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg></div>
                  <span class="btn-clock-label">MASUK</span>
                  <span class="btn-clock-sub">Tap untuk absen masuk</span>
                </button>
              ` : clockState === 'clocked-in' ? `
                <div class="clock-in-info">
                  <div class="check-icon">✅</div>
                  <div><p class="info-label">Masuk</p><p class="info-time">${Utils.formatTime(todayAttendance.clockIn)}</p><p class="info-status">${Utils.getStatusBadge(todayAttendance.status)}</p></div>
                </div>
                <button class="btn-clock btn-clock-out" id="clock-out-btn" onclick="Attendance.clockOut()">
                  <div class="btn-clock-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></div>
                  <span class="btn-clock-label">PULANG</span>
                  <span class="btn-clock-sub">Tap untuk absen pulang</span>
                </button>
              ` : `
                <div class="clock-done">
                  <div class="done-icon">🎉</div>
                  <h3>Absensi Hari Ini Selesai!</h3>
                  <div class="done-summary">
                    <div class="done-item"><span class="done-label">Masuk</span><span class="done-value">${Utils.formatTime(todayAttendance.clockIn)}</span></div>
                    <div class="done-divider">→</div>
                    <div class="done-item"><span class="done-label">Pulang</span><span class="done-value">${Utils.formatTime(todayAttendance.clockOut)}</span></div>
                    <div class="done-divider">⏱</div>
                    <div class="done-item"><span class="done-label">Durasi</span><span class="done-value">${Utils.calculateDuration(todayAttendance.clockIn, todayAttendance.clockOut)}</span></div>
                  </div>
                  <p class="done-status">${Utils.getStatusBadge(todayAttendance.status)}</p>
                </div>
              `}
            </div>
          `}
        </div>

        <div class="stats-section">
          <h3 class="section-title">📊 Rekap Bulan ${Utils.getMonthName(now.getMonth())}</h3>
          <div class="stats-grid">
            <div class="stat-card stat-hadir"><div class="stat-value">${monthSummary.hadir}</div><div class="stat-label">Hadir</div><div class="stat-icon">✅</div></div>
            <div class="stat-card stat-terlambat"><div class="stat-value">${monthSummary.terlambat}</div><div class="stat-label">Terlambat</div><div class="stat-icon">⏰</div></div>
            <div class="stat-card stat-izin"><div class="stat-value">${monthSummary.izin + monthSummary.sakit}</div><div class="stat-label">Izin/Sakit</div><div class="stat-icon">📋</div></div>
            <div class="stat-card stat-dinas"><div class="stat-value">${monthSummary.dinas}</div><div class="stat-label">Dinas</div><div class="stat-icon">🚗</div></div>
            <div class="stat-card stat-alpha"><div class="stat-value">${monthSummary.alpha}</div><div class="stat-label">Alpha</div><div class="stat-icon">❌</div></div>
            <div class="stat-card stat-percent"><div class="stat-value">${monthSummary.percentage}%</div><div class="stat-label">Kehadiran</div><div class="stat-icon">📈</div></div>
          </div>
        </div>

        <div class="history-section">
          <h3 class="section-title">📅 Riwayat 7 Hari Terakhir</h3>
          <div class="history-list">${await this.renderRecentHistory(user.id)}</div>
        </div>
      </div>
    `;

    this.updateDigitalClock();
    this.clockInterval = setInterval(() => this.updateDigitalClock(), 1000);
  },

  async renderRecentHistory(userId) {
    const records = [];
    const launchDate = new Date(APP_LAUNCH_DATE + 'T00:00:00');
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      if (date < launchDate) continue;
      const dateStr = Utils.getLocalDateStr(date);
      if (Utils.isWeekend(dateStr)) continue;
      const record = await Storage.getAttendanceByUserAndDate(userId, dateStr);
      const normalized = record ? {
        clockIn: record.clock_in || record.clockIn,
        clockOut: record.clock_out || record.clockOut,
        status: record.status,
        reasonDetail: record.reason_detail || record.reasonDetail
      } : null;
      records.push({ date: dateStr, record: normalized });
    }

    if (records.length === 0) return '<div class="empty-state">Belum ada riwayat absensi</div>';

    return records.map(({ date, record }) => `
      <div class="history-item">
        <div class="history-date">
          <span class="history-day">${Utils.getDayName(date)}</span>
          <span class="history-datenum">${Utils.formatDate(date, 'dayMonth')}</span>
        </div>
        <div class="history-detail">
          ${record ? `
            <span class="history-time">${Utils.formatTimeShort(record.clockIn)} ${record.clockOut ? '- ' + Utils.formatTimeShort(record.clockOut) : ''}</span>
            ${record.reasonDetail ? `<span class="history-reason">${record.reasonDetail}</span>` : ''}
          ` : '<span class="history-time">Tidak ada data</span>'}
        </div>
        <div class="history-status">${record ? Utils.getStatusBadge(record.status) : Utils.getStatusBadge('alpha')}</div>
      </div>
    `).join('');
  },

  async renderAdminDashboard() {
    const main = document.getElementById('main-content');
    const now = new Date();
    const today = Utils.getToday();
    const teachers = await Storage.getTeachers();
    const todayRecords = await Storage.getAttendanceByDate(today);
    const settings = await Storage.getSettings();

    const normalizedRecords = todayRecords.map(r => ({
      userId: r.user_id || r.userId,
      status: r.status,
      clockIn: r.clock_in || r.clockIn,
      clockOut: r.clock_out || r.clockOut
    }));

    const stats = {
      total: teachers.length,
      hadir: normalizedRecords.filter(r => r.status === 'hadir').length,
      terlambat: normalizedRecords.filter(r => r.status === 'terlambat').length,
      izin: normalizedRecords.filter(r => ['izin', 'sakit'].includes(r.status)).length,
      dinas: normalizedRecords.filter(r => r.status === 'dinas').length,
      belum: 0
    };
    stats.belum = Math.max(0, stats.total - stats.hadir - stats.terlambat - stats.izin - stats.dinas);

    const pctHadir = stats.total > 0 ? Math.round(((stats.hadir + stats.terlambat) / stats.total) * 100) : 0;

    main.innerHTML = `
      <div class="dashboard-page page-enter">
        <div class="dashboard-greeting">
          <div class="greeting-text">
            <h2>${Utils.getGreeting()}, Admin! 🏫</h2>
            <p class="greeting-date">${Utils.formatDate(now)} • ${settings.schoolName}</p>
          </div>
          <div class="digital-clock" id="digital-clock"></div>
        </div>

        <div class="stats-section">
          <h3 class="section-title">📊 Status Hari Ini</h3>
          <div class="stats-grid">
            <div class="stat-card stat-total"><div class="stat-value">${stats.total}</div><div class="stat-label">Total Guru</div><div class="stat-icon">👥</div></div>
            <div class="stat-card stat-hadir"><div class="stat-value">${stats.hadir}</div><div class="stat-label">Hadir</div><div class="stat-icon">✅</div></div>
            <div class="stat-card stat-terlambat"><div class="stat-value">${stats.terlambat}</div><div class="stat-label">Terlambat</div><div class="stat-icon">⏰</div></div>
            <div class="stat-card stat-izin"><div class="stat-value">${stats.izin}</div><div class="stat-label">Izin/Sakit</div><div class="stat-icon">📋</div></div>
            <div class="stat-card stat-dinas"><div class="stat-value">${stats.dinas}</div><div class="stat-label">Dinas</div><div class="stat-icon">🚗</div></div>
            <div class="stat-card stat-belum"><div class="stat-value">${stats.belum}</div><div class="stat-label">Belum Absen</div><div class="stat-icon">⏳</div></div>
          </div>
        </div>

        <div class="progress-section">
          <div class="progress-header"><span>Kehadiran Hari Ini</span><span>${pctHadir}%</span></div>
          <div class="progress-bar">
            <div class="progress-fill progress-hadir" style="width: ${stats.total > 0 ? (stats.hadir / stats.total) * 100 : 0}%"></div>
            <div class="progress-fill progress-terlambat" style="width: ${stats.total > 0 ? (stats.terlambat / stats.total) * 100 : 0}%"></div>
            <div class="progress-fill progress-izin" style="width: ${stats.total > 0 ? (stats.izin / stats.total) * 100 : 0}%"></div>
            <div class="progress-fill progress-dinas" style="width: ${stats.total > 0 ? (stats.dinas / stats.total) * 100 : 0}%"></div>
          </div>
          <div class="progress-legend">
            <span class="legend-item"><span class="legend-dot dot-hadir"></span> Hadir</span>
            <span class="legend-item"><span class="legend-dot dot-terlambat"></span> Terlambat</span>
            <span class="legend-item"><span class="legend-dot dot-izin"></span> Izin/Sakit</span>
            <span class="legend-item"><span class="legend-dot dot-dinas"></span> Dinas</span>
          </div>
        </div>

        <div class="teacher-list-section">
          <h3 class="section-title">👩‍🏫 Status Guru Hari Ini</h3>
          <div class="teacher-list">
            ${teachers.map(teacher => {
              const record = normalizedRecords.find(r => r.userId === teacher.id);
              const status = record ? record.status : 'belum';
              return `
                <div class="teacher-item">
                  <div class="teacher-avatar" style="background: ${Utils.getAvatarColor(teacher.name)}">${Utils.getInitials(teacher.name)}</div>
                  <div class="teacher-info"><span class="teacher-name">${teacher.name}</span><span class="teacher-mapel">${teacher.mapel}</span></div>
                  <div class="teacher-time">
                    ${record ? `<span class="time-in">${Utils.formatTimeShort(record.clockIn)}</span>${record.clockOut ? `<span class="time-out">${Utils.formatTimeShort(record.clockOut)}</span>` : ''}` : '<span class="no-data">-</span>'}
                  </div>
                  <div class="teacher-status">${Utils.getStatusBadge(status)}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    this.updateDigitalClock();
    this.clockInterval = setInterval(() => this.updateDigitalClock(), 1000);
  },

  updateDigitalClock() {
    const el = document.getElementById('digital-clock');
    if (el) {
      el.textContent = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    }
  },

  destroy() {
    if (this.clockInterval) clearInterval(this.clockInterval);
  }
};
