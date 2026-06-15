const AUTH_API_BASE = "/api/v1/auth";
const PASSR_API_BASE = "/api/v1/passr";
const COMMENTS_API_BASE = "/api/v1/comments";

const ACCESS_TOKEN_KEY = "passr_access_token";
const REFRESH_TOKEN_KEY = "passr_refresh_token";
const USER_KEY = "passr_user";

function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setStoredUser(user) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function storeAuthSession({ user, tokens }) {
  setStoredUser(user);
  if (tokens?.access?.token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access.token);
  }
  if (tokens?.refresh?.token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh.token);
  }
}

function clearAuthSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function isPassrSuperAdmin(user) {
  return Boolean(user?.isPassrSuperAdmin);
}

async function parseJsonResponse(response) {
  if (response.status === 204) {
    return {};
  }

  let data = {};
  try {
    data = await response.json();
  } catch (_) {
    data = {};
  }
  return data;
}

function authHeaders(extra = {}) {
  const headers = { ...extra };
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function authRequest(path, options = {}) {
  const response = await fetch(`${AUTH_API_BASE}${path}`, {
    ...options,
    headers: authHeaders({
      "Content-Type": "application/json",
      ...(options.headers || {}),
    }),
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }
  return data;
}

async function passrRequest(path, body, options = {}) {
  const method = options.method || "POST";
  const response = await fetch(`${PASSR_API_BASE}${path}`, {
    method,
    headers: authHeaders({
      "Content-Type": "application/json",
      ...(options.headers || {}),
    }),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }
  return data;
}

async function apiGet(base, path) {
  const response = await fetch(`${base}${path}`, {
    headers: authHeaders(),
  });

  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }
  return data;
}

async function apiSend(base, path, body, options = {}) {
  const method = options.method || "POST";
  const response = await fetch(`${base}${path}`, {
    method,
    headers: authHeaders({
      "Content-Type": "application/json",
      ...(options.headers || {}),
    }),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }
  return data;
}

async function loginUser({ email, password }) {
  const result = await authRequest("/login", {
    method: "POST",
    body: { email, password },
  });
  storeAuthSession(result);
  return result.user;
}

async function registerUser({ name, email, password }) {
  const result = await authRequest("/register", {
    method: "POST",
    body: { name, email, password },
  });
  storeAuthSession(result);
  return result.user;
}

async function logoutUser() {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await authRequest("/logout", {
        method: "POST",
        body: { refreshToken },
      });
    }
  } finally {
    clearAuthSession();
  }
}

async function getCurrentUser() {
  const user = await authRequest("/me", { method: "GET" });
  setStoredUser(user);
  return user;
}

function subscribeToPassr(email) {
  return passrRequest("/subscribe", { email });
}

function sendPassrContact({ name, email, message }) {
  return passrRequest("/contact", { name, email, message });
}

function getComments(articleSlug) {
  return apiGet(COMMENTS_API_BASE, `/${encodeURIComponent(articleSlug)}`);
}

function postComment(payload) {
  return apiSend(COMMENTS_API_BASE, "/", payload);
}

function getPassrPublicProfile(userId) {
  return apiGet(AUTH_API_BASE, `/profile/${encodeURIComponent(userId)}`);
}

async function updatePassrProfile(payload) {
  const user = await authRequest("/profile", {
    method: "PATCH",
    body: payload,
  });
  setStoredUser(user);
  return user;
}

function adminSearchUsers(query, limit = 8) {
  const params = new URLSearchParams({ search: query, limit: String(limit) });
  return apiGet(AUTH_API_BASE, `/admin/users?${params.toString()}`);
}

function adminCreateUser(payload) {
  return authRequest("/admin/users", {
    method: "POST",
    body: payload,
  });
}

function updateCommentAdmin(commentId, payload) {
  return apiSend(COMMENTS_API_BASE, `/${encodeURIComponent(commentId)}`, payload, { method: "PATCH" });
}

async function deleteCommentAdmin(commentId) {
  await apiSend(COMMENTS_API_BASE, `/${encodeURIComponent(commentId)}`, undefined, { method: "DELETE" });
}
