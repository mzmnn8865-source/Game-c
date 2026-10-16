/*
 * Backend integration layer.
 * Edit this file to match the receiving developer's API. No HTML changes are
 * needed when only URLs, field names, or token conventions differ.
 */
window.GAMECLUB_BACKEND = {
  // Empty means the API is on this same origin behind a reverse proxy.
  // For a separate API host, set e.g. "https://api.example.com".
  apiBase: "",
  tokenKey: "gc_token",
  authScheme: "Bearer",

  endpoints: {
    login: "/api/auth/login",
    register: "/api/auth/register",
    currentUser: "/api/auth/me",
    profile: "/api/profile",
    articles: "/api/articles?page=1&page_size=20",
    article: "/api/articles/{slug}",
    groups: "/api/groups",
    group: "/api/groups/{slug}",
    groupPosts: "/api/groups/{id}/posts",
  },

  // Adjust request payload shape here if the backend uses different names.
  loginPayload: ({ username, password }) => ({ username, password }),
  registerPayload: ({ username, password, display_name, email }) => ({ username, password, display_name, email }),

  // Normalizers let APIs return different names/shapes while keeping the UI.
  accessToken: data => data.access_token ?? data.token ?? data.accessToken,
  articleList: data => Array.isArray(data) ? data : (data.items ?? data.results ?? data.data ?? []),
  groupList: data => Array.isArray(data) ? data : (data.items ?? data.results ?? data.data ?? []),
  article: item => ({
    slug: item.slug ?? item.id,
    title: item.title ?? item.name,
    excerpt: item.excerpt ?? item.summary ?? item.description ?? "",
    category: item.category?.name ?? item.category ?? "",
    author: item.author?.name ?? item.author ?? "",
    time: item.time ?? item.published_at ?? item.created_at ?? "",
    image: item.image ?? item.cover_image ?? "",
    body: item.body ?? item.content ?? "",
  }),
  group: item => ({
    id: item.id,
    slug: item.slug ?? item.id,
    name: item.name ?? item.title,
    description: item.description ?? "",
    icon: item.icon ?? "◎",
    member_count: item.member_count ?? item.members_count ?? 0,
    topic_count: item.topic_count ?? item.posts_count ?? 0,
  }),
  user: item => ({
    username: item.username ?? item.handle ?? "",
    display_name: item.display_name ?? item.name ?? item.username ?? "",
    bio: item.bio ?? item.about ?? "",
    is_admin: item.is_admin ?? item.is_staff ?? item.role === "admin",
  }),
  post: item => ({
    title: item.title ?? "",
    body: item.body ?? item.content ?? "",
    user: item.user?.display_name ?? item.user_name ?? item.author?.name ?? "",
    age: item.age ?? item.created_at ?? "",
  }),
};
