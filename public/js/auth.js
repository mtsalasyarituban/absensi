// ============================================
// AbsensiKu - Authentication Module (API)
// ============================================

const Auth = {
  _currentUser: null,

  // Login user via API
  async login(username, password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        this._currentUser = data.user;
        Storage.setSession(data.user);
        return { success: true, user: data.user };
      }
      return { success: false, message: data.error || 'Login gagal' };
    } catch (e) {
      return { success: false, message: 'Tidak dapat terhubung ke server' };
    }
  },

  // Logout
  async logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin'
      });
    } catch (e) {}
    this._currentUser = null;
    Storage.clearSession();
    App.navigate('login');
  },

  // Get current user (cached or from API)
  getCurrentUser() {
    return this._currentUser;
  },

  // Fetch current user from server
  async fetchCurrentUser() {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'same-origin'
      });
      if (res.ok) {
        this._currentUser = await res.json();
        Storage.setSession(this._currentUser);
        return this._currentUser;
      }
    } catch (e) {}
    this._currentUser = null;
    return null;
  },

  // Check if logged in
  isLoggedIn() {
    return this._currentUser !== null;
  },

  // Check if admin
  isAdmin() {
    return this._currentUser && this._currentUser.role === 'admin';
  },

  // Render login page
  renderLogin() {
    const main = document.getElementById('main-content');
    if (!main) return;

    document.getElementById('app-sidebar').style.display = 'none';
    document.getElementById('app-topbar').style.display = 'none';
    document.body.classList.add('login-page');

    main.innerHTML = `
      <div class="login-container">
        <div class="login-bg-shapes">
          <div class="shape shape-1"></div>
          <div class="shape shape-2"></div>
          <div class="shape shape-3"></div>
        </div>
        <div class="login-card">
          <div class="login-header">
            <div class="login-logo">
              <div class="logo-icon">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <rect width="40" height="40" rx="12" fill="url(#logo-grad)"/>
                  <path d="M12 28V16L20 10L28 16V28H22V22H18V28H12Z" fill="white"/>
                  <circle cx="20" cy="17" r="2" fill="white" opacity="0.7"/>
                  <defs>
                    <linearGradient id="logo-grad" x1="0" y1="0" x2="40" y2="40">
                      <stop stop-color="#6366F1"/>
                      <stop offset="1" stop-color="#8B5CF6"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h1>AbsensiKu</h1>
            </div>
            <p class="login-subtitle">Sistem Absensi Digital Guru</p>
          </div>

          <form id="login-form" class="login-form">
            <div class="form-group">
              <label for="login-username">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Username
              </label>
              <input type="text" id="login-username" placeholder="Masukkan username" required autocomplete="username">
            </div>

            <div class="form-group">
              <label for="login-password">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Password
              </label>
              <div class="password-wrapper">
                <input type="password" id="login-password" placeholder="Masukkan password" required autocomplete="current-password">
                <button type="button" class="password-toggle" onclick="Auth.togglePassword()">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
            </div>

            <div id="login-error" class="login-error" style="display:none;"></div>

            <button type="submit" class="btn btn-primary btn-login" id="login-btn">
              <span class="btn-text">Masuk</span>
              <span class="btn-loader" style="display:none;">
                <span class="spinner"></span>
              </span>
            </button>
          </form>
        </div>
      </div>
    `;

    // Bind login form
    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      Auth.handleLogin();
    });
  },

  // Handle login
  async handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    // Show loading
    btn.querySelector('.btn-text').style.display = 'none';
    btn.querySelector('.btn-loader').style.display = 'inline-flex';
    btn.disabled = true;

    const result = await this.login(username, password);

    if (result.success) {
      document.body.classList.remove('login-page');
      App.init();
    } else {
      errorEl.textContent = result.message;
      errorEl.style.display = 'block';
      errorEl.classList.add('shake');
      setTimeout(() => errorEl.classList.remove('shake'), 500);

      btn.querySelector('.btn-text').style.display = 'inline';
      btn.querySelector('.btn-loader').style.display = 'none';
      btn.disabled = false;
    }
  },

  // Toggle password visibility
  togglePassword() {
    const input = document.getElementById('login-password');
    input.type = input.type === 'password' ? 'text' : 'password';
  }
};
