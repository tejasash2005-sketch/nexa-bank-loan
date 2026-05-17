/* NexaBank Pro — API Helper */

function setTokens(access, refresh) {
  if (access) {
    localStorage.setItem('nb_access', access);
    console.log('[NexaBank] Access token saved: ' + access.substring(0, 10) + '...');
  }
  if (refresh) {
    localStorage.setItem('nb_refresh', refresh);
    console.log('[NexaBank] Refresh token saved: ' + refresh.substring(0, 10) + '...');
  }
}

function setUser(user) {
  localStorage.setItem('nb_user', JSON.stringify(user));
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('nb_user') || 'null');
  } catch { return null; }
}

function getToken() {
  const t = localStorage.getItem('nb_access');
  return (t && t !== 'null' && t !== 'undefined') ? t.trim() : '';
}
function getRefreshToken() {
  const t = localStorage.getItem('nb_refresh');
  return (t && t !== 'null' && t !== 'undefined') ? t.trim() : '';
}

function clearAuth() {
  localStorage.removeItem('nb_access');
  localStorage.removeItem('nb_refresh');
  localStorage.removeItem('nb_user');
}

async function apiFetch(path, options = {}) {
  const url = API_BASE + path;
  const token = getToken();
  const refresh = getRefreshToken();

  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    console.error('[NexaBank] Network/Fetch error:', err);
    showToast('🌐 Network error: Connection refused or API is down.', 'error');
    return null;
  }

  // Handle various HTTP errors
  if (!res.ok) {
    // Auto-refresh on 401 (Unauthorized/Expired)
    const isAuthRequest = path.includes('/login') || path.includes('/refresh') || path.includes('/logout');

    if (res.status === 401 && refresh && !isAuthRequest) {
      console.warn('[NexaBank] Token expired, attempting refresh...');
      try {
        const rr = await fetch(API_BASE + '/refresh', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + refresh, 'Content-Type': 'application/json' }
        });

        if (rr.ok) {
          const rd = await rr.json();
          setTokens(rd.access_token);
          headers['Authorization'] = 'Bearer ' + rd.access_token;
          return await fetch(url, { ...options, headers });
        } else {
          clearAuth();
          showPage('login');
          showToast('Session expired. Please login again.', 'error');
          return null;
        }
      } catch (err) {
        clearAuth();
        showPage('login');
        return null;
      }
    }

    // Handle other errors
    const errBody = await res.clone().json().catch(() => ({}));
    if (res.status === 403) showToast('🚫 Access Forbidden: Admin rights required.', 'error');
    else if (res.status === 404) console.warn('[NexaBank] 404 Not Found:', path);
    else if (res.status === 500) showToast('💥 Internal Server Error. Please check backend logs.', 'error');
    else if (errBody.error) showToast(errBody.error, 'error');
  }

  return res;
}

async function apiGet(path) {
  const res = await apiFetch(path);
  if (!res || !res.ok) return null;
  try {
    return await res.json();
  } catch (err) {
    return null;
  }
}

async function apiPost(path, body) {
  const res = await apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body)
  });
  if (!res) return null;
  try {
    return await res.json();
  } catch (err) {
    return null;
  }
}

async function apiPut(path, body) {
  const res = await apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
  if (!res) return null;
  try {
    return await res.json();
  } catch (err) {
    return null;
  }
}

// Toast notification
function showToast(msg, type = 'info', duration = 3500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), duration);
}

// Modal
function openModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// Expander toggle
function toggleExpander(el) {
  el.closest('.expander').classList.toggle('open');
}

// Tab switching
function switchTab(tabGroup, tabId) {
  document.querySelectorAll(`[data-tabgroup="${tabGroup}"]`).forEach(el => {
    el.classList.toggle('active', el.dataset.tabid === tabId);
  });
  document.querySelectorAll(`[data-tabcontent="${tabGroup}"]`).forEach(el => {
    el.classList.toggle('active', el.dataset.tabid === tabId);
  });
}
