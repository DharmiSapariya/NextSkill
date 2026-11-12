# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Browser regression tests

From this directory, run:

```sh
npm ci
npx playwright install chromium
npm run test:e2e
```

The test command builds and serves the production frontend on port 4173. The
mobile navigation tests cover keyboard focus, dismissal, links and desktop
resize. They run independently of the backend.

## Workspace route loading

Workspace and shared-report pages load on demand. The workspace shell and
authentication checks load with the application. A page-level loading state
keeps navigation available while a chunk downloads. If a chunk fails, choose
another workspace page or use **Reload page** to retry the import in a fresh
document. Companies has separate retries for its list and top-company cards.

Run only the workspace performance browser tests with
`npm run test:e2e -- tests/workspace-performance.spec.js`.
