# Decision log

This document records the main technical and product decisions for LevelUP, and the reasons behind them. New decisions are added as the project evolves.

_Last updated: 2026-10-27_

---

## Product

### MVP scope
**Decision:** The first version includes four modules: gym, body weight, finance and dashboard.

**Why:** These are the features that will be used daily. A smaller, working MVP is more valuable than a large, unfinished one.

**Out of scope for the MVP:** habits, sleep and water tracking, body measurements and progress photos, personal records, rest timer, advanced statistics, CSV export, goals and projects, unified calendar, reports, AI assistant, Apple Health and notifications. Some may be reconsidered after the MVP, based on real usage.

### Gym module
- **No pre-built exercise library.** Exercises are created automatically the first time the user types a new name, with autocomplete afterwards.
- **Each exercise has a load type:** *weighted* (weight required) or *bodyweight* (weight optional, counted as extra load).
- **Routines store target sets and an optional rep range.** Starting a workout from a routine pre-fills the sets, which reduces taps at the gym.
- **Workouts can deviate from the routine.** Exercises can be added or skipped without changing the routine.
- **The previous session's values are shown next to each exercise** during a workout.
- **Activity heatmap** (GitHub-style) shows training days.
- **Development order:** the gym module is built first because it will be used the most.

### Finance module
- **Manual entry only.** No bank integrations.
- **Fixed monthly budget**, overall and per category, applied every month until changed.
- **Subscriptions, version A:** a list with amount, billing cycle and next payment date. **Version B** (automatically creating expenses on the billing date) is planned after the MVP.
- **Currency:** EUR only.

### Interface language
**Decision:** The app interface is in European Portuguese (pt-PT). Code, comments and documentation are written in English.

---

## Design

### Visual identity: "Graphite"
**Decision:** A monochrome, restrained style. The accent colour is used only for data.

**Why:** Graphite was chosen from three explored directions. Its restraint keeps the focus on the data and matches the project's references: Revolut's simplicity and Notion's understated style. Keeping the accent colour for data only makes the numbers stand out.

- **Themes:** light and dark, switching automatically with the system setting (`prefers-color-scheme`). The theme follows the iPhone's setting, and dark mode is comfortable at night and at the gym.
- **Typography:** Instrument Sans (Google Fonts), with tabular numbers (`font-variant-numeric: tabular-nums`), so values keep the same width when they update.
- **Corner radius:** cards 16px, buttons 12px.
- **Status colours:** a muted red only for warnings and errors, and a muted green only for confirmations. Exact values are defined during implementation, with approval.

| Token | Dark theme | Light theme |
|---|---|---|
| Background | `#0B0C0E` | `#F4F4F3` |
| Surface | `#141518` | `#FFFFFF` |
| Border | `#24262B` | `#E3E3E1` |
| Text | `#ECEDEF` | `#121314` |
| Secondary text | `#8B8F98` | `#61646A` |
| Primary action | `#ECEDEF` | `#121314` |
| Primary action text | `#0B0C0E` | `#FFFFFF` |
| Data accent | `#8FB0DD` | `#1F3A5F` |
| Heatmap scale (lowest to highest activity) | `#1C1E22`, `#26354B`, `#3E5F8C`, `#8FB0DD` | `#EBEBE9`, `#C4CFDE`, `#6F89AE`, `#1F3A5F` |

### Navigation
- **Mobile:** a bottom tab bar with four tabs: Home ("Início"), Workout ("Treino"), Weight ("Peso") and Finance ("Finanças"). They cover the MVP modules.
- **Desktop:** the same four items in a sidebar.
- **Settings and account** are reached through the avatar on Home, not through a tab. They are rarely used and do not justify a tab.
- **The active workout is full screen**, without the tab bar. The workout duration and the "Finish" ("Terminar") button are always visible. This keeps the focus on the workout, allows larger buttons and prevents switching tabs by accident in the middle of a set.
- **No central "+" button** in the tab bar. Quick actions (start workout, log weight, add expense) live on Home, and each tab has its own add button. This keeps the bar cleaner and consistent with the restrained style, and Home is the first screen when the app opens. This may be revisited after the MVP.

---

## Architecture

### Frontend talks directly to Supabase (no custom backend)
**Decision:** A React single-page app communicates directly with Supabase (PostgreSQL, Auth). There is no custom server.

**Why:** Less code, lower cost and less to maintain. Security is enforced inside the database by Row Level Security (RLS), not by the frontend.

**Trade-off:** RLS policies must be correct and tested. Server-side logic, if ever needed (secret API keys, scheduled tasks), will use Supabase Edge Functions.

### Multi-user from day one
**Decision:** Every table has a `user_id` column and RLS policies, even if there is only one user at first.

**Why:** Friends may use the app. Designing for multiple users from the start avoids a rewrite later.

### Open registration
**Decision:** Anyone can sign up, with email confirmation.

**Open question:** Supabase's built-in email service only delivers to project team members and has a very low rate limit. Before real users sign up, either Google sign-in or a custom SMTP provider is required. To be decided in Phase 3.

---

## Frontend

| Area | Choice | Reason |
|---|---|---|
| Framework | React + TypeScript + Vite | Familiar, fast, strongly typed |
| Styling | Tailwind CSS v4 + shadcn/ui | Consistent design system; components live in the codebase and can be customised |
| Routing | React Router | Standard routing solution |
| Server state | TanStack Query | Handles loading, errors, caching and refetching consistently |
| Forms | React Hook Form + Zod | Performant forms with schema validation |
| Charts | Recharts | Simple, composable React charts |
| Heatmap | Custom CSS | No extra dependency needed |

### TypeScript pinned to 6.0
**Decision:** TypeScript is pinned to `~6.0.3` instead of 7.

**Why:** `typescript-eslint` does not support TypeScript 7 yet, and installation fails with a peer dependency conflict. Upgrade once `typescript-eslint` adds support.

### ESLint instead of Oxlint
**Decision:** ESLint is used as the linter.

**Why:** It is the industry standard, with wide documentation and plugin support. Oxlint's speed advantage is not significant at this project's size.

### Installable on iPhone (no App Store)
**Decision:** A web app manifest and icon allow installation through Safari's "Add to Home Screen". No native app.

**Why:** Free, no App Store account required, and the app opens full screen like a native app.

### Offline handling
**Decision:** The in-progress workout is persisted on the device and synced when finished. Full offline support is out of scope.

**Why:** Gyms often have poor connectivity, and losing logged sets is unacceptable. Full offline sync is significantly more complex.

---

## Data

- **`user_id` on every table**, so RLS policies are simple, fast and easy to test.
- **Derived data is not stored.** "Last session" values, the heatmap and totals are calculated from existing data.
- **Archive instead of delete** when historical records reference an item (categories, exercises, routines).
- **Money uses `numeric(12,2)`**, never floating point.
- **Timestamps use `timestamptz`.** Daily grouping uses the user's local day.
- **One body weight entry per day.** A second entry on the same day replaces the first.

### Main tables
- **Account:** `profiles`
- **Gym:** `exercises`, `routines`, `routine_exercises`, `workouts`, `workout_exercises`, `workout_sets`
- **Body weight:** `body_weights`
- **Finance:** `categories`, `transactions`, `budgets`, `subscriptions`

---

## Environments and tooling

### Two Supabase projects, no Docker
**Decision:** One Supabase cloud project for development and testing, one for production. No local Supabase.

**Why:** Running Supabase locally requires Docker, which adds setup complexity on Windows. The free plan allows two active projects. Database changes are kept as versioned SQL migrations in the repository.

### Testing strategy
- **Unit tests (Vitest):** business logic such as money calculations, budgets, subscription totals and date grouping.
- **Component tests (React Testing Library):** critical interactions only, such as set logging and form validation.
- **Security tests:** RLS isolation between users. Mandatory.
- **End-to-end tests (Playwright):** two or three key flows, added before the MVP is considered complete.

### Continuous integration
GitHub Actions runs lint and build on every push to `main` and on pull requests.

### Repository conventions
- **Public repository**, MIT license.
- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/), written in English.
- **Line endings** are normalised to LF via `.gitattributes`.
- **Secrets** never enter the repository: `.env` files are ignored, and `.env.example` lists variable names only.
- **The Supabase secret / service role key is never used in the frontend.**

---

## AI-assisted development

### Claude Code for implementation
**Decision:** Claude Code (VS Code extension) is used to implement the project. Product and design decisions are discussed beforehand and recorded in this document.

The project's working rules for Claude Code live in `CLAUDE.md`.

### Manual permissions
**Decision:** The default permission mode is manual (`defaultMode: "default"`), set in `.claude/settings.json`. Reading and editing `.env`, `.env.local` and `.env.*.local` are denied.

**Why:** Every change needs explicit approval, and local secrets are never exposed to the AI.

### Project skills
Skills live in `.claude/skills/` and are pinned in `skills-lock.json`.

| Skill | Source | Use |
|---|---|---|
| impeccable | `pbakaus/impeccable` | Typography, colour, spacing and layout |
| emil-design-eng | `emilkowalski/skills` | Animation and interaction polish |
| mobile-native | `emilkowalski/skills` | Native-feeling behaviour on iPhone |
| review-animations | `emilkowalski/skills` | Animation review, manual invocation only (`/review-animations`) |

**Evaluated and not installed:**
- **Taste skill:** focused on landing pages, and instructs the agent not to ask for approval, which conflicts with the project's working rules.
- **Other skills from `emilkowalski/skills`:** they overlap with the installed skills or are specific to native apps.

### Playwright MCP
**Decision:** The Playwright MCP server is configured in `.mcp.json`, pinned to `@playwright/mcp@0.0.83`, and runs Playwright's Chromium in isolated mode.

**Note:** The configuration uses a `cmd /c` wrapper, which only works on Windows. On other systems, the configuration must be adjusted.

### No Figma
**Decision:** Figma is not used. Design is done directly in code.

---

## Deployment and costs

### Early deploy
**Decision:** The app is deployed to Vercel right after the gym module (Phase 5), before the remaining modules are built.

**Why:** Real daily use surfaces problems early, while they are still easy to fix.

**Requirement:** A backup strategy must be in place before the first deploy, because the Supabase free plan does not include automatic backups.

### Costs
The MVP runs on free tiers: GitHub, Supabase Free and Vercel Hobby (personal, non-commercial use).

**Known limits:**
- Free Supabase projects pause after a week of inactivity.
- No automatic backups on the free plan.
- Built-in email delivery is restricted (see *Open registration*).

**Optional costs:** custom domain.

---

## Open questions

| Question | When |
|---|---|
| Email delivery: Google sign-in or custom SMTP | Phase 3 |
| Backup strategy | Before Phase 5 |
| Custom domain | Phase 5 (optional) |