# LevelUP — Instructions for Claude Code

## Project
LevelUP is a mobile-first personal life dashboard (gym, body weight, finance, dashboard), used daily on an iPhone and published on GitHub as a portfolio project.

- Product scope and all technical decisions: `docs/decisions.md`. Read it before planning any work.
- Roadmap and setup: `README.md`.
- **Current phase: Phase 2 — Visual foundation and navigation.**

## How we work (mandatory)
1. **Communicate with the user in European Portuguese.** Code, comments, commit messages and documentation are written in English.
2. **Discuss before implementing.** Before any change, explain what you will do, which files will be created or changed, and why. Wait for explicit approval.
3. **Ask before changing anything.** Never create, edit or delete files, install packages, or run commands that change state without approval. Read-only actions (reading files, `git status`, `git diff`, lint, build, tests) are fine.
4. **One step at a time.** Never move to the next step or phase without confirmation. Never start work that was not requested.
5. **Explain technical decisions.** When there are several reasonable options, present the trade-offs and recommend one.
6. **Be honest about results.** Never claim a command, build or test succeeded without showing its output. Never invent results.
7. **Diagnose before fixing.** When something fails, find the root cause before changing code. No random changes.
8. **Do not change working code** without a clear reason.
9. **Ask before adding any dependency.** Prefer existing tools and plain code.
10. The user works on **Windows with PowerShell and VS Code**. Give PowerShell commands when the user needs to run something.

## Git
- Commits follow **Conventional Commits** (`feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `style`), written in English, small and focused.
- **Never commit or push without approval.** Show `git status` and a summary of the diff, suggest a commit message, and wait.
- Never use `git push --force`, `git reset --hard` or any other destructive command.
- `npm run lint` and `npm run build` must pass before any commit.

## Security
- Never put secrets in code or in the repository. Local values go in `.env.local` (git-ignored); `.env.example` lists variable names only.
- Every `VITE_` variable is public: it is bundled into the browser.
- **Never use the Supabase secret / service role key in the frontend.**
- Every database table has a `user_id` column and Row Level Security policies.

## Tech stack and conventions
- React 19, Vite 8, ESLint with typescript-eslint.
- **TypeScript is pinned to `~6.0.3`.** Do not upgrade to 7 until typescript-eslint supports it.
- Planned: Tailwind CSS v4 (CSS-first configuration, no `tailwind.config.js`), shadcn/ui, React Router, TanStack Query, React Hook Form + Zod, Recharts, Supabase.
- Feature-based structure: `src/features/<feature>/` (components, pages, api, hooks, schemas). Shared code goes in `src/lib/` and `src/components/`.
- Money is never stored or calculated as a floating point number.

## Design
- Use the **impeccable** skill for typography, colour, spacing and layout, and the **emil-design-eng** skill for motion and interaction polish.
- Mobile-first (iPhone), responsive on desktop. Dark mode is first-class.
- The app must not look like a generic admin template. Use colour sparingly; keep animations subtle and fast, and respect `prefers-reduced-motion`.
- Brand and visual identity decisions live in `docs/decisions.md`. **Never invent brand decisions** (colours, fonts, logo): ask the user.
- After UI changes, check the result in the browser at mobile and desktop widths (Playwright MCP, when available).