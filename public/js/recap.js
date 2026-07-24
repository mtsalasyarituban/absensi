// ============================================
// AbsensiKu - Monthly Recap Module (API)
// ============================================

const Recap = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(),
  selectedUserId: null,

  async render() {
    const user = Auth.getCurrentUser();
    const isAdmin = user.role === 'admin';
    const main = document.getElementById('main-content');

    if (!isAdmin) this.selectedUserId = user.id;

    const teachers = isAdmin ? await Storage.getTeachers() : [user];
    const selectedUser = this.selectedUserId ? await Storage.getUserById(this.selectedUserId) : (isAdmin ? null : user);

    main.innerHTML = `
      <div class="recap-page page-enter">
        <div class="page-header">
          <h2>📊 Rekap Absensi Bulanan</h2>
          <p class="page-subtitle">Lihat data kehadiran bulanan secara detail</p>
        </div>

        <div class="recap-filters">
          ${isAdmin ? `
            <div class="filter-group">
              <label for="recap-teacher">Guru</label>
              <select id="recap-teacher" onchange="Recap.onTeacherChange(this.value)">
                <option value="">-- Semua Guru --</option>
                ${teachers.map(t => `<option value="${t.id}" ${this.selectedUserId === t.id ? 'selected' : ''}>${t.name} (${t.mapel})</option>`).join('')}
              </select>
            </div>
          ` : ''}

          <div class="filter-group">
            <label for="recap-month">Bulan</label>
            <select id="recap-month" onchange="Recap.onMonthChange(this.value)">
              ${Array.from({ length: 12 }, (_, i) => `<option value="${i}" ${this.currentMonth === i ? 'selected' : ''}>${Utils.getMonthName(i)}</option>`).join('')}
            </select>
          </div>

          <div class="filter-group">
            <label for="recap-year">Tahun</label>
            <select id="recap-year" onchange="Recap.onYearChange(this.value)">
              ${Array.from({ length: 5 }, (_, i) => {
                const y = new Date().getFullYear() - i;
                return `<option value="${y}" ${this.currentYear === y ? 'selected' : ''}>${y}</option>`;
              }).join('')}
            </select>
          </div>

          <button class="btn btn-secondary btn-icon" onclick="Recap.exportData()" title="Export CSV">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>

        <div id="recap-content">
          <div style="text-align:center;padding:40px;"><span class="spinner"></span></div>
        </div>
      </div>
    `;

    // Load content
    const content = document.getElementById('recap-content');
    if (isAdmin && !this.selectedUserId) {
      content.innerHTML = await this.renderAllTeachersSummary();
    } else {
      content.innerHTML = await this.renderUserRecap(this.selectedUserId || user.id);
    }
  },

  async renderAllTeachersSummary() {
    const teachers = await Storage.getTeachers();
    const summaries = [];
    for (const teacher of teachers) {
      const summary = await Attendance.getMonthSummary(teacher.id, this.currentYear, this.currentMonth);
      summaries.push({ teacher, summary });
    }

    return `
      <div class="recap-summary-section">
        <h3 class="section-title">Ringkasan ${Utils.getMonthName(this.currentMonth)} ${this.currentYear}</h3>
        <div class="table-responsive">
          <table class="recap-table summary-table">
            <thead>
              <tr>
                <th>No</th><th>Nama Guru</th><th>Mapel</th>
                <th class="text-center">Hadir</th><th class="text-center">Terlambat</th>
                <th class="text-center">Izin</th><th class="text-center">Sakit</th>
                <th class="text-center">Dinas</th><th class="text-center">Alpha</th>
                <th class="text-center">% Hadir</th>
              </tr>
            </thead>
            <tbody>
              ${summaries.map(({ teacher, summary }, index) => `
                <tr class="clickable-row" onclick="Recap.selectTeacher('${teacher.id}')">
                  <td>${index + 1}</td>
                  <td><div class="table-user"><div class="table-avatar" style="background: ${Utils.getAvatarColor(teacher.name)}">${Utils.getInitials(teacher.name)}</div><span>${teacher.name}</span></div></td>
                  <td>${teacher.mapel}</td>
                  <td class="text-center"><span class="cell-badge cell-hadir">${summary.hadir}</span></td>
                  <td class="text-center"><span class="cell-badge cell-terlambat">${summary.terlambat}</span></td>
                  <td class="text-center"><span class="cell-badge cell-izin">${summary.izin}</span></td>
                  <td class="text-center"><span class="cell-badge cell-sakit">${summary.sakit}</span></td>
                  <td class="text-center"><span class="cell-badge cell-dinas">${summary.dinas}</span></td>
                  <td class="text-center"><span class="cell-badge cell-alpha">${summary.alpha}</span></td>
                  <td class="text-center"><div class="mini-progress"><div class="mini-progress-fill" style="width: ${summary.percentage}%"></div><span class="mini-progress-text">${summary.percentage}%</span></div></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async renderUserRecap(userId) {
    const user = await Storage.getUserById(userId);
    if (!user) return '<div class="empty-state">Guru tidak ditemukan</div>';

    const summary = await Attendance.getMonthSummary(userId, this.currentYear, this.currentMonth);
    const records = await Storage.getAttendanceByUserAndMonth(userId, this.currentYear, this.currentMonth);
    const daysInMonth = Utils.getDaysInMonth(this.currentYear, this.currentMonth);
    const isAdmin = Auth.isAdmin();

    const dailyData = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(this.currentYear, this.currentMonth, d);
      const dateStr = Utils.getLocalDateStr(date);
      const isWeekend = Utils.isWeekend(date);
      const isFuture = date > new Date();
      const record = records.find(r => r.date === dateStr);

      dailyData.push({ day: d, date: dateStr, dayName: Utils.getDayName(date), isWeekend, isFuture, record });
    }

    return `
      ${isAdmin ? `<button class="btn btn-secondary btn-back" onclick="Recap.selectedUserId = null; Recap.render();">← Kembali ke Semua Guru</button>` : ''}

      <div class="recap-user-card">
        <div class="recap-user-info">
          <div class="recap-avatar" style="background: ${Utils.getAvatarColor(user.name)}">${Utils.getInitials(user.name)}</div>
          <div><h3>${user.name}</h3><p>${user.mapel} • NIP: ${user.nip}</p></div>
        </div>
        <div class="recap-period">${Utils.getMonthName(this.currentMonth)} ${this.currentYear}</div>
      </div>

      <div class="recap-stats">
        <div class="recap-stat-item stat-hadir"><span class="recap-stat-value">${summary.hadir}</span><span class="recap-stat-label">Hadir</span></div>
        <div class="recap-stat-item stat-terlambat"><span class="recap-stat-value">${summary.terlambat}</span><span class="recap-stat-label">Terlambat</span></div>
        <div class="recap-stat-item stat-izin"><span class="recap-stat-value">${summary.izin}</span><span class="recap-stat-label">Izin</span></div>
        <div class="recap-stat-item stat-sakit"><span class="recap-stat-value">${summary.sakit}</span><span class="recap-stat-label">Sakit</span></div>
        <div class="recap-stat-item stat-dinas"><span class="recap-stat-value">${summary.dinas}</span><span class="recap-stat-label">Dinas</span></div>
        <div class="recap-stat-item stat-alpha"><span class="recap-stat-value">${summary.alpha}</span><span class="recap-stat-label">Alpha</span></div>
        <div class="recap-stat-item stat-percent"><span class="recap-stat-value">${summary.percentage}%</span><span class="recap-stat-label">Kehadiran</span></div>
      </div>

      <div class="recap-detail-section">
        <h3 class="section-title">Detail Harian</h3>
        <div class="table-responsive">
          <table class="recap-table detail-table">
            <thead><tr><th>Tgl</th><th>Hari</th><th>Jam Masuk</th><th>Jam Pulang</th><th>Durasi</th><th>Status</th><th>Keterangan</th></tr></thead>
            <tbody>
              ${dailyData.map(day => {
                if (day.isWeekend) return `<tr class="row-weekend"><td>${day.day}</td><td>${day.dayName}</td><td colspan="5" class="text-center weekend-label">Akhir Pekan</td></tr>`;
                if (day.isFuture) return `<tr class="row-future"><td>${day.day}</td><td>${day.dayName}</td><td colspan="5" class="text-center future-label">-</td></tr>`;
                const r = day.record;
                const clockIn = r ? (r.clock_in || r.clockIn) : null;
                const clockOut = r ? (r.clock_out || r.clockOut) : null;
                const reasonDetail = r ? (r.reason_detail || r.reasonDetail) : null;
                return `
                  <tr class="${r ? '' : 'row-alpha'}">
                    <td>${day.day}</td><td>${day.dayName}</td>
                    <td>${clockIn ? Utils.formatTimeShort(clockIn) : '-'}</td>
                    <td>${clockOut ? Utils.formatTimeShort(clockOut) : '-'}</td>
                    <td>${clockIn && clockOut ? Utils.calculateDuration(clockIn, clockOut) : '-'}</td>
                    <td>${r ? Utils.getStatusBadge(r.status) : Utils.getStatusBadge('alpha')}</td>
                    <td class="reason-cell">${reasonDetail || '-'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async onTeacherChange(userId) {
    this.selectedUserId = userId || null;
    const content = document.getElementById('recap-content');
    if (content) {
      content.innerHTML = '<div style="text-align:center;padding:40px;"><span class="spinner"></span></div>';
      content.innerHTML = this.selectedUserId ? await this.renderUserRecap(this.selectedUserId) : await this.renderAllTeachersSummary();
    }
  },

  onMonthChange(month) { this.currentMonth = parseInt(month); this.render(); },
  onYearChange(year) { this.currentYear = parseInt(year); this.render(); },

  async selectTeacher(userId) {
    this.selectedUserId = userId;
    const teacherSelect = document.getElementById('recap-teacher');
    if (teacherSelect) teacherSelect.value = userId;
    const content = document.getElementById('recap-content');
    if (content) {
      content.innerHTML = '<div style="text-align:center;padding:40px;"><span class="spinner"></span></div>';
      content.innerHTML = await this.renderUserRecap(userId);
    }
  },

  async exportData() {
    const teachers = this.selectedUserId ? [await Storage.getUserById(this.selectedUserId)] : await Storage.getTeachers();
    const data = [];

    for (const teacher of teachers) {
      const records = await Storage.getAttendanceByUserAndMonth(teacher.id, this.currentYear, this.currentMonth);
      const daysInMonth = Utils.getDaysInMonth(this.currentYear, this.currentMonth);

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(this.currentYear, this.currentMonth, d);
        const dateStr = Utils.getLocalDateStr(date);
        if (Utils.isWeekend(date)) continue;
        if (date > new Date()) continue;

        const record = records.find(r => r.date === dateStr);
        const clockIn = record ? (record.clock_in || record.clockIn) : null;
        const clockOut = record ? (record.clock_out || record.clockOut) : null;

        data.push({
          'Nama': teacher.name,
          'NIP': teacher.nip,
          'Mata Pelajaran': teacher.mapel,
          'Tanggal': dateStr,
          'Hari': Utils.getDayName(date),
          'Jam Masuk': clockIn ? Utils.formatTimeShort(clockIn) : '-',
          'Jam Pulang': clockOut ? Utils.formatTimeShort(clockOut) : '-',
          'Durasi': clockIn && clockOut ? Utils.calculateDuration(clockIn, clockOut) : '-',
          'Status': record ? Utils.getStatusLabel(record.status) : 'Alpha',
          'Keterangan': record ? (record.reason_detail || record.reasonDetail || '-') : '-',
          'Di Lokasi': record ? (record.is_in_radius || record.isInRadius ? 'Ya' : 'Tidak') : '-'
        });
      }
    }

    const filename = `rekap_absensi_${Utils.getMonthName(this.currentMonth)}_${this.currentYear}`;
    Utils.exportCSV(data, filename);
  }
};
