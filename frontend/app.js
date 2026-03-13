const API_BASE = '';

function getAccessToken() {
  return localStorage.getItem('accessToken');
}

function getRefreshToken() {
  return localStorage.getItem('refreshToken');
}

function setTokens(accessToken, refreshToken) {
  if (accessToken) localStorage.setItem('accessToken', accessToken);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
}

function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

async function refreshTokens() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  if (!res.ok) {
    clearTokens();
    return false;
  }

  const data = await res.json();
  setTokens(data.accessToken, data.refreshToken);
  return true;
}

async function apiRequest(path, options = {}, retry = true) {
  const headers = options.headers ? { ...options.headers } : {};
  const accessToken = getAccessToken();
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    const ok = await refreshTokens();
    if (ok) return apiRequest(path, options, false);
  }

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    const msg = data && data.message ? data.message : 'Request failed';
    throw new Error(msg);
  }

  return data;
}

function ensureAuth() {
  if (!getAccessToken()) {
    window.location.href = '/login.html';
  }
}

function renderNav() {
  const nav = document.getElementById('navAuth');
  if (!nav) return;

  const loggedIn = !!getAccessToken();
  nav.innerHTML = '';

  if (loggedIn) {
    const flights = document.createElement('a');
    flights.href = '/flights.html';
    flights.textContent = 'Daftar Penerbangan';

    const add = document.createElement('a');
    add.href = '/flight-form.html';
    add.textContent = 'Tambah Penerbangan';

    const btn = document.createElement('button');
    btn.textContent = 'Logout';
    btn.addEventListener('click', async () => {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
      }
      clearTokens();
      window.location.href = '/login.html';
    });

    nav.append(flights, add, btn);
  } else {
    const login = document.createElement('a');
    login.href = '/login.html';
    login.textContent = 'Login';

    const reg = document.createElement('a');
    reg.href = '/register.html';
    reg.textContent = 'Register';

    nav.append(login, reg);
  }
}

function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

window.addEventListener('DOMContentLoaded', renderNav);
