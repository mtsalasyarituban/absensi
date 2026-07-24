// ============================================
// AbsensiKu - Admin Module (API)
// ============================================

const Admin = {
  async render() {
    if (!Auth.isAdmin()) {
      Utils.showNotification('Akses ditolak', 'error');
      App.navigate('dashboard');
      return;
    }

    const main = document.getElementById('main-content');
    const teachers = await Storage.getTeachers();

    main.innerHTML = `
      <div class="admin-page page-enter">
        <div class="page-header">
          <h2>⚙️ Panel Admin</h2>
          <p class="page-subtitle">Kelola guru, lokasi, dan pengaturan sistem</p>
        </div>

        <div class="admin-tabs">
          <button class="tab-btn active" onclick="Admin.switchTab('teachers', this)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Kelola Guru
          </button>
          <button class="tab-btn" onclick="Admin.switchTab('settings', this)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Pengaturan
          </button>
        </div>

        <div id="admin-tab-content">
          ${this.renderTeachersTab(teachers)}
        </div>
      </div>
    `;
  },

  async switchTab(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const content = document.getElementById('admin-tab-content');
    content.innerHTML = '<div style="text-align:center;padding:40px;"><span class="spinner"></span></div>';

    if (tab === 'teachers') {
      const teachers = await Storage.getTeachers();
      content.innerHTML = this.renderTeachersTab(teachers);
    } else {
      const settings = await Storage.getSettings();
      content.innerHTML = this.renderSettingsTab(settings);
      this.bindSettingsForm();
    }
  },

  renderTeachersTab(teachers) {
    return `
      <div class="admin-section">
        <div class="section-header">
          <h3>Daftar Guru (${teachers.length})</h3>
          <button class="btn btn-primary btn-icon" onclick="Admin.showTeacherModal()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Guru
          </button>
        </div>

        <div class="table-responsive">
          <table class="recap-table teacher-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama</th>
                <th>Username</th>
                <th>NIP</th>
                <th>Mata Pelajaran</th>
                <th class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${teachers.length === 0 ? `
                <tr><td colspan="6" class="text-center empty-row">Belum ada data guru</td></tr>
              ` : teachers.map((t, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>
                    <div class="table-user">
                      <div class="table-avatar" style="background: ${Utils.getAvatarColor(t.name)}">${Utils.getInitials(t.name)}</div>
                      <span>${t.name}</span>
                    </div>
                  </td>
                  <td><code>${t.username}</code></td>
                  <td>${t.nip}</td>
                  <td>${t.mapel}</td>
                  <td class="text-center">
                    <div class="action-btns">
                      <button class="btn-action btn-edit" onclick="Admin.showTeacherModal('${t.id}')" title="Edit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button class="btn-action btn-delete" onclick="Admin.deleteTeacher('${t.id}')" title="Hapus">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async showTeacherModal(teacherId = null) {
    const teacher = teacherId ? await Storage.getUserById(teacherId) : null;
    const isEdit = !!teacher;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'teacher-modal-overlay';

    overlay.innerHTML = `
      <div class="modal teacher-modal">
        <div class="modal-header">
          <h3>${isEdit ? '✏️ Edit Guru' : '➕ Tambah Guru Baru'}</h3>
          <button class="modal-close" onclick="document.getElementById('teacher-modal-overlay').remove()">✕</button>
        </div>
        <div class="modal-body">
          <form id="teacher-form">
            <div class="form-row">
              <div class="form-group">
                <label for="teacher-name">Nama Lengkap <span class="required">*</span></label>
                <input type="text" id="teacher-name" value="${isEdit ? teacher.name : ''}" required placeholder="Nama lengkap guru">
              </div>
              <div class="form-group">
                <label for="teacher-nip">NIP <span class="required">*</span></label>
                <input type="text" id="teacher-nip" value="${isEdit ? teacher.nip : ''}" required placeholder="Nomor Induk Pegawai">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="teacher-username">Username <span class="required">*</span></label>
                <input type="text" id="teacher-username" value="${isEdit ? teacher.username : ''}" required placeholder="Username untuk login" ${isEdit ? 'readonly' : ''}>
              </div>
              <div class="form-group">
                <label for="teacher-password">${isEdit ? 'Password (kosongkan jika tidak diubah)' : 'Password <span class="required">*</span>'}</label>
                <input type="password" id="teacher-password" ${isEdit ? '' : 'required'} placeholder="Password untuk login">
              </div>
            </div>

            <div class="form-group">
              <label for="teacher-mapel">Mata Pelajaran <span class="required">*</span></label>
              <input type="text" id="teacher-mapel" value="${isEdit ? teacher.mapel : ''}" required placeholder="Mata pelajaran yang diampu">
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('teacher-modal-overlay').remove()">Batal</button>
              <button type="submit" class="btn btn-primary">${isEdit ? 'Simpan Perubahan' : 'Tambah Guru'}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal-overlay-show'));

    document.getElementById('teacher-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('teacher-name').value.trim();
      const nip = document.getElementById('teacher-nip').value.trim();
      const username = document.getElementById('teacher-username').value.trim();
      const password = document.getElementById('teacher-password').value;
      const mapel = document.getElementById('teacher-mapel').value.trim();

      if (isEdit) {
        const updates = { name, nip, mapel };
        if (password) updates.password = password;
        await Storage.updateUser(teacherId, updates);
        Utils.showNotification('Data guru berhasil diperbarui', 'success');
      } else {
        const res = await Storage.addUser({ name, username, password, nip, mapel });
        if (res && res.error) {
          Utils.showNotification(res.error, 'error');
          return;
        }
        Utils.showNotification('Guru baru berhasil ditambahkan', 'success');
      }

      overlay.remove();
      Admin.render();
    });
  },

  async deleteTeacher(id) {
    const teacher = await Storage.getUserById(id);
    if (!teacher) return;

    const confirmed = await Utils.showConfirm(`Apakah Anda yakin ingin menghapus guru "${teacher.name}"? All data absensinya akan dihapus.`);
    if (confirmed) {
      await Storage.deleteUser(id);
      Utils.showNotification('Guru berhasil dihapus', 'success');
      Admin.render();
    }
  },

  renderSettingsTab(settings) {
    return `
      <div class="admin-section">
        <form id="settings-form">
          <div class="settings-group">
            <h3 class="settings-group-title">🏫 Informasi Sekolah</h3>
            <div class="form-group">
              <label for="setting-school-name">Nama Sekolah</label>
              <input type="text" id="setting-school-name" value="${settings.schoolName || ''}" required>
            </div>
          </div>

          <div class="settings-group">
            <h3 class="settings-group-title">📍 Lokasi Geofencing</h3>
            <p class="settings-desc">Tentukan koordinat sekolah dan radius area yang diperbolehkan untuk absensi.</p>

            <div class="form-row">
              <div class="form-group">
                <label for="setting-lat">Latitude</label>
                <input type="number" step="any" id="setting-lat" value="${settings.schoolLat || ''}" required>
              </div>
              <div class="form-group">
                <label for="setting-lng">Longitude</label>
                <input type="number" step="any" id="setting-lng" value="${settings.schoolLng || ''}" required>
              </div>
              <div class="form-group">
                <label for="setting-radius">Radius (meter)</label>
                <input type="number" id="setting-radius" value="${settings.radius || 100}" min="10" max="1000" required>
              </div>
            </div>

            <button type="button" class="btn btn-secondary btn-icon" onclick="Admin.detectLocation()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/>
                <line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/>
              </svg>
              Deteksi Lokasi Saat Ini
            </button>
          </div>

          <div class="settings-group">
            <h3 class="settings-group-title">⏰ Jam Kerja</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="setting-start">Jam Masuk</label>
                <input type="time" id="setting-start" value="${settings.workStartTime || '07:00'}" required>
              </div>
              <div class="form-group">
                <label for="setting-late">Toleransi Terlambat (menit)</label>
                <input type="number" id="setting-late" value="${settings.lateThreshold || 15}" min="0" max="60" required>
              </div>
              <div class="form-group">
                <label for="setting-end">Jam Pulang</label>
                <input type="time" id="setting-end" value="${settings.workEndTime || '15:00'}" required>
              </div>
            </div>
            <div class="form-group" style="margin-top: 16px;">
              <label>Hari Libur Mingguan</label>
              <div class="checkbox-group" style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px;">
                ${[
                  { val: '1', label: 'Senin' },
                  { val: '2', label: 'Selasa' },
                  { val: '3', label: 'Rabu' },
                  { val: '4', label: 'Kamis' },
                  { val: '5', label: 'Jumat' },
                  { val: '6', label: 'Sabtu' },
                  { val: '0', label: 'Minggu' }
                ].map(d => {
                  const offDaysArr = (settings.offDays || '0,6').split(',').map(n => n.trim());
                  const checked = offDaysArr.includes(d.val) ? 'checked' : '';
                  return `<label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 0.85rem;">
                            <input type="checkbox" class="setting-offday" value="${d.val}" ${checked}> ${d.label}
                          </label>`;
                }).join('')}
              </div>
            </div>
          </div>

          <div class="settings-group">
            <h3 class="settings-group-title">💾 Backup & Restore Data</h3>
            <div class="settings-actions">
              <button type="button" class="btn btn-secondary" onclick="Admin.exportAllData()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export Backup Data
              </button>
            </div>
          </div>

          <div class="settings-save">
            <button type="submit" class="btn btn-primary btn-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              Simpan Pengaturan
            </button>
          </div>
        </form>
      </div>
    `;
  },

  async detectLocation() {
    try {
      Utils.showNotification('Mendeteksi lokasi...', 'info');
      const location = await Attendance.getLocation();
      document.getElementById('setting-lat').value = location.lat.toFixed(6);
      document.getElementById('setting-lng').value = location.lng.toFixed(6);
      Utils.showNotification(`Lokasi terdeteksi! Akurasi: ${Math.round(location.accuracy)}m`, 'success');
    } catch (error) {
      Utils.showNotification(error.message, 'error');
    }
  },

  async saveSettings() {
    const settings = {
      schoolName: document.getElementById('setting-school-name').value.trim(),
      schoolLat: parseFloat(document.getElementById('setting-lat').value),
      schoolLng: parseFloat(document.getElementById('setting-lng').value),
      radius: parseInt(document.getElementById('setting-radius').value),
      workStartTime: document.getElementById('setting-start').value,
      lateThreshold: parseInt(document.getElementById('setting-late').value),
      workEndTime: document.getElementById('setting-end').value,
      offDays: Array.from(document.querySelectorAll('.setting-offday:checked')).map(cb => cb.value).join(',')
    };

    await Storage.updateSettings(settings);
    window.appSettings = { ...window.appSettings, ...settings };
    Utils.showNotification('Pengaturan berhasil disimpan!', 'success');
  },

  bindSettingsForm() {
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        Admin.saveSettings();
      });
    }
  },

  async exportAllData() {
    const data = await Storage.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `absensi_backup_${Utils.getToday()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    Utils.showNotification('Backup data berhasil di-download!', 'success');
  }
};
