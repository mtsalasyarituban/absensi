// ============================================
// AbsensiKu - Utility Functions
// ============================================

const Utils = {
  // Generate unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  // Format date to Indonesian locale
  formatDate(date, format = 'full') {
    const d = new Date(date);
    const options = {
      full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
      short: { day: '2-digit', month: 'short', year: 'numeric' },
      dayMonth: { day: 'numeric', month: 'short' },
      iso: null
    };

    if (format === 'iso') {
      return this.getLocalDateStr(date);
    }

    return d.toLocaleDateString('id-ID', options[format] || options.full);
  },

  // Format time from Date object or timestamp
  formatTime(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  },

  // Format time short (HH:MM)
  formatTimeShort(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  },

  // Get today's date as ISO string (YYYY-MM-DD) in local time
  getToday() {
    return this.getLocalDateStr(new Date());
  },

  // Calculate duration between two timestamps in hours and minutes
  calculateDuration(start, end) {
    if (!start || !end) return '-';
    const diff = new Date(end) - new Date(start);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}j ${minutes}m`;
  },

  // Calculate duration in minutes
  calculateDurationMinutes(start, end) {
    if (!start || !end) return 0;
    return Math.floor((new Date(end) - new Date(start)) / (1000 * 60));
  },

  // Haversine formula - calculate distance between two coordinates in meters
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  toRad(deg) {
    return deg * (Math.PI / 180);
  },

  // Get status badge HTML
  getStatusBadge(status) {
    const statusMap = {
      hadir: { label: 'Hadir', class: 'status-hadir', icon: '✅' },
      terlambat: { label: 'Terlambat', class: 'status-terlambat', icon: '⏰' },
      izin: { label: 'Izin', class: 'status-izin', icon: '📋' },
      sakit: { label: 'Sakit', class: 'status-sakit', icon: '🤒' },
      dinas: { label: 'Dinas Luar', class: 'status-dinas', icon: '🚗' },
      alpha: { label: 'Alpha', class: 'status-alpha', icon: '❌' },
      belum: { label: 'Belum Absen', class: 'status-belum', icon: '⏳' }
    };
    const s = statusMap[status] || statusMap.belum;
    return `<span class="status-badge ${s.class}">${s.icon} ${s.label}</span>`;
  },

  // Get status label only
  getStatusLabel(status) {
    const labels = {
      hadir: 'Hadir',
      terlambat: 'Terlambat',
      izin: 'Izin',
      sakit: 'Sakit',
      dinas: 'Dinas Luar',
      alpha: 'Alpha',
      belum: 'Belum Absen'
    };
    return labels[status] || 'Belum Absen';
  },

  // Export data to CSV (compatible with Excel & Google Sheets)
  exportCSV(data, filename) {
    if (!data || data.length === 0) {
      this.showNotification('Tidak ada data untuk di-export', 'warning');
      return;
    }

    const headers = Object.keys(data[0]);
    const SEP = ';'; // Semicolon works for Indonesian/European locale Excel

    const escapeVal = (val) => {
      const str = String(val ?? '-');
      return '"' + str.replace(/"/g, '""') + '"';
    };

    const rows = [
      'sep=;', // Tell Excel which separator to use
      headers.map(escapeVal).join(SEP),
      ...data.map(row =>
        headers.map(h => escapeVal(row[h])).join(SEP)
      )
    ];

    const content = rows.join('\r\n');
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${this.getToday()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    this.showNotification('Data berhasil di-export!', 'success');
  },

  // Show notification toast
  showNotification(message, type = 'info', duration = 3000) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    notification.innerHTML = `
      <span class="notification-icon">${icons[type] || icons.info}</span>
      <span class="notification-message">${message}</span>
    `;

    container.appendChild(notification);

    // Trigger animation
    requestAnimationFrame(() => notification.classList.add('notification-show'));

    setTimeout(() => {
      notification.classList.remove('notification-show');
      notification.classList.add('notification-hide');
      setTimeout(() => notification.remove(), 300);
    }, duration);
  },

  // Show confirmation dialog
  showConfirm(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay modal-overlay-show';
      overlay.innerHTML = `
        <div class="modal confirm-modal">
          <div class="modal-header">
            <h3>⚠️ Konfirmasi</h3>
          </div>
          <div class="modal-body">
            <p>${message}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="confirm-cancel">Batal</button>
            <button class="btn btn-danger" id="confirm-ok">Ya, Lanjutkan</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      overlay.querySelector('#confirm-ok').onclick = () => {
        overlay.remove();
        resolve(true);
      };
      overlay.querySelector('#confirm-cancel').onclick = () => {
        overlay.remove();
        resolve(false);
      };
    });
  },

  // Get greeting based on time
  getGreeting() {
    const hour = new Date().getHours();
    if (hour < 10) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  },

  // Get day name in Indonesian
  getDayName(date) {
    return new Date(date).toLocaleDateString('id-ID', { weekday: 'long' });
  },

  // Check if date is weekend (based on settings)
  isWeekend(date) {
    const day = new Date(date).getDay();
    // Use configured off days if available, default to Sunday (0) and Saturday (6)
    const offDays = (window.appSettings && window.appSettings.offDays) ? window.appSettings.offDays : '0,6';
    const offDaysArray = offDays.split(',').map(n => parseInt(n.trim()));
    return offDaysArray.includes(day);
  },

  // Get local date string YYYY-MM-DD avoiding UTC timezone offset bugs
  getLocalDateStr(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Get days in month
  getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  },

  // Get month name
  getMonthName(month) {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[month];
  },

  // Animate counter
  animateCounter(element, target, duration = 1000) {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        element.textContent = target;
        clearInterval(timer);
      } else {
        element.textContent = Math.floor(start);
      }
    }, 16);
  },

  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  },

  // Get initials from name
  getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  },

  // Generate avatar color from name
  getAvatarColor(name) {
    const colors = [
      '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B',
      '#10B981', '#06B6D4', '#3B82F6', '#F97316', '#14B8A6'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
};
