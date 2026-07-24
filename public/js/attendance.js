// ============================================
// AbsensiKu - Attendance Module (API + Geolocation)
// ============================================

const APP_LAUNCH_DATE = '2026-07-23';

const Attendance = {
  currentLocation: null,

  // Get current GPS location
  getLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation tidak didukung browser ini'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          this.currentLocation = loc;
          resolve(loc);
        },
        (error) => {
          let message = 'Gagal mendapatkan lokasi';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Akses lokasi ditolak. Silakan aktifkan GPS dan izinkan akses lokasi.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Informasi lokasi tidak tersedia.';
              break;
            case error.TIMEOUT:
              message = 'Waktu permintaan lokasi habis. Coba lagi.';
              break;
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });
  },

  // Check if location is within school radius
  async isWithinRadius(location) {
    const settings = await Storage.getSettings();
    const distance = Utils.haversineDistance(
      location.lat, location.lng,
      settings.schoolLat, settings.schoolLng
    );
    return {
      isInside: distance <= settings.radius,
      distance: Math.round(distance),
      radius: settings.radius
    };
  },

  // Re-render the current page after attendance action
  refreshCurrentPage() {
    if (App.currentPage === 'absensi') {
      App.renderAbsensiPage();
    } else {
      Dashboard.render();
    }
  },

  // Determine attendance status based on clock-in time
  async getClockInStatus(clockInTime) {
    const settings = await Storage.getSettings();
    const [startHour, startMin] = settings.workStartTime.split(':').map(Number);

    const clockIn = new Date(clockInTime);
    const startTime = new Date(clockIn);
    startTime.setHours(startHour, startMin, 0, 0);

    const diffMinutes = (clockIn - startTime) / (1000 * 60);

    if (diffMinutes <= settings.lateThreshold) {
      return 'hadir';
    } else {
      return 'terlambat';
    }
  },

  // Process Clock In
  async clockIn() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    // Show loading state
    const btn = document.getElementById('clock-in-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Memeriksa lokasi...';
    }

    try {
      const location = await this.getLocation();
      const radiusCheck = await this.isWithinRadius(location);
      const now = new Date();

      if (radiusCheck.isInside) {
        // Within radius - auto clock in
        const status = await this.getClockInStatus(now);

        const res = await fetch('/api/attendance/clock-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            clockIn: now.toISOString(),
            status: status,
            reason: '',
            reasonDetail: '',
            isInRadius: true,
            locationIn: location
          })
        });

        const data = await res.json();
        if (res.ok) {
          const statusLabel = status === 'hadir' ? '✅ Hadir' : '⏰ Terlambat';
          Utils.showNotification(`Absen masuk berhasil! ${statusLabel} - ${Utils.formatTime(now)}`, 'success');
          this.refreshCurrentPage();
        } else {
          Utils.showNotification(data.error || 'Gagal absen masuk', 'error');
        }
      } else {
        // Outside radius - show reason form
        this.showReasonModal(location, radiusCheck, 'clockIn');
      }
    } catch (error) {
      Utils.showNotification(error.message, 'error');
      this.showReasonModal(null, null, 'clockIn', true);
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  // Process Clock Out
  async clockOut() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    const btn = document.getElementById('clock-out-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Memeriksa lokasi...';
    }

    try {
      const location = await this.getLocation();
      const radiusCheck = await this.isWithinRadius(location);
      const now = new Date();

      if (radiusCheck.isInside) {
        const res = await fetch('/api/attendance/clock-out', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            clockOut: now.toISOString(),
            locationOut: location
          })
        });

        const data = await res.json();
        if (res.ok) {
          Utils.showNotification('Absen pulang berhasil!', 'success');
          this.refreshCurrentPage();
        } else {
          Utils.showNotification(data.error || 'Gagal absen pulang', 'error');
        }
      } else {
        this.showClockOutReasonModal(location, radiusCheck);
      }
    } catch (error) {
      Utils.showNotification(error.message, 'error');
      this.showClockOutReasonModal(null, null);
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  // Show reason modal for clock-in out-of-radius
  showReasonModal(location, radiusCheck, action, gpsFailure = false) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'reason-modal-overlay';

    const distanceInfo = radiusCheck ?
      `<div class="modal-distance-info">
        <div class="distance-visual">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="#EF4444" stroke-width="2" stroke-dasharray="4 4" fill="none"/>
            <circle cx="24" cy="24" r="4" fill="#EF4444"/>
            <circle cx="32" cy="16" r="3" fill="#6366F1"/>
          </svg>
        </div>
        <div class="distance-text">
          <p class="distance-value">📍 ${radiusCheck.distance}m dari lokasi sekolah</p>
          <p class="distance-limit">Batas radius: ${radiusCheck.radius}m</p>
        </div>
      </div>` :
      `<div class="modal-distance-info gps-fail">
        <div class="distance-visual">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="#F59E0B" stroke-width="2" fill="none"/>
            <path d="M24 16v8M24 28h.01" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="distance-text">
          <p class="distance-value">⚠️ GPS tidak tersedia</p>
          <p class="distance-limit">Lokasi tidak dapat diverifikasi</p>
        </div>
      </div>`;

    overlay.innerHTML = `
      <div class="modal reason-modal">
        <div class="modal-header">
          <h3>📋 Absen Masuk Di Luar Lokasi</h3>
          <button class="modal-close" onclick="document.getElementById('reason-modal-overlay').remove()">✕</button>
        </div>
        <div class="modal-body">
          ${distanceInfo}
          <p class="modal-notice">Anda berada di luar area sekolah. Silakan pilih alasan untuk melanjutkan absensi masuk:</p>
          <form id="reason-form">
            <div class="form-group">
              <label for="reason-select">Alasan <span class="required">*</span></label>
              <select id="reason-select" required>
                <option value="">-- Pilih Alasan --</option>
                <option value="dinas">🚗 Dinas Luar</option>
                <option value="izin">📋 Izin</option>
                <option value="sakit">🤒 Sakit</option>
              </select>
            </div>
            <div class="form-group">
              <label for="reason-detail">Keterangan <span class="required">*</span></label>
              <textarea id="reason-detail" rows="3" placeholder="Jelaskan alasan secara detail..." required></textarea>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('reason-modal-overlay').remove()">Batal</button>
              <button type="submit" class="btn btn-primary">Kirim Absensi</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal-overlay-show'));

    document.getElementById('reason-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const reason = document.getElementById('reason-select').value;
      const detail = document.getElementById('reason-detail').value.trim();
      if (!reason || !detail) {
        Utils.showNotification('Lengkapi semua field', 'warning');
        return;
      }
      this.submitWithReason(reason, detail, location);
      overlay.remove();
    });
  },

  // Show reason modal for clock-out out-of-radius
  showClockOutReasonModal(location, radiusCheck) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'reason-modal-overlay';

    const distanceInfo = radiusCheck ?
      `<div class="modal-distance-info">
        <div class="distance-visual">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="#EF4444" stroke-width="2" stroke-dasharray="4 4" fill="none"/>
            <circle cx="24" cy="24" r="4" fill="#EF4444"/>
            <circle cx="32" cy="16" r="3" fill="#6366F1"/>
          </svg>
        </div>
        <div class="distance-text">
          <p class="distance-value">📍 ${radiusCheck.distance}m dari lokasi sekolah</p>
          <p class="distance-limit">Batas radius: ${radiusCheck.radius}m</p>
        </div>
      </div>` :
      `<div class="modal-distance-info gps-fail">
        <div class="distance-visual">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="#F59E0B" stroke-width="2" fill="none"/>
            <path d="M24 16v8M24 28h.01" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="distance-text">
          <p class="distance-value">⚠️ GPS tidak tersedia</p>
          <p class="distance-limit">Lokasi tidak dapat diverifikasi</p>
        </div>
      </div>`;

    overlay.innerHTML = `
      <div class="modal reason-modal">
        <div class="modal-header">
          <h3>📋 Absen Pulang Di Luar Lokasi</h3>
          <button class="modal-close" onclick="document.getElementById('reason-modal-overlay').remove()">✕</button>
        </div>
        <div class="modal-body">
          ${distanceInfo}
          <p class="modal-notice">Anda berada di luar area sekolah saat absen pulang. Silakan isi alasan:</p>
          <form id="reason-out-form">
            <div class="form-group">
              <label for="reason-out-select">Alasan <span class="required">*</span></label>
              <select id="reason-out-select" required>
                <option value="">-- Pilih Alasan --</option>
                <option value="dinas">🚗 Pulang dari Dinas Luar</option>
                <option value="tugas">📝 Tugas di luar sekolah</option>
                <option value="keperluan">🏠 Keperluan mendesak</option>
                <option value="lainnya">📌 Lainnya</option>
              </select>
            </div>
            <div class="form-group">
              <label for="reason-out-detail">Keterangan <span class="required">*</span></label>
              <textarea id="reason-out-detail" rows="3" placeholder="Jelaskan alasan..." required></textarea>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('reason-modal-overlay').remove()">Batal</button>
              <button type="submit" class="btn btn-primary">Kirim Absen Pulang</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal-overlay-show'));

    document.getElementById('reason-out-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const reason = document.getElementById('reason-out-select').value;
      const detail = document.getElementById('reason-out-detail').value.trim();
      if (!reason || !detail) {
        Utils.showNotification('Lengkapi semua field', 'warning');
        return;
      }
      this.submitClockOutWithReason(reason, detail, location);
      overlay.remove();
    });
  },

  // Submit attendance with reason (clock-in)
  async submitWithReason(reason, detail, location) {
    const now = new Date();
    try {
      const res = await fetch('/api/attendance/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          clockIn: now.toISOString(),
          status: reason,
          reason: reason,
          reasonDetail: detail,
          isInRadius: false,
          locationIn: location
        })
      });

      if (res.ok) {
        Utils.showNotification(`Absensi masuk tercatat dengan status: ${Utils.getStatusLabel(reason)}`, 'success');
        this.refreshCurrentPage();
      } else {
        const data = await res.json();
        Utils.showNotification(data.error || 'Gagal', 'error');
      }
    } catch (e) {
      Utils.showNotification('Gagal mengirim data', 'error');
    }
  },

  // Submit clock-out with reason
  async submitClockOutWithReason(reason, detail, location) {
    const now = new Date();
    try {
      const res = await fetch('/api/attendance/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          clockOut: now.toISOString(),
          locationOut: location,
          clockOutReason: reason,
          clockOutReasonDetail: detail
        })
      });

      if (res.ok) {
        Utils.showNotification(`Absen pulang tercatat! (Alasan: ${detail})`, 'success');
        this.refreshCurrentPage();
      } else {
        const data = await res.json();
        Utils.showNotification(data.error || 'Gagal', 'error');
      }
    } catch (e) {
      Utils.showNotification('Gagal mengirim data', 'error');
    }
  },

  // Get today's attendance for current user
  async getTodayAttendance() {
    const user = Auth.getCurrentUser();
    if (!user) return null;
    try {
      const res = await fetch('/api/attendance/today', { credentials: 'same-origin' });
      const data = await res.json();
      if (!data || !data.clock_in) return null;
      // Normalize field names for frontend compatibility
      return {
        id: data.id,
        userId: data.user_id,
        date: data.date,
        clockIn: data.clock_in,
        clockOut: data.clock_out,
        status: data.status,
        reason: data.reason,
        reasonDetail: data.reason_detail,
        isInRadius: data.is_in_radius,
        locationIn: data.locationIn || data.location_in,
        locationOut: data.locationOut || data.location_out
      };
    } catch (e) {
      return null;
    }
  },

  // Get attendance summary for a specific month
  async getMonthSummary(userId, year, month) {
    const records = await Storage.getAttendanceByUserAndMonth(userId, year, month);
    const normalizedRecords = (records || []).map(r => ({
      ...r,
      status: r.status,
      date: r.date
    }));

    const daysInMonth = Utils.getDaysInMonth(year, month);
    let workDays = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      if (!Utils.isWeekend(date)) workDays++;
    }

    const summary = {
      total: normalizedRecords.length,
      hadir: normalizedRecords.filter(r => r.status === 'hadir').length,
      terlambat: normalizedRecords.filter(r => r.status === 'terlambat').length,
      izin: normalizedRecords.filter(r => r.status === 'izin').length,
      sakit: normalizedRecords.filter(r => r.status === 'sakit').length,
      dinas: normalizedRecords.filter(r => r.status === 'dinas').length,
      alpha: 0,
      workDays: workDays
    };

    const today = new Date();
    const launchDate = new Date(APP_LAUNCH_DATE + 'T00:00:00');
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      if (date > today) continue;
      if (date < launchDate) continue;
      if (Utils.isWeekend(date)) continue;
      const dateStr = Utils.getLocalDateStr(date);
      const hasRecord = normalizedRecords.find(r => r.date === dateStr);
      if (!hasRecord) summary.alpha++;
    }

    const attendedDays = summary.hadir + summary.terlambat;
    const pastWorkDays = attendedDays + summary.izin + summary.sakit + summary.dinas + summary.alpha;
    summary.percentage = pastWorkDays > 0 ? Math.round((attendedDays / pastWorkDays) * 100) : 0;

    return summary;
  }
};
