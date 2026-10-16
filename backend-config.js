/*
 * Backend connection adapter for the website.
 * Edit this file to point the browser at the developer's API or map API paths.
 * Server-side Astro requests use GAMECLUB_BACKEND_URL instead.
 */
(function () {
  const config = {
    // Empty means same-origin. Use the API origin if browser requests are cross-origin.
    apiBase: "",
    authScheme: "Bearer",
    credentials: "same-origin",
    tokenKey: "gc_token",

    // Keep the site's current API routes by default. Return a rewritten pathname
    // here if the receiving backend uses different paths.
    rewritePath(pathname) {
      return pathname;
    },

    // Override if the receiving API expects different login/register fields.
    loginPayload(values) {
      return { username: values.username, password: values.password };
    },
    registerPayload(values) {
      return {
        username: values.username,
        password: values.password,
        display_name: values.display_name,
        email: values.email,
      };
    },
    accessToken(data) {
      return data.access_token ?? data.accessToken ?? data.token;
    },
  };

  const apiBase = config.apiBase.replace(/\/$/, "");
  const nativeFetch = window.fetch.bind(window);
  config.url = function (input) {
    const value = input instanceof Request ? input.url : String(input);
    const url = new URL(value, window.location.href);
    if (url.origin !== window.location.origin || !/^\/(api|media)(\/|$)/.test(url.pathname)) return value;
    const rewritten = config.rewritePath(url.pathname);
    return `${apiBase}${rewritten}${url.search}${url.hash}`;
  };
  window.GAMECLUB_BACKEND = config;

  // Existing page scripts use relative /api and /media paths. Route those
  // through this adapter so the exported site can use a separate API origin.
  window.fetch = function (input, init) {
    const target = config.url(input);
    const options = { ...(init || {}), credentials: config.credentials };
    if (options.headers && config.authScheme !== "Bearer") {
      const headers = new Headers(options.headers);
      const authorization = headers.get("Authorization");
      if (authorization && authorization.startsWith("Bearer ")) {
        if (config.authScheme) headers.set("Authorization", `${config.authScheme} ${authorization.slice(7)}`);
        else headers.delete("Authorization");
      }
      options.headers = headers;
    }
    return nativeFetch(target, options);
  };
})();
