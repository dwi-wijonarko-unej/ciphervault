const Auth = (() => {
  function isLoggedIn() {
    return !!API.getToken();
  }

  function errorMessage(e, fallback) {
    if (!e) return fallback;
    if (typeof e.detail === "string" && e.detail.trim()) return e.detail;
    if (Array.isArray(e.detail) && e.detail.length > 0) {
      const first = e.detail[0];
      if (typeof first?.msg === "string") return first.msg;
    }
    return fallback;
  }

  async function login(username, password) {
    UI.loading(true);
    try {
      const res = await API.request("POST", "/auth/login", {
        username,
        password,
      });
      API.setToken(res.access_token);
      UI.toast(I18n.t("auth.welcome_back", { username: res.user.username }), "success");
      window.location.href = "index.html";
    } catch (e) {
      UI.toast(errorMessage(e, I18n.t("auth.login_failed")), "error");
      throw e;
    } finally {
      UI.loading(false);
    }
  }

  async function register(username, email, password) {
    UI.loading(true);
    try {
      const res = await API.request("POST", "/auth/register", {
        username,
        email,
        password,
      });
      UI.toast(I18n.t("auth.register_success"), "success");
      return res;
    } catch (e) {
      UI.toast(errorMessage(e, I18n.t("auth.register_failed")), "error");
      throw e;
    } finally {
      UI.loading(false);
    }
  }

  async function getMe() {
    try {
      return await API.request("GET", "/auth/me");
    } catch (e) {
      if (
        e?.statusCode === 401 ||
        e?.detail === "Could not validate credentials" ||
        e?.detail === "Not authenticated"
      ) {
        API.clearToken();
      }
      return null;
    }
  }

  function logout() {
    API.clearToken();
    UI.toast(I18n.t("auth.logged_out"), "info");
    window.location.href = "login.html";
  }

  async function ensureAuthenticated() {
    if (!isLoggedIn()) {
      window.location.href = "login.html";
      return null;
    }

    const me = await getMe();
    if (!me) {
      window.location.href = "login.html";
      return null;
    }

    return me;
  }

  async function redirectIfLoggedIn() {
    if (!isLoggedIn()) return false;
    const me = await getMe();
    if (!me) return false;
    window.location.href = "index.html";
    return true;
  }

  async function redirectIfNotLoggedIn() {
    return ensureAuthenticated();
  }

  return {
    isLoggedIn,
    login,
    register,
    getMe,
    logout,
    ensureAuthenticated,
    redirectIfLoggedIn,
    redirectIfNotLoggedIn,
  };
})();
