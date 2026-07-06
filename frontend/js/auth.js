const Auth = (() => {
  function isLoggedIn() {
    return !!API.getToken();
  }

  async function login(username, password) {
    UI.loading(true);
    try {
      const res = await API.request('POST', '/auth/login', { username, password });
      API.setToken(res.access_token);
      UI.toast(`Welcome back, ${res.user.username}!`, 'success');
      window.location.href = 'index.html';
    } catch (e) {
      UI.toast(e.detail || 'Login failed', 'error');
      throw e;
    } finally {
      UI.loading(false);
    }
  }

  async function register(username, email, password) {
    UI.loading(true);
    try {
      const res = await API.request('POST', '/auth/register', { username, email, password });
      UI.toast('Registration successful! Please login.', 'success');
      return res;
    } catch (e) {
      UI.toast(e.detail || 'Registration failed', 'error');
      throw e;
    } finally {
      UI.loading(false);
    }
  }

  async function getMe() {
    try {
      return await API.request('GET', '/auth/me');
    } catch (e) {
      return null;
    }
  }

  function logout() {
    API.clearToken();
    UI.toast('Logged out', 'info');
    window.location.href = 'login.html';
  }

  function redirectIfNotLoggedIn() {
    if (!isLoggedIn()) {
      window.location.href = 'login.html';
    }
  }

  return { isLoggedIn, login, register, getMe, logout, redirectIfNotLoggedIn };
})();
