// Thin fetch wrapper over the FastAPI backend — the JS equivalent of
// dashboard/common.py's api_get/api_post/authed pattern, so every page
// talks to the API the same way instead of hand-rolling fetch() calls.

const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export function getApiBase() {
  return localStorage.getItem("nextskill_api_base") || DEFAULT_API_BASE;
}

export function setApiBase(base) {
  localStorage.setItem("nextskill_api_base", base);
}

export function getToken() {
  return localStorage.getItem("nextskill_token");
}

export function setToken(token) {
  if (token) localStorage.setItem("nextskill_token", token);
  else localStorage.removeItem("nextskill_token");
}

function authHeaders(authed) {
  if (!authed) return {};
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(method, path, { json, authed = false, params } = {}) {
  const url = new URL(path, getApiBase());
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }

  const response = await fetch(url, {
    method,
    headers: {
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...authHeaders(authed),
    },
    body: json ? JSON.stringify(json) : undefined,
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    // No JSON body (e.g. a 204) — fine, callers that need one will notice via ok/status.
  }

  return { ok: response.ok, status: response.status, data: body };
}

export const apiGet = (path, opts) => request("GET", path, opts);
export const apiPost = (path, json, opts = {}) => request("POST", path, { ...opts, json });
export const apiPut = (path, json, opts = {}) => request("PUT", path, { ...opts, json, authed: opts.authed ?? true });
export const apiDelete = (path, opts = {}) => request("DELETE", path, { ...opts, authed: opts.authed ?? true });
