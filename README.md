# LevelUP

A personal life dashboard to track gym workouts, body weight and personal finances in one place. Mobile-first, designed to be used every day on an iPhone.

[![CI](https://github.com/Canicoop/levelup/actions/workflows/ci.yml/badge.svg)](https://github.com/Canicoop/levelup/actions/workflows/ci.yml)

> **Status:** 🚧 In development. Phases 1 (repository and environment) and 2 (visual foundation and navigation) are complete. The app has its visual identity, mobile baseline and navigation, a Home screen with a greeting, quick actions and a card per module, shared loading, empty and error states, and an icon and web manifest, so it can be added to the iPhone home screen. The module pages are still empty. Next: Phase 3 (Supabase, authentication and security).

## Planned features (MVP)

### Gym
- Workout routines with target sets and optional rep ranges
- Workout logging (sets, reps, weight), pre-filled from the selected routine
- Previous session's values shown next to each exercise
- Workout history by day
- GitHub-style activity heatmap
- In-progress workouts saved on the device, so a lost connection never loses data

### Body weight
- Daily weight log with a progress chart

### Finance
- Income and expense tracking with custom categories
- Fixed monthly budget (overall and per category)
- Spending by category chart
- Subscription tracking

### Dashboard
- Overview of all modules using real data

### Platform
- Multi-user, with each user's data isolated by Row Level Security
- Installable on iPhone through Safari ("Add to Home Screen")

## Tech stack

| Area | Technology | Status |
|---|---|---|
| Frontend | React 19, TypeScript 6, Vite 8 | ✅ In use |
| Linting | ESLint with typescript-eslint | ✅ In use |
| CI | GitHub Actions | ✅ In use |
| UI | Tailwind CSS v4, shadcn/ui | ✅ In use |
| Routing | React Router 8 | ✅ In use |
| Data fetching | TanStack Query | Planned |
| Forms | React Hook Form, Zod | Planned |
| Charts | Recharts | Planned |
| Backend | Supabase (PostgreSQL, Auth, Row Level Security) | Planned |
| Testing | Vitest, React Testing Library, Playwright | Planned |
| Hosting | Vercel | Planned |

## Getting started

### Prerequisites
- [Node.js](https://nodejs.org/) 24 (LTS)
- npm
- Git

### Run locally

```bash
git clone https://github.com/Canicoop/levelup.git
cd levelup
npm install
cp .env.example .env.local
npm run dev
```

Then open http://localhost:5173.

> Environment variables are not required yet. They will be needed once Supabase is added (Phase 3). Fill in `.env.local` with your own values and **never commit it**.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build locally |

## Roadmap

- [x] **Phase 0** — Planning, MVP and architecture
- [x] **Phase 1** — Repository, development environment and CI
- [x] **Phase 2** — Visual foundation and navigation
- [ ] **Phase 3** — Supabase, authentication and security
- [ ] **Phase 4** — Gym module
- [ ] **Phase 5** — First production deploy
- [ ] **Phase 6** — Body weight module
- [ ] **Phase 7** — Finance module
- [ ] **Phase 8** — Dashboard
- [ ] **Phase 9** — Quality, testing and polish

## Documentation

- [Decision log](docs/decisions.md) — what was decided and why

## License

[MIT](LICENSE)