# Decision log

This document records the main technical and product decisions for LevelUP, and the reasons behind them. New decisions are added as the project evolves.

_Last updated: 2026-10-30_

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

### App icon
**Decision:** an "L" made of five heatmap cells on graphite (`#121314`). It is drawn on a 100×100 grid and every cell has `rx="4"`.

**Why:** the cells come from the workout heatmap, and the "L" stands for LevelUP. The icon is drawn with the data colours, which keeps it inside the Graphite identity. A solid "L" with a separate block was considered and dropped: it looked like the symbol of an existing brand.

**Two versions:**

| | App | Favicon |
|---|---|---|
| Used for | `apple-touch-icon.png` and the manifest icons | `favicon.svg` and `favicon.ico` |
| Cells | 16×16 at (22,22), (22,42), (22,62), (42,62), (62,62) | 18×18 at (20,20), (20,41), (20,62), (41,62), (62,62) |
| Colours, top to end of the "L" | `#8FB0DD`, `#3E5F8C`, `#26354B`, `#3E5F8C`, `#8FB0DD` | `#8FB0DD`, `#6F89AE`, `#3E5F8C`, `#6F89AE`, `#8FB0DD` |
| Background | `#121314` | `#121314`, `rx="22"` |

- **The favicon has larger cells and lighter tones**, so the "L" still reads at 16–32px.
- **Colours:** every cell colour comes from the heatmap scales in the palette. The background is the light theme's text colour.

**Files:**

| File | Source | Size | Background |
|---|---|---|---|
| `public/apple-touch-icon.png` | `assets/icons/icon-square.svg` | 180×180 | Full square, opaque: iOS rounds the corners itself |
| `public/icon-192.png`, `public/icon-512.png` | `assets/icons/icon.svg` | 192, 512 | `rx="22"`, transparent corners (`purpose: "any"`) |
| `public/icon-maskable-512.png` | `assets/icons/icon-maskable.svg` | 512×512 | Full square (`purpose: "maskable"`) |
| `public/favicon.svg` | itself | vector | `rx="22"` |
| `public/favicon.ico` | `public/favicon.svg` | 32×32 | `rx="22"`, transparent corners |

- **Maskable at 80%:** Android crops maskable icons to its own shapes and only guarantees a centred circle of 80% diameter (the safe zone). The cells are scaled to 80% around the centre (`transform` in the SVG). The farthest corner of the "L" then sits 31.7 units from the centre, inside the safe zone's radius of 40. At full size it would sit at 39.6, right on the edge.
- **Generation:** the SVG files are the single source. `npm run icons` runs `scripts/generate-icons.ts`:
  - `@resvg/resvg-js` (a dev dependency, pinned to the exact version 2.6.2) renders the PNGs;
  - the ICO is built by hand around the 32×32 PNG: a 22-byte header followed by the PNG, which every current browser supports;
  - the output is deterministic, so running the script again changes nothing.

  The generated files are committed, so the build does not depend on resvg. resvg ships a prebuilt native binary per platform; it is only run by hand, never in the build or the bundle.
- **Favicon on a dark tab bar:** the background (`#121314`) barely stands out from a dark tab bar, so only the "L" shows. Accepted.

#### Manifest and iOS
- **`public/manifest.webmanifest`:**
  - name and short name "LevelUP", description "O teu painel pessoal de treino, peso e finanças.", `lang` `pt-PT`;
  - `id`, `start_url` and `scope` `/`, `display: "standalone"`, and no `orientation`, so the app rotates with the device;
  - icons: 192 and 512 for `any`, and 512 for `maskable`.
- **Dark background in the manifest:** `background_color` and `theme_color` are `#0B0C0E`, the dark-theme background. The manifest takes a single colour, not one per theme. On launch, Android shows the icon centred on the `background_color`; on a dark background the icon's graphite square blends into that screen, with no outline around it.
- **`theme-color` per theme** in `index.html`: `#F4F4F3` with `prefers-color-scheme: light` and `#0B0C0E` with `dark`, the background of each theme.
- **iOS:** `index.html` links `apple-touch-icon.png` and sets `apple-mobile-web-app-title` to "LevelUP". There is no `apple-mobile-web-app-capable`: `display: "standalone"` in the manifest already opens the app full screen.
- **No `apple-mobile-web-app-status-bar-style`.** Tested on an iPhone over the local network (2026-10-29): the icon and the name show correctly, the app opens full screen, and with the default style the status bar is readable in both themes. `black-translucent` would force white status bar text, which is unreadable on the light theme.
- **No service worker yet.** Offline support (see *Offline handling*) comes later.

---

## Architecture

### Frontend talks directly to Supabase (no custom backend)
**Decision:** A React single-page app communicates directly with Supabase (PostgreSQL, Auth). There is no custom server.

**Why:** Less code, lower cost and less to maintain. Security is enforced inside the database by Row Level Security (RLS), not by the frontend.

**Trade-off:** RLS policies must be correct and tested. Server-side logic, if ever needed (secret API keys, scheduled tasks), will use Supabase Edge Functions.

### Multi-user from day one
**Decision:** Every table has a `user_id` column and RLS policies, even if there is only one user at first.

**Why:** Friends may use the app. Designing for multiple users from the start avoids a rewrite later.

### Sign-in with Google only
**Decision:** Users sign in only with Google. There is no email and password, and the Email provider is disabled in Supabase. Signing in for the first time creates the account, so there is no separate sign-up screen.

**Why:** Supabase's built-in email service only delivers to the project's team members, with a very low rate limit, so confirmation and password-reset emails would not reach anyone else without a custom SMTP provider. Google sign-in needs no email delivery at all.

**Testing mode:** the Google OAuth app is in testing mode, but it only asks for the identity scopes (name, email, profile), so the test-user list does not apply and any Google account can sign in. This was confirmed with an account that is not a test user. Publishing the app is only needed to show its name and logo on Google's sign-in screen.

---

## Authentication

### Client options
- **PKCE flow** (`flowType: 'pkce'`): Google returns a one-time code, not tokens in the URL. The client exchanges it when the app loads (`detectSessionInUrl`).
- **Default storage and automatic refresh:** the session lives in `localStorage` (`persistSession`) and the access token is refreshed before it expires (`autoRefreshToken`).
- **Account chooser:** sign-in passes `prompt: 'select_account'`, so after signing out the next sign-in can switch accounts instead of reusing the last one silently.

### Session store
**Decision:** one subscription to `onAuthStateChange` for the whole app (`src/features/auth/session.ts`), read by components through `useSession()`, which uses `useSyncExternalStore`.

**Why:** a single source of truth; separate subscriptions per component could briefly disagree. `useSyncExternalStore` is React's way to read external state without effects or tearing. The state is `loading` until `INITIAL_SESSION` arrives, then `signed-in` or `signed-out`.

The callback only stores the session and notifies: Supabase warns that awaiting other Supabase calls inside it can deadlock.

### Route protection
**Decision:** the checks run in route loaders, not in components:
- `requireSession` on the app shell route: without a session, redirect to `/entrar?next=<page>`.
- `redirectIfSignedIn` on `/entrar`: with a session, go back into the app.

**Why:** loaders run before anything is drawn, so a protected page never flashes, and `getSession()` waits for the client to start, including the code exchange when returning from Google.

**Revalidation:** the shell route has no path of its own, so React Router does not re-run its loader when moving between pages. A sign-out is picked up by `router.revalidate()` instead (see *Sign-out*).

**Offline with an expired access token:** `getSession()` retries the refresh for up to 30 seconds and then returns no session, although the session is still stored. `requireSession` treats that network error as "stay in the app"; the token is refreshed once the network is back.

### Returning to the requested page
**Decision:** the requested page is kept in `sessionStorage` (`levelup:return-path`) while the browser goes to Google and back. The `redirectTo` sent to Supabase is always `/entrar`.

**Why:** Supabase's documentation does not say how query strings are matched against the Redirect URLs list, and a URL that does not match could fall back to the Site URL silently. This way the page never travels through Supabase's or Google's URLs.

**Validation** (`getSafeReturnPath`, a pure function), applied when the path is saved and again when it is read:
- it must start with `/` and not with `//`;
- no backslash and no control characters (browsers treat `\` as `/`, and the URL parser drops tabs and newlines, so `/\t/evil.com` would become `//evil.com`);
- resolved with `new URL(path, origin)`, it must keep the app's origin, and only `pathname + search + hash` is used;
- the final path must not start with `//` either: `/..//evil.com` resolves to `//evil.com`, which React Router's `redirect()` treats as an external URL;
- `/entrar` itself is refused, to avoid a loop;
- anything else falls back to `/`.

### Loading screen
**Decision:** the root route has a `HydrateFallback` (`AppLoading`): only the background at first, and the app icon fading in after 400ms if loading takes longer, for example a token refresh on a slow network.

**Why:** reading the session is usually instant, and a spinner for a few milliseconds would only flicker.

### Sign-out
**Decision:** "Terminar sessão" in Settings signs out on this device only (`scope: 'local'`), without confirmation, and goes to `/entrar`.

**Without network:** the local session is still removed (the server is not told). The exception is an expired access token: the sign-out first tries to refresh it, for up to 30 seconds, and then fails without removing the session. The app detects this through the `SIGNED_OUT` event, without calling `getSession()` again, and shows "Sem ligação. Tenta terminar a sessão quando voltares a estar online."

**Any sign-out** (this device, another tab, a revoked session) clears TanStack Query's cache and revalidates the router, so the previous user's data is dropped and the session guard sends the app to `/entrar`.
- This lives in `src/main.tsx`, the only module that knows the store, the cache and the router, so none of them has to import another.
- It runs in a `setTimeout`, because the loaders call `getSession()` and Supabase warns against calling it inside `onAuthStateChange`.
- Other tabs receive the event through Supabase's `BroadcastChannel`.

### Name and photo
- **Fields:** Google's sign-in (through Supabase) stores `full_name` / `name` and `avatar_url` / `picture` in `user_metadata`; there is no `given_name`. The greeting uses the first word of the full name ("Boa tarde, Vitor").
- **Validation:** `user_metadata` can be changed by the user through the API, so only non-empty text is used, and the photo only over `https:`.
- **Photo:** loaded with `referrerPolicy="no-referrer"`, which Google photos may otherwise refuse. Without a photo, or if it fails, the avatar shows the initial in a neutral circle; without a name, the person icon.

### Neutral state inside the app
Inside the app the store can be `loading`, or `signed-out` while a session is still stored (offline with an expired token: `INITIAL_SESSION` arrives without a session). Screens handle it without errors:
- the greeting has no name;
- the avatar shows the person icon;
- Settings shows "Conta indisponível", or skeletons while loading;
- signing out stays available.

### Google's sign-in screen
Google's account chooser shows the Supabase project's domain (`<project>.supabase.co`), not LevelUP's. Showing our own domain requires Supabase's custom domain add-on, which is paid.

### Tested
- **Real sign-in on a PC:** the right account, the session kept after a reload, the button back to normal after going back from Google.
- **Return path:** a deep page with a query string, and `//evil.com` in `sessionStorage` ignored and removed.
- **iPhone, installed app:** Google opened in a sheet on top of the app and returned with a session. To repeat the test over HTTPS:
  1. start a temporary Cloudflare tunnel: `cloudflared tunnel --url http://localhost:5173`;
  2. add the `trycloudflare.com` address it prints to Supabase's Redirect URLs;
  3. start Vite so it accepts the tunnel's host, without changing `vite.config.ts` (PowerShell): `$env:__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS = '.trycloudflare.com'; npm run dev`;
  4. open the address on the iPhone, add the app to the home screen and sign in from it;
  5. at the end, stop the tunnel and remove the address from Supabase's Redirect URLs.
- **Supabase blocked** (DevTools request conditions), with an expired token:
  - after about 30 seconds the app opened in the neutral state;
  - signing out showed the no-connection message;
  - with the network back, the name and photo returned.
- **Not reproduced:** once, during that test, the loading screen showed a broken image instead of the icon. The icon is inlined as a `data:` URI, so it needs no request, and it rendered correctly when tested on its own.

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

Icons, manifest and iOS details: see *App icon*.

### Offline handling
**Decision:** The in-progress workout is persisted on the device and synced when finished. Full offline support is out of scope.

**Why:** Gyms often have poor connectivity, and losing logged sets is unacceptable. Full offline sync is significantly more complex.

**Current state:** there is no service worker yet, so without network the app does not open at all. The wait of up to 30 seconds (see *Route protection*) only happens with a weak network or with Supabase unreachable. Offline support is planned for Phase 4.

---

## Data

- **`user_id` on every table**, so RLS policies are simple, fast and easy to test.
- **Derived data is not stored.** "Last session" values, the heatmap and totals are calculated from existing data.
- **Archive instead of delete** when historical records reference an item (categories, exercises, routines).
- **Money uses `numeric(12,2)`**, never floating point.
- **Timestamps use `timestamptz`.** Daily grouping uses the user's local day.
- **One body weight entry per day.** A second entry on the same day replaces the first (a `unique (user_id, entry_date)` constraint and an upsert).

### Main tables
- **Account:** `profiles`
- **Gym:** `exercises`, `routines`, `routine_exercises`, `workouts`, `workout_exercises`, `workout_sets`
- **Body weight:** `weight_entries`
- **Finance:** `categories`, `transactions`, `budgets`, `subscriptions`

### weight_entries
The daily body weight log, created by `supabase/migrations/20261030165634_create_weight_entries.sql`. Named for what each row is, one entry, instead of the earlier `body_weights`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key, `gen_random_uuid()` |
| `user_id` | `uuid` | `default auth.uid()`, references `auth.users` with `on delete cascade` |
| `entry_date` | `date` | The user's local day |
| `weight_kg` | `numeric(5,2)` | `check (weight_kg > 0 and weight_kg <= 500)`: only impossible values. The tighter range for real use is the form's job (Zod) |
| `created_at`, `updated_at` | `timestamptz` | `default now()`; `updated_at` is refreshed by the `set_updated_at` trigger |

- **One entry per day:** `unique (user_id, entry_date)`. Its index also serves the RLS filter and ordering by date, so there is no other index.
- **No "not in the future" check:** a `check` constraint with `current_date` would depend on the day it runs, and PostgreSQL assumes check constraints always give the same result. The form validates it instead.
- **`set_updated_at()`** is generic, so later tables reuse it. It has an empty `search_path` (Supabase's linter rule) and no `EXECUTE` for `public`, `anon` or `authenticated`.

### Privileges and RLS
**Decision:** every table starts from no privileges and grants only what the app needs. For `weight_entries`:
- `revoke all on table … from anon, authenticated`: in this project, new tables give both roles `TRUNCATE`, `TRIGGER` and `MAINTAIN` by default, and `TRUNCATE` ignores RLS.
- `authenticated`: `SELECT` and `DELETE` on the table; `INSERT` and `UPDATE` only on `entry_date` and `weight_kg`. `id`, `user_id` and the timestamps always come from the database, and `user_id` can neither be set to another user nor changed later.
- `anon`: nothing.
- RLS enabled explicitly (even though the project enables it automatically), with one policy per operation, for `authenticated` only, comparing `(select auth.uid())` with `user_id`. The `select` wrapper makes PostgreSQL evaluate it once per statement instead of once per row.

**Why:** the project settings are "Enable automatic RLS" on (an event trigger, `ensure_rls`) and "Automatically expose new tables" off, so nothing is reachable through the Data API until it is granted. Column-level grants make the database, not the frontend, decide which fields a user may write. The insert policy stays as a second barrier.

**Upsert:** omitted columns take their defaults without needing a privilege, so `insert (entry_date, weight_kg) … on conflict (user_id, entry_date) do update set weight_kg = excluded.weight_kg` works without `user_id`. From the app: send only `{ entry_date, weight_kg }` with `onConflict: 'user_id,entry_date'`; sending `id` or `user_id` fails with a permission error.

### Generated types
- `src/lib/database.types.ts` comes from `npm run db:types` (`supabase gen types typescript --linked --schema public`), and is never edited by hand. It is regenerated after each migration. The client is created with `createClient<Database>`.
- **The generated `Insert` and `Update` types are wider than the database allows:** they show `id`, `user_id` and the timestamps as optional, because the generator does not know about column-level privileges. The Weight module's data layer must accept only `{ entry_date, weight_kg }`, with its own narrower type.
- **`weight_kg` arrives as a `number`:** the Data API returns `numeric` as a JSON number. For weights with two decimals this loses no precision, and they are not used in money calculations, so the rule "money is never floating point" does not apply.

### Accepted advisor warnings
Supabase's Security Advisor reports three warnings that are not about the app's tables, accepted as they are:
- **`rls_auto_enable()` is `SECURITY DEFINER` and executable by `anon` and `authenticated`** (reported for each role): it is Supabase's own function behind "Enable automatic RLS", run by an event trigger. Event trigger functions cannot be called directly, and it is not ours to change.
- **Leaked password protection is disabled:** the app has no passwords, only Google sign-in.

Neither advisor reports anything about `weight_entries` or `set_updated_at`.

---

## Environments and tooling

### Two Supabase projects, no Docker
**Decision:** One Supabase cloud project for development and testing, one for production. No local Supabase.

**Why:** Running Supabase locally requires Docker, which adds setup complexity on Windows. The free plan allows two active projects. Database changes are kept as versioned SQL migrations in the repository.

### Supabase CLI and migrations
**Decision:** database changes are versioned SQL migrations in `supabase/migrations/`, applied with the Supabase CLI, a dev dependency pinned to an exact version (`supabase@2.122.0`).

**Install:** everything comes from the npm registry: the `supabase` package is a small launcher, and the native binary comes in a per-platform package (`@supabase/cli-windows-x64` on Windows), checked by npm's integrity hash. There are no install scripts.

**In the repository:** `supabase/config.toml` (local-stack settings, no secrets), `supabase/.gitignore`, `supabase/migrations/`, `supabase/tests/` and `src/lib/database.types.ts`. Out of it: `supabase/.temp/` and `supabase/.branches/`. The access token (`supabase login`) and the database password never enter the project.

| Command | Who runs it | What it does |
|---|---|---|
| `npx supabase login` | the user | Stores an access token outside the project |
| `npx supabase link --project-ref <ref>` | the user | Links the folder to `levelup-dev` (asks for the database password) |
| `npx supabase migration new <name>` | Claude Code, with approval | Creates an empty migration file; does not touch the database |
| `npx supabase db push --linked --dry-run`, then `npx supabase db push --linked` | the user | Shows, then applies, the pending migrations |
| `npm run db:types` | the user | Regenerates `src/lib/database.types.ts` from the linked project |

Every command that reaches the remote database is run by the user, never by Claude Code.

**Never run:**
- `supabase config push`: it would overwrite the project's settings with `config.toml`, which holds local defaults (Site URL `http://127.0.0.1:3000`, email sign-up on, Google off) and would break Google sign-in.
- `supabase db reset` and `supabase migration repair`: they erase data or rewrite the migration history.

Deny rules in `.claude/settings.json` block these three for Claude Code, and also `supabase db push` (including `--dry-run`): migrations are only ever applied by the user, in their own terminal.

### Database security tests
**Decision:** security tests are plain SQL files in `supabase/tests/`, run by the user in the SQL Editor of `levelup-dev`. `supabase test db` (pgTAP) runs in Docker, which the project does not use.

**How they work:**
- Everything runs inside one transaction that is never committed, so nothing is kept.
- Users are simulated the way the Data API does it: the `anon` or `authenticated` role plus the JWT claims that `auth.uid()` reads.
- Two fake users are created in `auth.users` inside the transaction, so the repository holds no real user IDs.
- A failed check raises an error starting with `FAIL`, and the last result reads "All … checks passed".

**`supabase/tests/weight_entries_rls.sql` covers:**
- `anon` cannot select, insert, update, delete or truncate;
- a user inserts without `user_id` and gets their own;
- inserting with another user's `user_id`, or with a chosen `id`, fails on privileges;
- a user sees, updates and deletes only their own entries; another user's entry is not visible even by `id`, and updates or deletes of it affect 0 rows;
- changing `user_id` and `TRUNCATE` fail on privileges;
- an upsert without `user_id` replaces the weight, keeps the row and its `user_id`, and refreshes `updated_at`;
- a second plain insert for the same day and impossible weights (0, 600) are rejected;
- the other user's entry is untouched by all of the above.

**Result on 2026-10-30:** all checks passed, and no fake users or entries were left behind. A manual test in the app with two Google accounts follows when the Weight screen exists (Phase 6).

### Testing strategy
- **Unit tests (Vitest):** business logic such as money calculations, budgets, subscription totals and date grouping.
- **Component tests (React Testing Library):** critical interactions only, such as set logging and form validation.
- **Security tests:** RLS isolation between users. Mandatory. Plain SQL in `supabase/tests/` (see *Database security tests*).
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

**Optional costs:** custom domain.

---

## Open questions

| Question | When |
|---|---|
| Offline mode and service worker (today the app does not open without network, and opening it with an expired token on a weak network waits up to 30 s) | Phase 4 |
| Backup strategy | Before Phase 5 |
| Publish the Google OAuth app and complete its Branding (optional: only to show the app's name and logo on Google's sign-in screen) | Phase 5 |
| Create the production Supabase project (`levelup-prod`) | Phase 5 |
| Custom domain | Phase 5 (optional) |
| Lazy loading per module, to address Vite's 500 kB chunk warning | When the modules have code |