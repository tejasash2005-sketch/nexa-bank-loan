/* NexaBank Pro — Auth & Routing */

function showPage(page) {
  ['landing','login','register','user','admin'].forEach(p => {
    const el = document.getElementById('page-' + p);
    if (el) el.classList.add('hidden');
  });
  const target = document.getElementById('page-' + page);
  if (target) {
    target.classList.remove('hidden');
    window.scrollTo(0, 0);
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  errEl.classList.add('hidden');
  btn.querySelector('.btn-text').classList.add('hidden');
  btn.querySelector('.btn-loader').classList.remove('hidden');
  btn.disabled = true;

  try {
    const data = await apiPost('/login', { username, password });
    if (data && data.access_token) {
      setTokens(data.access_token, data.refresh_token);
      setUser(data.user);

      showToast(`✅ Welcome back, ${data.user.name || data.user.username}!`, 'success');

      // Small delay to ensure localStorage is flushed and UI is ready
      setTimeout(() => {
        const currentUser = getUser();
        if (!currentUser) return;

        if (currentUser.role === 'admin') {
          const el = document.getElementById('admin-sidebar-username');
          if (el) el.textContent = currentUser.name || currentUser.username;
          showPage('admin');
          adminNav('dashboard');
        } else {
          const el = document.getElementById('sidebar-username');
          if (el) el.textContent = currentUser.name || currentUser.username;
          showPage('user');
          userNav('apply');
          loadNotifCount();
        }
      }, 250);
    } else {
      errEl.textContent = (data && data.error) || 'Login failed. Please check credentials.';
      errEl.classList.remove('hidden');
    }
  } catch (err) {
    errEl.textContent = 'Server error. Make sure the backend is running.';
    errEl.classList.remove('hidden');
  } finally {
    btn.querySelector('.btn-text').classList.remove('hidden');
    btn.querySelector('.btn-loader').classList.add('hidden');
    btn.disabled = false;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('reg-btn');
  const errEl = document.getElementById('reg-error');

  const name     = document.getElementById('reg-name').value.trim();
  const username = document.getElementById('reg-username').value.trim().toLowerCase();
  const email    = document.getElementById('reg-email').value.trim().toLowerCase();
  const phone    = document.getElementById('reg-phone').value.trim();
  const password = document.getElementById('reg-password').value;

  errEl.classList.add('hidden');
  btn.querySelector('.btn-text').classList.add('hidden');
  btn.querySelector('.btn-loader').classList.remove('hidden');
  btn.disabled = true;

  try {
    const data = await apiPost('/register', { name, username, email, phone, password });
    if (data && data.access_token) {
      setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      showToast('🎉 Account created! Welcome to NexaBank Pro!', 'success');
      document.getElementById('sidebar-username').textContent = data.user.name || data.user.username;
      showPage('user');
      userNav('apply');
      loadNotifCount();
    } else {
      errEl.textContent = (data && data.error) || 'Registration failed.';
      errEl.classList.remove('hidden');
    }
  } catch (err) {
    errEl.textContent = 'Server error. Make sure the backend is running.';
    errEl.classList.remove('hidden');
  } finally {
    btn.querySelector('.btn-text').classList.remove('hidden');
    btn.querySelector('.btn-loader').classList.add('hidden');
    btn.disabled = false;
  }
}

async function logout() {
  try {
    await apiPost('/logout', {});
  } catch (e) {
    console.warn('Logout request failed (probably already expired)');
  }
  clearAuth();
  showToast('Session cleared', 'info');
  showPage('landing');
}

async function loadNotifCount() {
  try {
    const data = await apiGet('/user/notifications');
    if (data && data.unread > 0) {
      const badge = document.getElementById('notif-count');
      if (badge) { badge.textContent = data.unread; badge.style.display = 'inline'; }
    }
  } catch {}
}

// Auto-restore session on page load
window.addEventListener('DOMContentLoaded', () => {
  buildLandingLoans();
  const user = getUser();
  const token = getToken();

  if (user && token) {
    if (user.role === 'admin') {
      const el = document.getElementById('admin-sidebar-username');
      if (el) el.textContent = user.name || user.username;
      showPage('admin');
      adminNav('dashboard');
    } else {
      const el = document.getElementById('sidebar-username');
      if (el) el.textContent = user.name || user.username;
      showPage('user');
      userNav('apply');
      loadNotifCount();
    }
  } else {
    showPage('landing');
  }
});

function buildLandingLoans() {
  const grid = document.getElementById('landing-loans-grid');
  if (!grid) return;
  grid.innerHTML = Object.entries(LOANS).map(([name, info]) => `
    <div class="loan-tile" onclick="showPage('login')">
      <div class="loan-tile-icon">${info.icon}</div>
      <div class="loan-tile-name">${name}</div>
      <div class="loan-tile-rate">${(info.rate*100).toFixed(1)}% p.a. | ${info.tenure >= 12 ? Math.round(info.tenure/12)+'y' : info.tenure+'m'}</div>
    </div>
  `).join('');
}

// Sidebar navigation helpers
function userNav(page) {
  document.querySelectorAll('#user-sidebar .nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  loadUserPage(page);
}

function adminNav(page) {
  document.querySelectorAll('#admin-sidebar .nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  loadAdminPage(page);
}
