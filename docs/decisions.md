# Decision log

This document records the main technical and product decisions for LevelUP, and the reasons behind them. New decisions are added as the project evolves.

_Last updated: 2026-10-29_

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

- **Themes:** light and dark, switching automatically with the system setting (`prefers-color-scheme`). The theme follows the iPhone's setting, and dark mode is comfortable at night and at the gym. There is no manual toggle and no `.dark` class: `src/index.css` redefines Tailwind's `dark:` variant with `@custom-variant dark (@media (prefers-color-scheme: dark))`, so shadcn/ui components follow the system setting too.
- **Typography:** Instrument Sans, self-hosted through the `@fontsource-variable/instrument-sans` package, with tabular numbers (`font-variant-numeric: tabular-nums`), so values keep the same width when they update. The font is bundled with the app instead of loaded from Google Fonts: no third-party requests, and it works on poor gym connections.
- **Corner radius:** cards 16px, buttons 12px.
- **Status colours:** a muted red only for warnings and errors, and a muted green only for confirmations (values in the table below). All pass WCAG AA (at least 4.5:1) as text on both the background and the surface. White text on the dark-theme red is only 2.7:1, so solid red fills use dark text (`--destructive-foreground`) or the tinted style (`bg-destructive/10 text-destructive`).

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
| Neutral fill (muted, secondary, hover) | `#1C1E22` | `#EBEBE9` |
| Focus ring | `#8B8F98` | `#61646A` |
| Error and warning (red) | `#D9827C` | `#A8342D` |
| Confirmation (green) | `#86BFA0` | `#2F6E4E` |

- **Neutral fill:** the palette had no neutral fill for shadcn/ui's `muted`, `secondary` and `accent` roles, so it reuses heatmap level 0 instead of introducing a new colour.
- **Focus ring:** Secondary text at full opacity, 5.4 to 6.0:1 against the background and the surface. shadcn/ui's default 50% opacity gives only 2.1 to 2.3:1, below the 3:1 minimum for focus indicators, so generated components use `ring-ring` instead of `ring-ring/50`. Check this after every `shadcn add`.
- **Skeleton:** loading placeholders use the border colour (`bg-border`), not the neutral fill. On the dark-theme surface the neutral fill (`#1C1E22` on `#141518`) is barely visible.
- **Content width:** the main area is capped at `max-w-4xl` (56rem including padding, 52rem of content), with 1rem side padding on mobile and 2rem from 1024px. It fits three cards in a row next to the sidebar. Pages that need a narrower measure (forms, long text) constrain themselves.

### Navigation
- **Mobile:** a bottom tab bar with four tabs: Home ("Início"), Workout ("Treino"), Weight ("Peso") and Finance ("Finanças"). They cover the MVP modules.
- **Desktop:** the same four items in a sidebar.
- **Settings and account** are reached through the avatar on Home, not through a tab. They are rarely used and do not justify a tab.
- **The active workout is full screen**, without the tab bar. The workout duration and the "Finish" ("Terminar") button are always visible. This keeps the focus on the workout, allows larger buttons and prevents switching tabs by accident in the middle of a set.
- **No central "+" button** in the tab bar. Quick actions (start workout, log weight, add expense) live on Home, and each tab has its own add button. This keeps the bar cleaner and consistent with the restrained style, and Home is the first screen when the app opens. This may be revisited after the MVP.
- **Breakpoint:** the bottom tab bar is shown below 1024px (`lg`) and the sidebar from 1024px. Both render the same list, `src/components/layout/nav-items.ts`, so they cannot drift apart.
- **Icons:** Lucide (`lucide-react`).
- **Active item:** the text colour (`text-foreground`, inactive items use secondary text) and a heavier icon stroke (2.25 instead of 1.75), so the state does not depend on colour alone. In the sidebar, the active item also has the neutral fill as background.
- **Sidebar header:** "LevelUP" as plain text at the top, until there is a logo.
- **No shadcn/ui `Sidebar` component.** The sidebar is a short, fixed list of four links; the component brings collapsing, mobile sheets and state the app does not need.
- **Page header:** `PageHeader` is at least 44px tall (the height of the Home avatar), so the title sits at the same height on every page and does not jump when switching tabs.

### Home
- **Greeting by local time:** "Bom dia" from 06:00, "Boa tarde" from 12:00 and "Boa noite" from 20:00. Below it, the date in European Portuguese (`Intl.DateTimeFormat('pt-PT')`, for example "quinta-feira, 29 de outubro"). No user name until there is login (Phase 3).
- **The greeting is the page heading.** The browser tab still reads "Início". The date sits below the 44px title row, so the heading stays at the same height as on every other page.
- **Kept up to date:** an installed app can stay in memory for hours, so the greeting and the date refresh every minute and when the app returns to the foreground (`useNow`, `src/hooks/use-now.ts`).
- **Quick actions:** three equal tiles ("Iniciar treino", "Registar peso", "Adicionar despesa") with the same icons as the navigation. Icon above the label on phones, beside it from 640px. Neutral surface only: the accent colour is reserved for data. For now they open each module; they will open the action itself once the forms exist.
- **One card per module** (Workout, Weight, Finance), in the navigation order. Until there is data, each card shows an empty state. No placeholder numbers.
- **Only the card title links to the module**, not the whole card: once the cards hold data (heatmap, charts) they will have controls of their own, and interactive elements cannot be nested inside a link.
- **No button in the empty states on Home:** the quick actions above already offer them.
- **Grid:** one column below 1024px, three from 1024px. The cards use the same gap as the quick actions (12px), so their columns line up.
- **Touch targets:** the avatar, quick actions and card titles are at least 44px with any pointer, not only on touch screens.

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
| Routing | React Router 8 (data mode) | Standard routing solution; see below |
| Server state | TanStack Query | Handles loading, errors, caching and refetching consistently |
| Forms | React Hook Form + Zod | Performant forms with schema validation |
| Charts | Recharts | Simple, composable React charts |
| Heatmap | Custom CSS | No extra dependency needed |

### TypeScript pinned to 6.0
**Decision:** TypeScript is pinned to `~6.0.3` instead of 7.

**Why:** `typescript-eslint` does not support TypeScript 7 yet, and installation fails with a peer dependency conflict. Upgrade once `typescript-eslint` adds support.

**Import alias:** `@/` points to `src/`, configured with `paths` only (`"@/*": ["./src/*"]` in `tsconfig.json` and `tsconfig.app.json`) and the matching `resolve.alias` in `vite.config.ts`. `baseUrl` is not used: it is deprecated in TypeScript 6 and removed in 7, although the shadcn/ui setup guide still shows it.

### ESLint instead of Oxlint
**Decision:** ESLint is used as the linter.

**Why:** It is the industry standard, with wide documentation and plugin support. Oxlint's speed advantage is not significant at this project's size.

### React Router 8 in data mode
**Decision:** Routes are defined with `createBrowserRouter` (data mode), not with `<BrowserRouter>` and `<Routes>` (declarative mode).

**Why:** Data mode enables features the app will need:
- **`lazy` per route**, to split each module into its own chunk.
- **`<ScrollRestoration />`**: new pages open at the top, and back and forward restore the previous position.
- **`useBlocker`**, to warn before leaving the active workout (Phase 4).
- **An `ErrorBoundary` per route**, so an error shows an error screen instead of a blank page.

**Lazy loading:** pages are imported eagerly for now. Each one moves to `lazy` once its module has real code; splitting empty pages would only add requests. The exception is the development-only page (see *Development-only page*).

**Package:** React Router 8 has no `react-router-dom` package. Everything is imported from `react-router`, except `RouterProvider`, which comes from `react-router/dom`.

### Route structure
Defined in `src/router.tsx`:
- **A root route with the `ErrorBoundary`** (`RouteError`) and no component of its own. The error screen therefore renders outside the app shell, without navigation, which still works if the shell itself fails.
- **`AppShell`** (sidebar, tab bar, `<ScrollRestoration />`) wraps every page with navigation.
- **The 404 page** (`path: '*'`) is inside the shell, so the navigation stays available to leave it.
- **Full-screen screens** (the active workout, Phase 4) are added as siblings of `AppShell`, so they render without the tab bar.

**URLs are in Portuguese**, matching the interface language:

| Path | Page |
|---|---|
| `/` | Home ("Início") |
| `/treino` | Workout ("Treino") |
| `/peso` | Weight ("Peso") |
| `/financas` | Finance ("Finanças") |
| `/definicoes` | Settings ("Definições"), reached through the avatar on Home |

In development only, `/dev/componentes` previews the shared states (see *Development-only page*).

### Mobile baseline
Applied in `index.html` and `src/index.css` so the app feels native on the iPhone:
- **`viewport-fit=cover`** with safe area insets (`env(safe-area-inset-*)`): content clears the notch, the home indicator and, in landscape, the rounded corners.
- **No tap highlight** (`-webkit-tap-highlight-color: transparent`). Controls provide their own `:active` feedback.
- **Controls** (buttons and navigation links) use `touch-action: manipulation` (no double-tap delay) and cannot be selected or show the callout on long press. Content text stays selectable.
- **Inputs are 16px on touch screens** (`pointer: coarse`), because iOS zooms into smaller inputs. This is a base style: a smaller text utility on an input overrides it, so inputs must not use one on touch screens.
- **`min-h-dvh`** instead of `100vh`, which is wrong on iOS when the browser toolbar shows or hides.
- **The iOS bounce (overscroll) is kept.** It is the expected native behaviour, and there is no pull-to-refresh or custom gesture that needs it disabled.

### Touch targets
**Decision:** On touch screens (`pointer: coarse`), the `default`, `lg`, `icon` and `icon-lg` button sizes are 44px (`pointer-coarse:h-11` and `pointer-coarse:size-11` in `src/components/ui/button.tsx`). `xs` and `sm` (and their icon versions) are unchanged; they are meant for dense desktop UI.

**Why:** 44px is Apple's minimum touch target. The shadcn/ui sizes (32 to 36px) are designed for a mouse.

**Warning:** `shadcn add button --overwrite` replaces the file and removes these changes, as it does with `ring-ring` (see *Focus ring*). Check both after every overwrite.

### Shared states
Loading, empty and error states are shared components, so every module handles them the same way.
- **`Skeleton`** (`src/components/ui/skeleton.tsx`, from shadcn/ui): uses the border colour (see *Skeleton*) and stops pulsing when reduced motion is on (`motion-reduce:animate-none`).
- **`EmptyState`** (`src/components/empty-state.tsx`): optional icon, title, description and action. Left-aligned and without a border or background of its own, so it sits inside a card without becoming a card within a card. shadcn/ui's `Empty` component is not used: its centred, dashed style reads as a generic template.
- **`ErrorState`** (`src/components/error-state.tsx`): a message and a "Tentar outra vez" button, announced with `role="alert"`. The muted red marks only the icon.
- **Loading pattern:** the container has `aria-busy="true"` and a visually hidden "A carregar…" label; the skeletons are hidden from assistive technology (`aria-hidden`).

### Development-only page
**Decision:** `/dev/componentes` previews the shared states. The route is registered only when `import.meta.env.DEV` is true, with a dynamic `import()`, so the production build contains neither the page nor a chunk for it.

**Why:** the states can be checked at real widths, in both themes, before any module uses them, without shipping a hidden page.

**Verified:** after `npm run build`, none of the page's text appears in `dist/`, and `npm run preview` shows the 404 page at that address.

**Known side effects:**
- Tailwind scans all of `src/`, so the page's utility classes still end up in the production CSS: a small amount of CSS, with no content and no JavaScript.
- In development, opening the page directly logs a React Router warning about a missing `HydrateFallback`, because it is the only lazy route. The warning does not appear in production.

### shadcn/ui on Base UI
**Decision:** shadcn/ui components are built on Base UI (`shadcn init -b base`, `base-nova` style, `neutral` base colour), not Radix.

**Why:** Base UI is shadcn/ui's default since July 2026 and where new components are developed first. Radix is still supported, but no longer the focus.

**Trade-off:** fewer community examples than Radix, and composition uses the `render` prop instead of `asChild`.

**Setup notes:**
- **The `shadcn` package is a dev dependency.** `src/index.css` imports `shadcn/tailwind.css` from it (shared variants and animations for the components), so it must be installed, but it is only used at build time and is not part of the JavaScript bundle.
- **ESLint:** the `react-refresh/only-export-components` rule is disabled only for `src/components/ui/`. These are generated files that export variants alongside components.
- **Known `npm audit` findings:** 3 low-severity issues in `deepmerge` (prototype poisoning, GHSA-gcqx-w48m-w2h4), reached through the shadcn CLI (`shadcn` → `@shadcn/registry`). The code only runs inside the CLI and never reaches the bundle. `npm audit fix --force` would downgrade `shadcn` to 1.0.0, so the findings are accepted until shadcn updates the dependency.
- **The `cn` package** (about 26 kB minified), which the generated components import, entered the bundle with the navigation bars. Lighter alternatives (such as `cn/lite`) will be evaluated later.

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

### Impeccable launcher blocked
**Decision:** The impeccable skill is used only through its Markdown guides. Its launcher (`scripts/impeccable`, `scripts/impeccable.cmd`) is never run, and deny rules in `.claude/settings.json` block it in Bash and PowerShell.

**Why:** The launcher downloads a compiled engine from the skill's GitHub releases into `~/.impeccable` and runs it with the agent's environment and network access. Its behaviour can't be reviewed from the repository: the checksum check proves the file is the published one, not what it does. The guides cover what the project needs.

**Limitation:** deny rules match the command text, not the program, and Claude Code's documentation states they are not a security boundary. They stop the usual invocations; the rule in `CLAUDE.md` covers the intent.

### Playwright MCP
**Decision:** The Playwright MCP server is configured in `.mcp.json`, pinned to `@playwright/mcp@0.0.83`, and runs Playwright's Chromium in isolated mode.

**Note:** The configuration uses a `cmd /c` wrapper, which only works on Windows. On other systems, the configuration must be adjusted.

**`browser_run_code_unsafe` is denied** in `.claude/settings.json`. It runs arbitrary JavaScript in the Playwright server process, outside the page, which is equivalent to running code on the machine. Checks use the tools that act inside the page instead (`browser_navigate`, `browser_resize`, `browser_emulate_media`, `browser_evaluate`, `browser_take_screenshot`).

**Trade-off:** without it there is no control over the browser clock (`page.clock`) and no new browser contexts (such as touch emulation). Time-based logic is kept in pure functions (`getGreeting`, `formatLongDate`) so it can be tested directly, and with Vitest later. 44px touch targets that only apply on touch screens are checked through their classes (`pointer-coarse:h-11`).

### No Figma
**Decision:** Figma is not used. Design is done directly in code.

---

## Deployment and costs

### Early deploy
**Decision:** The app is deployed to Vercel right after the gym module (Phase 5), before the remaining modules are built.

**Why:** Real daily use surfaces problems early, while they are still easy to fix.

**Requirement:** A backup strategy must be in place before the first deploy, because the Supabase free plan does not include automatic backups.

**Routing on Vercel:** the app uses client-side routing, so Vercel needs a rewrite that serves `index.html` for every path. Without it, opening or reloading a URL such as `/treino` returns a 404.

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