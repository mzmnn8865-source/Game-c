/* Vanilla JavaScript for API-backed views and small interactions. */
(() => {
  const backend = window.GAMECLUB_BACKEND || {};
  const apiBase = (backend.apiBase || "").replace(/\/$/, "");
  const tokenKey = backend.tokenKey || "gc_token";
  const endpoints = {
    login:"/api/auth/login", register:"/api/auth/register", currentUser:"/api/auth/me", profile:"/api/profile",
    articles:"/api/articles?page=1&page_size=20", article:"/api/articles/{slug}", groups:"/api/groups",
    group:"/api/groups/{slug}", groupPosts:"/api/groups/{id}/posts", ...(backend.endpoints || {}),
  };
  const route = (name, values = {}) => Object.entries(values).reduce((url, [key, value]) => url.replace(`{${key}}`, encodeURIComponent(value)), endpoints[name]);
  const api = async (path, options = {}) => {
    const token = localStorage.getItem(tokenKey);
    const authScheme = backend.authScheme === undefined ? "Bearer" : backend.authScheme;
    const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(token && authScheme ? { Authorization: `${authScheme} ${token}` } : {}), ...(options.headers || {}) };
    const response = await fetch(`${apiBase}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || `درخواست انجام نشد (${response.status})`);
    return data;
  };
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);

  // Persist visual preferences.
  try {
    document.documentElement.dataset.theme = localStorage.getItem("gc_theme") === "y2k" ? "y2k" : "aero";
    if (localStorage.getItem("gc_dark") === "1") document.documentElement.classList.add("theme-dark");
  } catch {}
  document.querySelectorAll("[data-theme-btn]").forEach(button => button.addEventListener("click", () => {
    const theme = button.dataset.themeBtn === "y2k" ? "y2k" : "aero";
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("gc_theme", theme); } catch {}
  }));
  document.querySelector("[data-dark-btn]")?.addEventListener("click", () => {
    document.documentElement.classList.toggle("theme-dark");
    try { localStorage.setItem("gc_dark", document.documentElement.classList.contains("theme-dark") ? "1" : "0"); } catch {}
  });
  document.querySelectorAll("[data-sign-out]").forEach(button => button.addEventListener("click", () => { localStorage.removeItem(tokenKey); location.href = "/login.html"; }));
  document.addEventListener("click", async event => {
    const menu = document.querySelector(".account-dropdown");
    if (menu && !menu.contains(event.target)) menu.open = false;
  });
  const syncAccount = async () => {
    const token = localStorage.getItem(tokenKey);
    if (!token) return;
    try {
      const user = (backend.user || (value => value))(await api(route("currentUser")));
      document.querySelectorAll("[data-account-link],[data-footer-account]").forEach(node => node.hidden = false);
      document.querySelectorAll("[data-login-link],[data-footer-login]").forEach(node => node.hidden = true);
      if (user.is_admin) document.querySelectorAll("[data-account-admin]").forEach(node => node.hidden = false);
    } catch { localStorage.removeItem(tokenKey); }
  };
  void syncAccount();

  // Login and open registration.
  const authForm = document.getElementById("auth-form");
  if (authForm) {
    let signup = false;
    const setSignup = value => {
      signup = value;
      document.getElementById("auth-heading").textContent = signup ? "ساخت حساب گیم‌کلاب" : "ورود";
      document.getElementById("auth-description").textContent = signup ? "حساب بسازید و به گفتگوهای گروه‌ها بپیوندید." : "به جمع بازیکن‌ها برگردید و گفتگو را ادامه دهید.";
      for (const id of ["display-name-field","email-field","confirm-field"]) document.getElementById(id).hidden = !signup;
      document.getElementById("display-name").required = signup;
      document.getElementById("email").required = signup;
      document.getElementById("confirm-password").required = signup;
      document.getElementById("login-tab").setAttribute("aria-selected", String(!signup));
      document.getElementById("signup-tab").setAttribute("aria-selected", String(signup));
      authForm.querySelector("[type=submit]").textContent = signup ? "ساخت حساب" : "ورود";
    };
    document.getElementById("login-tab").addEventListener("click", () => setSignup(false));
    document.getElementById("signup-tab").addEventListener("click", () => setSignup(true));
    authForm.addEventListener("submit", async event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(authForm));
      const notice = document.getElementById("login-msg");
      try {
        if (signup && values.password !== values.confirm_password) throw new Error("رمز عبور و تکرار آن یکسان نیستند.");
        const payload = signup ? (backend.registerPayload || (v => v))(values) : (backend.loginPayload || (v => v))(values);
        const result = await api(route(signup ? "register" : "login"), { method:"POST", body:JSON.stringify(payload) });
        const accessToken = (backend.accessToken || (data => data.access_token ?? data.token))(result);
        if (!accessToken) throw new Error("پاسخ ورود، نشانه دسترسی ندارد. تنظیم backend-config.js را بررسی کنید.");
        localStorage.setItem(tokenKey, accessToken);
        notice.textContent = signup ? "حساب ساخته شد؛ خوش آمدید!" : "ورود موفق؛ خوش آمدید!";
        const requested = new URLSearchParams(location.search).get("next") || "/";
        setTimeout(() => location.href = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/", 350);
      } catch (error) { notice.textContent = error.message || "درخواست انجام نشد."; }
    });
  }

  // Article and group indexes.
  const loadArticles = async container => {
    const result = await api(route("articles"));
    const articles = (backend.articleList || (data => Array.isArray(data) ? data : (data.items || [])))(result).map(item => (backend.article || (value => value))(item)).slice(0, Number(container.dataset.limit || 20));
    container.innerHTML = articles.length ? articles.map(article => `<a class="compact-article" href="/article.html?slug=${encodeURIComponent(article.slug)}"><div class="data-card">${article.image ? `<img src="${esc(article.image)}" alt="" loading="lazy">` : ""}<span class="chip">${esc(article.category || "مطلب")}</span><h2>${esc(article.title)}</h2><p>${esc(article.excerpt || "")}</p><small>${esc(article.author || "تحریریه")}</small></div></a>`).join("") : '<p class="empty">هنوز مطلبی منتشر نشده است.</p>';
  };
  document.querySelectorAll("[data-articles]").forEach(container => loadArticles(container).catch(error => container.innerHTML = `<p class="empty">${esc(error.message)}</p>`));
  const loadGroups = async container => {
    const groups = (backend.groupList || (data => Array.isArray(data) ? data : (data.items || [])))(await api(route("groups"))).map(item => (backend.group || (value => value))(item));
    container.innerHTML = groups.length ? groups.map(group => `<a class="latest-post-card data-card" href="/group.html?slug=${encodeURIComponent(group.slug)}"><span class="directory-symbol">${esc(group.icon || "◎")}</span><h2>${esc(group.name)}</h2><p>${esc(group.description || "")}</p><div class="latest-post-footer">${group.member_count} عضو · ${group.topic_count} گفتگو</div></a>`).join("") : '<p class="empty">هنوز گروهی ساخته نشده است.</p>';
  };
  document.querySelectorAll("[data-groups]").forEach(container => loadGroups(container).catch(error => container.innerHTML = `<p class="empty">${esc(error.message)}</p>`));

  const params = new URLSearchParams(location.search);
  const articleRoot = document.getElementById("article-content");
  if (articleRoot) api(route("article", { slug:params.get("slug") || "" })).then(raw => { const a=(backend.article || (value => value))(raw); articleRoot.innerHTML = `<span class="chip">${esc(a.category || "مطلب")}</span><h1>${esc(a.title)}</h1><p class="muted">${esc(a.author || "تحریریه")} · ${esc(a.time || "")}</p>${a.image ? `<img src="${esc(a.image)}" alt="" style="max-width:100%;border-radius:16px">` : ""}<div class="glass-card data-card"><p>${esc(a.excerpt || "")}</p><div class="markdown-content">${esc(a.body || "").replace(/\n/g,"<br>")}</div></div>`; }).catch(e => articleRoot.innerHTML = `<p>${esc(e.message)}</p>`);
  const groupRoot = document.getElementById("group-content");
  if (groupRoot) api(route("group", { slug:params.get("slug") || "" })).then(raw => { const g=(backend.group || (value => value))(raw); groupRoot.innerHTML = `<div class="section-heading"><div><span class="section-kicker">انجمن بازیکن‌ها</span><h1>${esc(g.name)}</h1></div></div><p>${esc(g.description || "")}</p><p>${g.member_count} عضو · ${g.topic_count} گفتگو</p><div id="posts" class="data-grid"></div>`; return api(route("groupPosts", { id:g.id })); }).then(rawPosts => { const posts=Array.isArray(rawPosts)?rawPosts:(rawPosts.items||rawPosts.results||[]); const node=document.getElementById("posts"); if(node) node.innerHTML=posts.length?posts.map(raw=>{const p=(backend.post || (value => value))(raw);return `<article class="glass-card data-card"><h2>${esc(p.title)}</h2><p>${esc(p.body)}</p><small>${esc(p.user)} · ${esc(p.age)}</small></article>`}).join(""):'<p>هنوز پستی نیست.</p>'; }).catch(e => groupRoot.innerHTML = `<p>${esc(e.message)}</p>`);
  const community = document.getElementById("community-content");
  if (community && localStorage.getItem(tokenKey)) api(route("profile")).then(raw => { const user=(backend.user || (value => value))(raw); community.innerHTML=`<div class="glass-card data-card"><h2>${esc(user.display_name)}</h2><p dir="ltr">@${esc(user.username)}</p><p>${esc(user.bio || "")}</p><a class="btn btn-ghost" href="/account.html">راهنمای حساب</a></div>`; }).catch(e => community.insertAdjacentHTML("beforeend", `<p>${esc(e.message)}</p>`));
})();
