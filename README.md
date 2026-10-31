# LevelUP

A personal life dashboard to track gym workouts, body weight and personal finances in one place. Mobile-first, designed to be used every day on an iPhone.

[![CI](https://github.com/Canicoop/levelup/actions/workflows/ci.yml/badge.svg)](https://github.com/Canicoop/levelup/actions/workflows/ci.yml)

> **Status:** 🚧 In development. Phases 1 (repository and environment) and 2 (visual foundation and navigation) are complete. Phase 3 (Supabase, authentication and security) is in progress: users sign in with Google, every page needs a session, and the first table (`weight_entries`) is in place, with Row Level Security, column-level privileges and SQL security tests, managed through versioned migrations. Unit tests run with Vitest, locally and in CI. The app also has its visual identity, navigation, a Home screen with quick actions and a card per module, shared loading, empty and error states, and an icon and web manifest for the iPhone home screen. The module pages are still empty.

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
| Data fetching | TanStack Query | ✅ In use |
| Forms | React Hook Form, Zod | Planned |
| Charts | Recharts | Planned |
| Backend | Supabase (PostgreSQL, Auth, Row Level Security) | ✅ In use |
| Unit tests | Vitest | ✅ In use |
| Component and end-to-end tests | React Testing Library, Playwright | Planned |
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

> Environment variables are required: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, from your own Supabase project. Fill them in `.env.local` and **never commit it**; without them the app stops with an error naming the missing variable. Signing in also needs the Google provider enabled in that project, with `http://localhost:5173/**` in its Redirect URLs.

To create the database tables in your own Supabase project, link it and apply the migrations:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push --linked
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm test` | Run the unit tests in watch mode |
| `npm run test:run` | Run the unit tests once |
| `npm run preview` | Preview the production build locally |
| `npm run icons` | Regenerate the app icons in `public/` from the SVG sources |
| `npm run db:types` | Regenerate the database types from the linked Supabase project (`src/lib/database.types.ts`) |

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