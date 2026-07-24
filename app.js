// ============================================
// AbsensiKu - Main Application & Router
// ============================================

const App = {
  currentPage: null,

  // Initialize app
  async init() {
    // Check auth from server
    const user = await Auth.fetchCurrentUser();
    if (!user) {
      Auth.renderLogin();
      return;
    }

    // Show app shell
    this.renderShell(user);

    // Handle route
    const hash = window.location.hash.slice(1) || 'dashboard';
    this.navigate(hash);
  },

  // Render app shell (sidebar + topbar)
  renderShell(user) {
    const sidebar = document.getElementById('app-sidebar');
    const topbar = document.getElementById('app-topbar');

    sidebar.style.display = '';
    topbar.style.display = '';
    document.body.classList.remove('login-page');

    const isAdmin = user.role === 'admin';

    // Sidebar
    sidebar.innerHTML = `
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="12" fill="url(#sidebar-grad)"/>
            <path d="M12 28V16L20 10L28 16V28H22V22H18V28H12Z" fill="white"/>
            <circle cx="20" cy="17" r="2" fill="white" opacity="0.7"/>
            <defs>
              <linearGradient id="sidebar-grad" x1="0" y1="0" x2="40" y2="40">
                <stop stop-color="#6366F1"/>
                <stop offset="1" stop-color="#8B5CF6"/>
              </linearGradient>
            </defs>
          </svg>
          <span class="sidebar-title">AbsensiKu</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <a href="#dashboard" class="nav-item" data-page="dashboard" onclick="App.navigate('dashboard')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>Dashboard</span>
        </a>

        ${!isAdmin ? `
          <a href="#absensi" class="nav-item" data-page="absensi" onclick="App.navigate('absensi')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <path d="M8 14l2 2 4-4"/>
            </svg>
            <span>Absensi</span>
          </a>
        ` : ''}

        <a href="#rekap" class="nav-item" data-page="rekap" onclick="App.navigate('rekap')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <span>Rekap Bulanan</span>
        </a>

        ${isAdmin ? `
          <a href="#admin" class="nav-item" data-page="admin" onclick="App.navigate('admin')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>Panel Admin</span>
          </a>
        ` : ''}
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="sidebar-user-avatar" style="background: ${Utils.getAvatarColor(user.name)}">
            ${Utils.getInitials(user.name)}
          </div>
          <div class="sidebar-user-info">
            <span class="sidebar-user-name">${user.name}</span>
            <span class="sidebar-user-role">${isAdmin ? 'Administrator' : user.mapel}</span>
          </div>
        </div>
        <button class="btn-logout" onclick="Auth.logout()" title="Logout">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    `;

    // Topbar (mobile)
    topbar.innerHTML = `
      <button class="topbar-menu" onclick="App.toggleSidebar()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <span class="topbar-title">AbsensiKu</span>
      <button class="btn-logout-mobile" onclick="Auth.logout()" title="Logout">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    `;
  },

  // Navigate to page
  navigate(page) {
    if (!Auth.isLoggedIn() && page !== 'login') {
      Auth.renderLogin();
      return;
    }

    if (page === 'login') {
      Auth.renderLogin();
      return;
    }

    // Cleanup previous page
    Dashboard.destroy();

    this.currentPage = page;
    window.location.hash = page;

    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // Close mobile sidebar
    const sidebar = document.getElementById('app-sidebar');
    sidebar.classList.remove('sidebar-open');
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.remove();

    // Render page
    switch (page) {
      case 'dashboard':
        Dashboard.render();
        break;
      case 'absensi':
        this.renderAbsensiPage();
        break;
      case 'rekap':
        Recap.render();
        break;
      case 'admin':
        Admin.render();
        break;
      default:
        Dashboard.render();
    }

    // Bind settings form if on admin page
    setTimeout(() => {
      const settingsForm = document.getElementById('settings-form');
      if (settingsForm) {
        settingsForm.addEventListener('submit', (e) => {
          e.preventDefault();
          Admin.saveSettings();
        });
      }
    }, 100);
  },

  // Render dedicated absensi page for guru
  async renderAbsensiPage() {
    const user = Auth.getCurrentUser();
    const main = document.getElementById('main-content');
    const todayAttendance = await Attendance.getTodayAttendance();
    const settings = await Storage.getSettings();
    const now = new Date();

    let clockState = 'ready';
    if (todayAttendance) {
      if (todayAttendance.clockOut) clockState = 'done';
      else if (todayAttendance.clockIn) clockState = 'clocked-in';
    }
    const hasReasonNoClockOut = todayAttendance && ['izin', 'sakit'].includes(todayAttendance.status);
    const isDinasToday = todayAttendance && todayAttendance.status === 'dinas';

    main.innerHTML = `
      <div class="absensi-page page-enter">
        <div class="page-header">
          <h2>📋 Absensi Hari Ini</h2>
          <p class="page-subtitle">${Utils.formatDate(now)} • ${settings.schoolName}</p>
        </div>

        <div class="absensi-content">
          <!-- Location Info -->
          <div class="location-card" id="location-card">
            <div class="location-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div class="location-info">
              <p class="location-label">Lokasi: <span id="location-status">Menunggu verifikasi...</span></p>
              <p class="location-detail" id="location-detail">Tekan tombol absen untuk memverifikasi lokasi Anda</p>
            </div>
          </div>

          <!-- Clock Display -->
          <div class="absensi-clock">
            <div class="big-clock" id="big-clock"></div>
            <p class="clock-date">${Utils.formatDate(now)}</p>
          </div>

          <!-- Action Area -->
          <div class="absensi-actions">
            ${hasReasonNoClockOut ? `
              <div class="today-reason-card large">
                <div class="reason-icon large">${todayAttendance.status === 'sakit' ? '🤒' : '📋'}</div>
                <h3>Status: ${Utils.getStatusLabel(todayAttendance.status)}</h3>
                <p class="reason-text">${todayAttendance.reasonDetail || '-'}</p>
                <p class="reason-time-text">Dicatat pada ${Utils.formatTime(todayAttendance.clockIn)}</p>
              </div>
            ` : isDinasToday ? `
              <div class="today-reason-card large">
                <div class="reason-icon large">🚗</div>
                <h3>Status: Dinas Luar</h3>
                <p class="reason-text">${todayAttendance.reasonDetail || '-'}</p>
                <p class="reason-time-text">Dicatat pada ${Utils.formatTime(todayAttendance.clockIn)}</p>
              </div>
              ${!todayAttendance.clockOut ? `
                <button class="btn-clock-large btn-clock-out" id="clock-out-btn" onclick="Attendance.clockOut()">
                  <div class="btn-clock-pulse pulse-out"></div>
                  <div class="btn-clock-inner">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    <span class="btn-label">TAP UNTUK PULANG</span>
                  </div>
                </button>
              ` : `
                <div class="absensi-complete">
                  <div class="complete-icon">🎉</div>
                  <h3>Dinas Selesai!</h3>
                  <div class="complete-details">
                    <div class="complete-row">
                      <span class="label">Dicatat</span>
                      <span class="value">${Utils.formatTime(todayAttendance.clockIn)}</span>
                    </div>
                    <div class="complete-row">
                      <span class="label">Pulang</span>
                      <span class="value">${Utils.formatTime(todayAttendance.clockOut)}</span>
                    </div>
                  </div>
                  <div class="complete-status">${Utils.getStatusBadge(todayAttendance.status)}</div>
                </div>
              `}
            ` : clockState === 'ready' ? `
              <button class="btn-clock-large btn-clock-in" id="clock-in-btn" onclick="Attendance.clockIn()">
                <div class="btn-clock-pulse"></div>
                <div class="btn-clock-inner">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  <span class="btn-label">TAP UNTUK MASUK</span>
                </div>
              </button>
              <p class="absensi-hint">Pastikan GPS aktif dan Anda berada di area sekolah</p>
            ` : clockState === 'clocked-in' ? `
              <div class="clock-status-card">
                <div class="status-check">✅</div>
                <h3>Absen Masuk Tercatat</h3>
                <div class="status-detail">
                  <span class="status-time">${Utils.formatTime(todayAttendance.clockIn)}</span>
                  ${Utils.getStatusBadge(todayAttendance.status)}
                </div>
              </div>

              <button class="btn-clock-large btn-clock-out" id="clock-out-btn" onclick="Attendance.clockOut()">
                <div class="btn-clock-pulse pulse-out"></div>
                <div class="btn-clock-inner">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  <span class="btn-label">TAP UNTUK PULANG</span>
                </div>
              </button>
            ` : `
              <div class="absensi-complete">
                <div class="complete-icon">🎉</div>
                <h3>Absensi Selesai!</h3>
                <div class="complete-details">
                  <div class="complete-row">
                    <span class="label">Masuk</span>
                    <span class="value">${Utils.formatTime(todayAttendance.clockIn)}</span>
                  </div>
                  <div class="complete-row">
                    <span class="label">Pulang</span>
                    <span class="value">${Utils.formatTime(todayAttendance.clockOut)}</span>
                  </div>
                  <div class="complete-row highlight">
                    <span class="label">Total Jam Kerja</span>
                    <span class="value">${Utils.calculateDuration(todayAttendance.clockIn, todayAttendance.clockOut)}</span>
                  </div>
                </div>
                <div class="complete-status">${Utils.getStatusBadge(todayAttendance.status)}</div>
              </div>
            `}
          </div>

          <!-- Rules Info -->
          <div class="rules-card">
            <h4>ℹ️ Informasi Absensi</h4>
            <ul>
              <li>Jam masuk: <strong>${settings.workStartTime}</strong> WIB</li>
              <li>Toleransi terlambat: <strong>${settings.lateThreshold} menit</strong></li>
              <li>Jam pulang: <strong>${settings.workEndTime}</strong> WIB</li>
              <li>Radius absensi: <strong>${settings.radius} meter</strong> dari lokasi sekolah</li>
              <li>Jika di luar radius, wajib mengisi alasan</li>
            </ul>
          </div>
        </div>
      </div>
    `;

    // Start clock
    const updateClock = () => {
      const el = document.getElementById('big-clock');
      if (el) el.textContent = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    };
    updateClock();
    this._absensiClockInterval = setInterval(updateClock, 1000);

    // Auto-detect location
    const statusEl = document.getElementById('location-status');
    const detailEl = document.getElementById('location-detail');
    const cardEl = document.getElementById('location-card');
    
    if (statusEl && detailEl && cardEl && (!todayAttendance || !todayAttendance.clockOut)) {
      statusEl.textContent = 'Mendeteksi lokasi...';
      detailEl.textContent = 'Mohon tunggu sebentar';
      
      Attendance.getLocation()
        .then(async (loc) => {
          const radiusCheck = await Attendance.isWithinRadius(loc);
          if (radiusCheck.isInside) {
            statusEl.textContent = 'Lokasi Terverifikasi';
            detailEl.textContent = `Berada di dalam radius sekolah (${Math.round(radiusCheck.distance)}m)`;
            cardEl.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            cardEl.style.borderColor = 'rgba(16, 185, 129, 0.3)';
          } else {
            statusEl.textContent = 'Di Luar Radius';
            detailEl.textContent = `Jarak: ${Math.round(radiusCheck.distance)}m (Maksimal ${settings.radius}m)`;
            cardEl.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
            cardEl.style.borderColor = 'rgba(245, 158, 11, 0.3)';
          }
        })
        .catch(err => {
          statusEl.textContent = 'Gagal Deteksi Lokasi';
          detailEl.textContent = err.message || 'Pastikan GPS/Lokasi menyala dan diizinkan';
          cardEl.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
          cardEl.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        });
    }
  },

  // Toggle mobile sidebar
  toggleSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const isOpen = sidebar.classList.toggle('sidebar-open');

    if (isOpen) {
      const overlay = document.createElement('div');
      overlay.id = 'sidebar-overlay';
      overlay.className = 'sidebar-overlay';
      overlay.onclick = () => this.toggleSidebar();
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('show'));
    } else {
      const overlay = document.getElementById('sidebar-overlay');
      if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
      }
    }
  }
};

// ---- Bootstrap ----
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});

window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1) || 'dashboard';
  if (hash !== App.currentPage) {
    App.navigate(hash);
  }
});
