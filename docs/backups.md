# Database backups

The Supabase free plan has no automatic backups, so a GitHub Actions workflow
(`.github/workflows/backup.yml`) makes one every week. This document covers the
one-off setup, how to read a backup, how to restore it into a new project, and
how the restore was tested. The reasons behind each choice are in
`docs/decisions.md`, under *Backups*.

## What a backup is

Every Monday at 03:17 UTC, and whenever it is run by hand (Actions → Backup →
Run workflow), the workflow dumps the database with the project's pinned
Supabase CLI (`supabase db dump`, 2.122.0) through the session pooler, encrypts
each dump with [age](https://age-encryption.org) as it comes out, and keeps the
three encrypted files as an artifact for 90 days:

| File | What it holds |
|---|---|
| `roles.sql.age` | Custom database roles. The project has none, so it is short. |
| `schema.sql.age` | The structure of the `public` schema: tables, functions, RLS policies and grants. Not `auth`, `storage` or the migration history. A fallback: the structure normally comes from `supabase/migrations/`. |
| `data.sql.age` | The rows of `public` (exercises, routines, workouts, sets, weight), **`auth`** (`auth.users`, `auth.identities`, sessions and the rest) and `storage`, with the sequence values. Not the internal schemas or the migration history tables. |

**Not in a backup:** the project's settings, which are not in the database:
the Google provider and its client secret, the Site URL and the Redirect URLs.

**The repository is public**, and so are its artifacts and logs. Only the
encrypted files leave the runner: the plain SQL goes straight from the dump
into age, through a pipe, and is never written to disk. The public key is in
`backups/age-recipient.txt`; **the private key is kept by the owner, outside the
repository, and without it no backup can be read.**

**A run fails** (and GitHub sends an email, see step 5 below) when a dump
fails, when the schema or the data comes out empty, or when the environment is
missing a value.

## One-off setup, in order

1. **Install age on the PC:** `winget install --id FiloSottile.age` (check the
   id with `winget search age`), then open a new terminal and run
   `age --version`.
2. **Create the key pair:** `age-keygen -o levelup-backup-key.txt`, in a folder
   outside the repository. It prints the public key (`age1…`), which goes into
   `backups/age-recipient.txt`. Keep the key file in the password manager and in
   a second, offline place (a USB stick). Optionally protect it with a
   passphrase: `age --passphrase --output levelup-backup-key.txt.age levelup-backup-key.txt`,
   then delete the plain file; age asks for the passphrase whenever it uses it.
   **If the key is lost, every backup is lost with it.**
3. **In Supabase (the project to back up):** Connect → Session pooler. Note the
   user (`postgres.<project-ref>`) and the host
   (`aws-…-<region>.pooler.supabase.com`). If the database password has any
   character other than letters and digits, reset it (Database settings → Reset
   database password) to a long one with letters and digits only: it goes into a
   URL, and this way it needs no encoding. The new password is also the one the
   CLI asks for (`supabase link`, `db push`).
4. **In GitHub:** Settings → Environments → New environment, named `backup`.
   - Deployment branches and tags → Selected branches and tags → `main` only.
   - Environment secrets → `SUPABASE_DB_PASSWORD`: the database password.
   - Environment variables → `SUPABASE_DB_USER` (`postgres.<project-ref>`) and
     `SUPABASE_DB_HOST` (the session pooler host).
5. **Failure emails:** GitHub sends them for a scheduled workflow to whoever
   created or last changed its `cron` line. In GitHub: Settings → Notifications
   → System → Actions → Email, with "Only notify for failed workflows".
6. **psql 17 on the PC** (for restoring): the PostgreSQL 17 installer from EDB,
   with only "Command Line Tools", and its `bin` folder on the PATH. Check with
   `psql --version`.
7. **Run it:** Actions → Backup → Run workflow (from `main`). The run's page
   lists the artifact, `backup-<date>-run<n>`.

**Moving to `levelup-prod`:** repeat step 3 for the production project and
replace `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_USER` and `SUPABASE_DB_HOST` in the
`backup` environment. Then run it by hand once and check it (see *Checking a
backup*).

## Reading a backup

Everything below happens in a folder **outside the repository**, deleted at the
end. The decrypted files hold every user's data and sessions: never put them
in the repository, never send them anywhere, and do not open them in an editor
that syncs or indexes files.

```powershell
$restore = "$HOME\levelup-restore"
New-Item -ItemType Directory -Force $restore | Out-Null
# Download the artifact from the run's page (a .zip), then:
Expand-Archive -Path "$HOME\Downloads\backup-<date>-run<n>.zip" -DestinationPath $restore
Set-Location $restore
age --decrypt --identity "<path to the key file>" --output data.sql data.sql.age
age --decrypt --identity "<path to the key file>" --output schema.sql schema.sql.age
age --decrypt --identity "<path to the key file>" --output roles.sql roles.sql.age
```

To see what a backup holds without showing any data, list only its `COPY`
lines (table names) and the `pg_dump` version:

```powershell
Select-String -Path data.sql -Pattern '^COPY ("[^"]+"\."[^"]+")' |
  ForEach-Object { $_.Matches[0].Groups[1].Value }
Select-String -Path data.sql -Pattern '^-- Dumped (from database|by pg_dump) version' |
  ForEach-Object { $_.Line }
```

The list must include `"auth"."users"`, `"auth"."identities"` and the `public`
tables (`"public"."workouts"`, `"public"."workout_sets"`, …).

**When done, always:**

```powershell
Set-Location $HOME
Remove-Item -Recurse -Force $restore
Remove-Item "$HOME\Downloads\backup-<date>-run<n>.zip"
```

## Checking a backup (`levelup-prod`)

**A restore is never tested on `levelup-prod`.** After moving the workflow to
production, and from time to time, run it by hand, decrypt the backup, check
its `COPY` lines and `pg_dump` version as above, and delete the folder.

## Helper files for psql

Each restore below runs one SQL file with psql. psql reads the files in the
restore folder, which also holds `data.sql`. PowerShell 5.1 writes a byte order
mark with `Set-Content -Encoding utf8`, which psql does not accept, so the files
are written with this helper:

```powershell
function Write-Sql($name, $text) {
  [IO.File]::WriteAllText((Join-Path $restore $name), $text, [Text.UTF8Encoding]::new($false))
}
```

**The connection** is the session pooler URI **without the password**, so psql
asks for it and it never reaches PowerShell's history:

```powershell
$uri = "postgresql://postgres.<project-ref>@<session pooler host>:5432/postgres?sslmode=require"
```

**Row counts** (`counts.sql`), used to compare before and after:

```powershell
Write-Sql 'counts.sql' @'
SELECT 'auth.users' AS "table", count(*) FROM auth.users
UNION ALL SELECT 'auth.identities', count(*) FROM auth.identities
UNION ALL SELECT 'public.exercises', count(*) FROM public.exercises
UNION ALL SELECT 'public.routines', count(*) FROM public.routines
UNION ALL SELECT 'public.routine_exercises', count(*) FROM public.routine_exercises
UNION ALL SELECT 'public.workouts', count(*) FROM public.workouts
UNION ALL SELECT 'public.workout_exercises', count(*) FROM public.workout_exercises
UNION ALL SELECT 'public.workout_sets', count(*) FROM public.workout_sets
UNION ALL SELECT 'public.weight_entries', count(*) FROM public.weight_entries
ORDER BY 1;
'@
```

## Testing the restore on `levelup-dev`

The free plan allows two projects, so there is no spare one: the test replaces
`levelup-dev`'s data with the backup's, inside one transaction. If anything
fails, the transaction is undone and the project stays exactly as it was. A
**canary** shows that the data really came from the backup.

1. **Back up:** with the `backup` environment pointing at `levelup-dev`, run the
   workflow by hand and wait for it to finish.
2. **Canary:** in the app (on `levelup-dev`), finish a short workout (one set).
   From now until the end of the test, do not use `levelup-dev` for anything
   else: whatever is written after the backup is lost in phase 2.
3. **Decrypt** the backup and check its `COPY` lines (see *Reading a backup*).
4. **The tables to empty:** every table the backup fills, from its `COPY` lines
   only. Check the list it prints (table names, no data), then write
   `truncate.sql`:

   ```powershell
   $tables = Select-String -Path data.sql -Pattern '^COPY ("[^"]+"\."[^"]+")' |
     ForEach-Object { $_.Matches[0].Groups[1].Value } | Sort-Object -Unique
   $tables
   Write-Sql 'truncate.sql' "TRUNCATE TABLE $($tables -join ', ') CASCADE;`n"
   ```

5. **Phase 1, a rehearsal that changes nothing:** empty the tables, load the
   backup, show the counts, and undo it all with `ROLLBACK`.

   ```powershell
   Write-Sql 'rehearsal.sql' @'
   \set ON_ERROR_STOP on
   \echo 'Before (with the canary):'
   \ir counts.sql
   BEGIN;
   \ir truncate.sql
   \ir data.sql
   \echo 'Inside the transaction, from the backup (without the canary):'
   \ir counts.sql
   ROLLBACK;
   \echo 'After ROLLBACK (the same as before):'
   \ir counts.sql
   '@
   psql --no-psqlrc --file rehearsal.sql $uri
   ```

   Expected: inside the transaction, one workout fewer than before (the
   canary), and its exercise and set rows; after `ROLLBACK`, the same counts as
   before. If psql stops with an error, nothing was changed: note the error and
   stop here.
   (`data.sql` itself starts with `SET session_replication_role = replica`, so
   triggers do not fire while it loads, and ends with `RESET ALL`.)

6. **Phase 2, the real restore:** the same, ending in `COMMIT`.

   ```powershell
   Write-Sql 'restore.sql' @'
   \set ON_ERROR_STOP on
   BEGIN;
   \ir truncate.sql
   \ir data.sql
   COMMIT;
   \echo 'After the restore:'
   \ir counts.sql
   '@
   psql --no-psqlrc --file restore.sql $uri
   ```

7. **Check:** the counts match phase 1's "inside the transaction"; in the app
   the canary workout is gone and the rest of the history is there. Signing in
   again may be needed, since the sessions are back to their state at the time
   of the backup.
8. **Clean up:** delete the restore folder and the downloaded zip (see *Reading
   a backup*).

## Restoring into a new project

For when a project is lost. On the free plan, a new project needs a free slot:
pause or delete the other one first.

1. Create the project in Supabase (same region if possible). **Do not sign in to
   the app against it yet:** `auth.users` must be empty for the restore.
2. In the repository, link the CLI to it and apply the migrations (the user
   runs these, as always):

   ```powershell
   npx supabase link --project-ref <new-project-ref>
   npx supabase db push --linked --dry-run
   npx supabase db push --linked
   ```

   `schema.sql` is the fallback if the migrations cannot be applied; it does
   not record the migration history.
3. Decrypt the backup (see *Reading a backup*). If `roles.sql` has
   `CREATE ROLE` lines, run it first: `psql --no-psqlrc --file roles.sql $uri`.
4. Load the data, with `$uri` pointing at the new project's session pooler:

   ```powershell
   Write-Sql 'restore-new.sql' @'
   \set ON_ERROR_STOP on
   BEGIN;
   \ir data.sql
   COMMIT;
   \echo 'After the restore:'
   \ir counts.sql
   '@
   psql --no-psqlrc --file restore-new.sql $uri
   ```

5. Set up again what is not in the database: Authentication → Sign In /
   Providers → Google (client ID and secret, from the Google Cloud console);
   URL Configuration → Site URL and Redirect URLs. Then the app's
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (in `.env.local`,
   and on Vercel for production).
6. Sign in to the app: the account is the same (same user id, matched through
   `auth.identities`), with its history.
7. Point the `backup` environment at the new project, and clean up the restore
   folder.

## Keeping it running

- **60 days without activity:** in a public repository, GitHub disables
  scheduled workflows when the repository has had no activity for 60 days. The
  weekly run then stops without a failure email. Running it by hand still
  works. To turn it back on: Actions → Backup → Enable workflow (whoever
  enables it then gets the failure emails). During quiet periods, check the
  Actions tab at least once a month.
- **It does not keep the project awake:** a free project pauses after a week
  without "sufficient user database activity" ("a few user requests to the
  database each day"); one dump a week is not that. In production, daily use of
  the app is. A paused project makes the backup fail (with an email), and can
  be restored from the dashboard for up to a year.
- **90 days of history:** about 13 backups at a time. Older artifacts are
  deleted by GitHub.
- **A lost or leaked private key:** create a new pair (step 2), replace
  `backups/age-recipient.txt`, and run a backup at once. Backups made with the
  old key can only be read with the old key.
