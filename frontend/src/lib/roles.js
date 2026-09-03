// Mirrors backend/role_graph.py's TRACKED_ROLES exactly — kept as a static
// list on the frontend so role inputs (Skill-Gap Report, Match & Salary,
// Role Graph search, Trends) can offer instant autocomplete suggestions
// without a network round trip for a fixed, small (21-role) universe.
export const TRACKED_ROLES = [
  "software engineer", "backend developer", "frontend developer", "full stack developer",
  "data scientist", "data analyst", "data engineer", "machine learning engineer",
  "ai engineer", "devops engineer", "cloud engineer", "site reliability engineer",
  "mobile developer", "android developer", "ios developer", "qa engineer",
  "test automation engineer", "cybersecurity analyst", "database administrator",
  "product manager", "ui ux designer",
];
