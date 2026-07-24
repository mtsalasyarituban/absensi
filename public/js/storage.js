// ============================================
// AbsensiKu - Storage Module (API Client)
// ============================================

const Storage = {
  // ---- Generic API ----
  async api(url, options = {}) {
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        ...options
      });
      if (res.status === 401) {
        // Session expired
        window.location.hash = '';
        window.location.reload();
        return null;
      }
      return await res.json();
    } catch (e) {
      console.error('API error:', e);
      return null;
    }
  },

  // ---- Users ----
  async getUsers() {
    return await this.api('/api/users') || [];
  },

  async getUserById(id) {
    return await this.api(`/api/users/${id}`);
  },

  async getUserByUsername(username) {
    const users = await this.getUsers();
    return users.find(u => u.username === username) || null;
  },

  async getTeachers() {
    return await this.api('/api/users/teachers') || [];
  },

  async addUser(user) {
    return await this.api('/api/users', {
      method: 'POST',
      body: JSON.stringify(user)
    });
  },

  async updateUser(id, updates) {
    return await this.api(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteUser(id) {
    return await this.api(`/api/users/${id}`, {
      method: 'DELETE'
    });
  },

  // ---- Attendance ----
  async getAttendance(filters = {}) {
    const params = new URLSearchParams();
    if (filters.userId) params.set('userId', filters.userId);
    if (filters.date) params.set('date', filters.date);
    if (filters.year !== undefined) params.set('year', filters.year);
    if (filters.month !== undefined) params.set('month', filters.month);
    return await this.api(`/api/attendance?${params}`) || [];
  },

  async getAttendanceByDate(date) {
    return await this.getAttendance({ date });
  },

  async getAttendanceByUser(userId) {
    return await this.getAttendance({ userId });
  },

  async getAttendanceByUserAndDate(userId, date) {
    const records = await this.getAttendance({ userId, date });
    return records && records.length > 0 ? records[0] : null;
  },

  async getAttendanceByUserAndMonth(userId, year, month) {
    return await this.getAttendance({ userId, year, month });
  },

  async getAttendanceByMonth(year, month) {
    return await this.getAttendance({ year, month });
  },

  async addAttendance(record) {
    return await this.api('/api/attendance/clock-in', {
      method: 'POST',
      body: JSON.stringify(record)
    });
  },

  async updateAttendance(id, updates) {
    // If updating clock-out, use clock-out endpoint
    if (updates.clockOut) {
      return await this.api('/api/attendance/clock-out', {
        method: 'POST',
        body: JSON.stringify(updates)
      });
    }
    // Otherwise use clock-in to update
    return await this.api('/api/attendance/clock-in', {
      method: 'POST',
      body: JSON.stringify(updates)
    });
  },

  // ---- Settings ----
  async getSettings() {
    return await this.api('/api/settings') || {
      schoolName: 'SMA Negeri 1',
      schoolLat: -6.200000,
      schoolLng: 106.816666,
      radius: 100,
      workStartTime: '07:00',
      lateThreshold: 15,
      workEndTime: '15:00'
    };
  },

  async updateSettings(updates) {
    return await this.api('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  // ---- Session (now handled by cookie) ----
  getSession() {
    // Session is managed by httpOnly cookie on server
    // This is just for backward compat — real check is via /api/auth/me
    return this._cachedSession || null;
  },

  setSession(user) {
    this._cachedSession = {
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    };
  },

  clearSession() {
    this._cachedSession = null;
  },

  // ---- Export ----
  async exportAllData() {
    return await this.api('/api/export') || {};
  },

  // ---- Init (no-op, server handles DB init) ----
  initData() {
    // Database is initialized on the server side
  }
};
