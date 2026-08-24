# NextSkill frontend

React + Vite + Tailwind frontend for the NextSkill API. Each feature lives on
its own page/route (see `src/pages/`) — no cramming everything into one view.

## Setup

```bash
npm install
npm run dev
```

By default the app talks to `http://localhost:8000` (the local FastAPI
backend). Override that by copying `.env.example` to `.env` and setting
`VITE_API_BASE_URL`.

## Structure

- `src/App.jsx` — routes, one per feature page
- `src/Layout.jsx` — shared nav shell
- `src/lib/api.js` — fetch wrapper (auth headers, JSON, base URL)
- `src/lib/AuthContext.jsx` — logged-in state, shared across pages
- `src/lib/RequireAuth.jsx` — route guard for pages that need a login (and, for `/admin`, an admin account)
- `src/pages/` — one file per feature, mirrors the backend's endpoint groups

Most pages are currently placeholders pending a design pass — `Landing.jsx`
and `Login.jsx` are the two built out so far.
