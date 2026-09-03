const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const TOKEN_KEY = "nextskill_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function request(path, { method = "GET", body, auth = true, isFormData = false } = {}) {
  const headers = {};
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  let payload = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const detail = payload?.detail || payload?.message || res.statusText;
    throw new ApiError(typeof detail === "string" ? detail : JSON.stringify(detail), res.status, payload);
  }

  return payload;
}

// --- Auth ---
export const signup = (email, password) => request("/auth/signup", { method: "POST", body: { email, password }, auth: false });
export const login = (email, password) => request("/auth/login", { method: "POST", body: { email, password }, auth: false });
export const refreshToken = () => request("/auth/refresh", { method: "POST" });
export const getMe = () => request("/auth/me");
export const updateMySkills = (skills) => request("/auth/me/skills", { method: "PUT", body: { skills } });
export const changePassword = (current_password, new_password) =>
  request("/auth/me/password", { method: "PUT", body: { current_password, new_password } });
export const deleteAccount = (password) => request("/auth/me", { method: "DELETE", body: { password } });
export const uploadResume = (file) => {
  const form = new FormData();
  form.append("file", file);
  return request("/auth/me/resume", { method: "POST", body: form, isFormData: true });
};

// --- History ---
export const getHistory = (params = {}) => request(`/auth/me/history?${new URLSearchParams(params)}`);
export const getHistoryProgress = (target_role) =>
  request(`/auth/me/history/progress?${new URLSearchParams({ target_role })}`);
export const getDigest = () => request("/auth/me/digest");
export const shareHistoryEntry = (historyId) => request(`/auth/me/history/${historyId}/share`, { method: "POST" });
export const getMySharedReports = (params = {}) => request(`/auth/me/shared-reports?${new URLSearchParams(params)}`);
export const revokeSharedReport = (token) => request(`/auth/me/history/shared/${token}`, { method: "DELETE" });
export const getSharedReport = (token) => request(`/reports/${token}`, { auth: false });

// --- Recommend / match / salary ---
export const recommend = (target_role, skills) => request("/recommend", { method: "POST", body: { target_role, skills } });
export const recommendWithEvidence = (target_role, skills) =>
  request("/recommend/evidence", { method: "POST", body: { target_role, skills } });
export const getMatchScore = (target_role, skills) => request("/match-score", { method: "POST", body: { target_role, skills } });
export const predictSalary = (target_role, skills) => request("/predict-salary", { method: "POST", body: { target_role, skills } });

// --- Roles ---
export const getTransitionGraph = () => request("/roles/transition-graph", { auth: false });
export const getNearestRoles = (role, limit = 5) =>
  request(`/roles/${encodeURIComponent(role)}/nearest?${new URLSearchParams({ limit })}`, { auth: false });

// --- Jobs ---
export const getJobs = (params = {}) => request(`/jobs?${new URLSearchParams(params)}`, { auth: false });
export const getJob = (jobId) => request(`/jobs/${jobId}`, { auth: false });
export const saveJob = (jobId) => request(`/jobs/${jobId}/save`, { method: "POST" });
export const unsaveJob = (jobId) => request(`/jobs/${jobId}/save`, { method: "DELETE" });
export const getSavedJobs = (params = {}) => request(`/auth/me/saved-jobs?${new URLSearchParams(params)}`);
export const getJobMatch = (jobId) => request(`/jobs/${jobId}/match`);

// --- Companies ---
export const getTopCompanies = (limit = 10) => request(`/companies/top?${new URLSearchParams({ limit })}`, { auth: false });
export const getCompanies = (params = {}) => request(`/companies?${new URLSearchParams(params)}`, { auth: false });

// --- Trends / skills ---
export const getSkillTrend = (skillName) => request(`/trends/${encodeURIComponent(skillName)}`, { auth: false });
export const getSkills = (params = {}) => request(`/skills?${new URLSearchParams(params)}`, { auth: false });
export const getRelatedSkills = (skillName, limit = 10) =>
  request(`/skills/${encodeURIComponent(skillName)}/related?${new URLSearchParams({ limit })}`, { auth: false });
export const getSkillCoOccurrenceGraph = (limit) =>
  request(`/skills/co-occurrence-graph${limit ? `?${new URLSearchParams({ limit })}` : ""}`, { auth: false });

// --- Admin ---
export const getAdminStats = () => request("/admin/stats");
export const getAdminUsers = (params = {}) => request(`/admin/users?${new URLSearchParams(params)}`);
export const updateAdminUser = (userId, body) => request(`/admin/users/${userId}`, { method: "PUT", body });
export const deleteAdminUser = (userId) => request(`/admin/users/${userId}`, { method: "DELETE" });
