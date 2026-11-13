# Decision log

This document records the main technical and product decisions for LevelUP, and the reasons behind them. New decisions are added as the project evolves.

_Last updated: 2026-11-13_

---

## Product

### MVP scope
**Decision:** The first version includes four modules: gym, body weight, finance and dashboard.

**Why:** These are the features that will be used daily. A smaller, working MVP is more valuable than a large, unfinished one.

**Out of scope for the MVP:** habits, sleep and water tracking, body measurements and progress photos, personal records, rest timer, cardio (such as the treadmill), workout notes, advanced statistics, CSV export, goals and projects, unified calendar, reports, AI assistant, Apple Health and notifications. Some may be reconsidered after the MVP, based on real usage.

### Gym module
**Routines and exercises**
- **No pre-built exercise library.** Users create their own exercises and reuse them across routines. Adding an exercise searches the existing ones and offers "Criar “…”" when the name does not exist yet; nothing is created implicitly.
- **Searching ignores case and accents** ("elevacao" finds "Elevação lateral") and matches anywhere in the name. "Criar “…”" is offered only when no exercise has the same name.
- **Adding exercises:** the sheet stays open after each addition, so several can be added in a row. Exercises already in the routine show "✓ Na rotina"; archived ones show "Arquivado", and tapping one reactivates and adds it.
- **At most 30 exercises per routine**, the same limit as a workout in `submit_workout`, so any routine can be started. The database has no such check on `routine_exercises`; the app enforces it (`src/features/workout/lib/routine-limits.ts`).
- **The Exercises screen** (`/treino/exercicios`, reached from the Workout tab) lists every exercise to create, rename, archive or reactivate.
- **Archiving an exercise takes it out of every routine first**, active or archived, after a confirmation that names them. It is two steps, not a transaction: if the archive step fails, the exercise is out of its routines but still active, which is a valid state. The other order could leave an archived exercise inside routines.
- **Exercise names are unique per user, ignoring case, accents and leading or trailing spaces** ("Supino ", "supino" and "Supinó" are the same name). One key, `searchKey` (`src/features/workout/lib/exercise-search.ts`), decides this everywhere: searching, "Criar “…”", "+ Novo", reactivating and renaming. A new name that matches an archived exercise reactivates it silently, with its history; renaming to another exercise's name is refused with the duplicate message. The database index stays on `lower(name)`, which counts accents: it is the safety net, and the app is stricter.
- **Weight is always required.** Every set is weight × reps; there are no bodyweight-only exercises.
- **Routines have a name and an order.** Each routine lists its exercises in order, with target sets and an optional rep range (for example 3 × 8–12). A single number is stored as the same minimum and maximum.
- **Every change saves at once:** there is no save step for the routine as a whole. On success a change waits for the refetch, so the screen never shows the old state as saved; on failure the error shows at once and the refetch runs in the background. A failed refetch keeps the list on screen.
- **Reordering:** "Ordenar" swaps the rows for ▲▼ arrows (no dragging) and becomes "Concluído". Rows stop opening, the arrows at the ends are disabled, and all of them wait while a move saves. It is hidden with fewer than two items. Routines and a routine's exercises work the same way.
- **Editing a routine** (`/treino/rotinas/:id`): tapping an exercise opens a panel with the sets (− 3 +) and the optional reps (minimum and maximum), saved with "Guardar", and "Retirar da rotina", without confirmation. At the bottom of the page, "Mudar nome" and "Arquivar rotina"; archiving asks for confirmation and returns to the Workout tab.
- **Archived routines and exercises** are collapsed under "Arquivadas (n)" and "Arquivados (n)", with "Reativar"; a reactivated routine goes to the end of the active list. An archived routine opened by its address shows "Esta rotina está arquivada" with "Reativar", and hides "Mudar nome" and "Arquivar rotina".
- **Archive instead of delete:** exercises and routines with history are archived, never deleted. Changing a routine never changes past workouts. Renaming an exercise also renames it in the history, since it is the same exercise.

**Starting a workout**
- **Always from a routine** in the MVP.
- **"Iniciar treino" suggests the next routine:** the one after the last workout's routine, in order, wrapping around to the first and skipping archived routines. Another routine can be chosen instead, in a sheet with the active routines; tapping one starts the workout. The "Próximo treino" card does not show without active routines, or while a workout is in progress.
- **A routine without exercises cannot be started:** "Iniciar treino" is disabled, with "Esta rotina não tem exercícios." and a link to the editor; in the sheet it is disabled with the same text.
- **Starting without network:** the routine comes from the cache when it is there; "Última vez" is a help, not a requirement, so if it fails for lack of network the workout starts without it, and the screen shows "Sem ligação: a última vez não está disponível." instead of each exercise's line ("Primeira vez" would be false). Without network and without the routine in the cache, the error shows.
- **8-second limit** on both reads when starting, because a weak gym connection can hang instead of failing. It counts as no network.

**Workout in progress**
- **Full screen**, outside the app shell (see *Navigation*).
- **All the exercises in one list**, with only the current one open.
- **"Última vez" (last time) is per exercise:** that exercise's sets in the most recent finished workout, from any routine, read with `last_exercise_sets` (see *last_exercise_sets*). They are kept inside the workout when it starts, so they still show when it is resumed without network.
- **Each exercise starts with the routine's sets** (`target_sets`).
- **Each set:** the weight comes from the same set last time; without one, from the previous set of this workout, and ✓ fills the next set's weight only if it is empty. The reps start empty, with last time's as a placeholder. The weight accepts a comma ("22,5", `inputMode="decimal"`), above 0, up to 1000, with two decimals at most; the reps are whole numbers from 1 to 100 (`inputMode="numeric"`).
- **✓ logs the set,** and needs a valid weight and reps: the placeholder does not count as a value. Tapping ✓ again removes it. Only sets with ✓ are sent.
- **A set with ✓ stays editable, and is always valid in the stored workout.** While typing, the text lives in a draft in the field, because it passes through invalid values on the way ("40" to "45" empties the field; "22," waits for the "5"). An invalid draft shows the error and the ✓ stays; if the field loses focus with an invalid value, it goes back to the last valid one. `editSet` refuses an invalid value for a logged set.
- **After the last ✓ of an exercise,** it closes and the next one that is neither done nor skipped opens, wrapping around to earlier exercises. With none left, every exercise stays closed and the screen does not move.
- **The list:** a closed exercise shows its name, its progress ("1/3", out of its current sets, "+ Série" included) and a ✓ when every set is logged. The open one shows the goal, "Última vez", the sets and "+ Série", "Trocar" and "Saltar" in one row. Tapping an exercise opens it and closes the one that was open; tapping the open one closes it.
- **A logged set** has its ✓ filled with the confirmation colour (`bg-success`), and its numbers keep their normal look, because they stay editable. Tapping ✓ closes the keyboard: iOS does not do it by itself, so the field is blurred explicitly. A refused ✓ shows the error below the set.
- **Sets beyond last time** have no suggested reps.
- **No jumps when the list changes height:** opening and closing is instant, so the final height is known at once. The exercise's position is read before the change and corrected with `scrollBy` before the browser paints (`useExerciseAnchor`), so a tapped exercise stays under the finger. When the next one opens by itself it then slides to the top with `scrollIntoView`, or jumps there with reduced motion. **Limit:** near either end of the page there is not enough scroll to correct with, so the list can still shift when the exercise closing above is taller than the scroll available.
- **Actions:**
  - "+ Série" adds a set, up to 20 ("Um exercício pode ter até 20 séries.");
  - "Trocar" swaps the exercise for another, in this workout only, without confirmation and without losing anything. With no logged sets, the new exercise takes the same place with the same number of sets. With logged sets, the exercise keeps only those and closes as complete (for example 2/2), and the new one comes right after it with the sets that were left (at least one) as its goal, and opens. This replaces the first rule, under which logged sets were lost. With logged sets in a workout of 30 exercises it is disabled, since it would add one;
  - "Saltar" skips the exercise, which is then not saved. It only shows for an exercise with no logged sets, so it never hides work done. A skipped exercise is faded, with "Saltado"; tapping it opens "Retomar exercício". After skipping, the next exercise opens and slides into view, as after the last ✓;
  - "+ Adicionar exercício", at the end of the list: the exercise joins at the end with 3 sets and opens. Disabled at 30 exercises ("Um treino pode ter até 30 exercícios.");
  - "Terminar treino" (step 4.5).
- **No notes and no timer.** The duration is not shown during the workout. The start and finish times are stored, and the duration appears in the summary and in the history.
- **One workout in progress at a time,** saved on the device at every change, in `localStorage` with one key per account (`levelup:active-workout:<userId>`). Signing out does not delete it: it stays with that account. The stored value has a format version, and a damaged value or one from another version is ignored. Since ignoring it would lose the workout, fields added later are optional when read (an exercise's `lastSetsUnavailable` counts as false when missing), and the version only changes for a change older values cannot be read as.
- **Choosing an exercise for "Trocar" or "+ Adicionar exercício"** uses the same search as the routine editor (no accents, "Criar “…”"), with exercises already in the workout shown as "✓ No treino". The sheet closes once one is chosen. Its "Última vez" is read with the 8-second limit; without network the exercise joins anyway, with "Sem ligação…" on that exercise only. "Criar “…”" writes the exercise, so it needs the network, and shows the error without it.
- **Archived exercises in a workout** show as "Arquivado" and are used as they are, without being reactivated. **Why:** using one writes nothing, so it works without network, and `submit_workout` accepts archived exercises. Reactivating is done on the Exercises screen.
- **Resuming:** a workout in progress shows in a card at the top of the Workout tab, with the routine, the logged sets, "Continuar" and "Descartar". On Home the week card's "Iniciar treino" becomes "Continuar treino" and opens it directly; Home has no card of its own for it (step 4.6.5). The screen's ← goes back to the Workout tab and leaves the workout running.
- **Discarding** asks for confirmation only with logged sets to lose ("As 7 séries registadas perdem-se."), counting those of skipped exercises. The card and its confirmation sheet are only on the Workout tab, in the Workout chunk; Home has had no card for it since step 4.6.5.
- **Its account survives being offline:** with an expired token and no network the auth state is signed-out while the session is still stored, so the account is read from Supabase's stored session (`readStoredUserId`, the only code that knows that format). Otherwise the workout would vanish at the gym.

**Tested on an iPhone (2026-11-09, over the Cloudflare tunnel, see *Tested*):** the keyboards are the right ones (the weight with a comma, the reps numeric); tapping ✓ with the keyboard open works, and the slide to the next exercise works. In airplane mode, logging sets works and the workout survives closing the app. Without network, "Trocar" and "+ Adicionar exercício" show "Sem ligação…", because the exercise list is only in memory, and reopening the app fails, because there is no service worker yet (see *Offline handling*).

**Finishing**
- **One operation, all or nothing:** the whole workout is sent at once.
- **Without network**, it waits on the device and is sent again when the network is back, without duplicates: the workout gets an ID on the device when it starts, and the database ignores a workout it has already received. See *submit_workout*.
- **No logged sets:** "Terminar treino" asks "Não registaste nenhuma série. Descartar treino?", and nothing is sent.
- **"Terminar"** (AO) sits at the top of the workout screen, next to "⋯".
- **It always asks first** (AP): a confirmation sheet with a summary ("15 séries registadas. Faltam 3, que não são guardadas.", `finishCounts`, leaving out skipped exercises) and "Terminar" and "Continuar treino". Without logged sets, the discard question above stays.
- **Then a summary screen** (AQ): "Treino terminado", the routine, the duration, the exercises, the sets and the sending state ("Guardado", or "À espera de rede, é enviado sozinho"), with "Concluído", which goes back to the Workout tab.
- **A workout waiting for the network** (AR) shows as a quiet line on the Workout tab and Home ("1 treino por enviar", with "Tentar agora"). The app tries by itself when it opens, when the network comes back (`online`), when it comes back to the foreground (`visibilitychange`) and when an account signs in; a failure waits for the next of these, with no retry loop. Another workout can be started meanwhile.
- **The finish time** (AS): every ✓ keeps its time (`doneAt` on the set; missing on sets logged before it existed, which still open). If the last set was more than an hour before "Terminar", the workout finishes at that set, and the confirmation says "Terminado às 19:42, a hora da última série". **The rare case over 24 hours** (left open and continued the next day): it finishes 24 hours after the start ("Terminado às 19:42, 24 horas depois do início"), so no set is lost and the database's 24-hour check never refuses it; a finish before the start (a clock that went back) is moved to the start. A pure function, `finishTime` (`src/features/workout/lib/finishing.ts`).
- **"Última vez" and the next routine at once** (AT): finishing writes the sets just done into the copy of "Última vez" (only the exercises sent; skipped ones keep theirs) and the routine of the last workout, before sending. While a workout waits, every read from the network lays it over what the database returns (`overlayPendingLastSets`, `overlayPendingRoutineId`), or the background preparation would bring the old values back. When the send reaches Supabase, those reads are asked for again. **Limit:** a workout finished on another device meanwhile loses to the one waiting here.

**The send queue** (step 4.5), `localStorage`, one key per account (`levelup:pending-workouts:<userId>`), with a format version. Each workout is checked on its own when read, so a damaged one does not take the others; a value that cannot be read counts as an empty queue. Each entry keeps the `submit_workout` payload plus the routine's and the exercises' names, for the summary and the line without network.
- **Finishing cannot lose or duplicate the workout:** it joins the queue first and stops being the workout in progress second. If the app closes between the two, opening it finds the workout in the queue and drops the one in progress. The queue is keyed by the workout's id, and the database ignores an id it already has. If the queue cannot be written (storage full or blocked), the workout stays stored as in progress and is only taken out of memory.
- **One send at a time:** a guard in the tab, and the Web Locks API across tabs (`navigator.locks`, Safari 15.4 and later); without it, a second send is only wasted, never a duplicate. Oldest first, each with the 8-second limit. Only with a session of the queue's account, and not while offline. Plain code, not a TanStack mutation, so it runs with no screen open; like `networkMode: 'always'`, it never pauses.
- **Saved:** the workout leaves the queue, and its copy as the workout in progress goes too, if it is still stored (`dropSentWorkout`, step 4.7). **Why:** when the queue cannot be written, finishing leaves the workout stored as in progress so it is never lost; once sent, that copy would come back as "Continuar treino" on the next opening, and sets added to it would be lost, since the database ignores an id it already has. **No network, a timeout, a server error or anything unknown:** it stays, and the rest waits too.
- **Refused** (22023, 23514, 23505, 23503, 23502, 22P02, 22007, 42501; `classifySubmitError`): sending again cannot fix it, so it is marked (`rejected`, with the code and the time) and no longer sent by itself. The line says "1 treino não foi aceite", with "Tentar outra vez" (sent by itself again) and "Descartar" (with a confirmation). Until then it stays on the device.
- **An expired or missing session is never "refused":** PostgREST answers 401 for it (PGRST301 for an expired JWT, and 42501 when the call runs as anon, which may not run the function). A 401, any PGRST3xx code or a JWT message always stays in the queue, even with a code that would otherwise be refused; a 42501 counts as refused only without a 401 (a 403).
- **Signing out keeps the queue** under that account's key, like the workout in progress; it is sent when that account signs in again. Another account only sees its own.

**The screens** (step 4.5):
- **"Terminar"** is a text button (44px) between the routine's name and "⋯". The confirmation computes the finish time when it opens, and "Terminar" saves that same time, so the note shown is the time saved. Missing sets read "Falta 1, que não é guardada." in the singular. With nothing logged the sheet is "Descartar treino?" with "Não registaste nenhuma série.", "Descartar" and "Continuar treino".
- **The summary** is `/treino/terminado`, full screen like the workout, behind `requireSession` and lazy in the Workout chunk. Finishing replaces the workout's address with it, so ← does not return to a finished workout. It shows the routine, the duration ("45 min", "1 h 05 min", "menos de 1 min"), the exercises and sets ("2 exercícios · 5 séries") and each exercise ("Supino Barra · 3 séries"); skipped exercises and those with no logged sets are not in it, since they are not sent.
- **Its data:** the last finished workout is kept on the device, one key per account (`levelup:last-finished:<userId>`, with a format version), apart from the queue. The state comes from the queue: no longer in it is "Guardado"; in it, "A enviar…" while that workout is being sent, "Não foi aceite" when refused (with "Tentar outra vez" and "Descartar"), and otherwise "À espera de rede, é enviado sozinho". It survives iOS closing the app on that screen. "Concluído" removes it and goes to the Workout tab; discarding that workout also removes it, so a discarded workout never reads "Guardado". Opened without one (by its address, or after "Concluído"), it goes to the Workout tab.
- **The queue line** is at the top of Home and the Workout tab, under "Há uma versão nova", and only with workouts in the queue. Waiting ones: "1 treino por enviar" / "2 treinos por enviar", with "Tentar agora", which reads "A enviar…" while sending. Refused ones: "1 treino não foi aceite" / "2 treinos não foram aceites"; with several, each has its own row ("Push A, 6 de novembro") with its own buttons. "Descartar" asks "Descartar este treino?" with "As 15 séries registadas perdem-se.", and then the reads that finishing had updated (rule AT) are asked for again. The line does not hide "Próximo treino" or the workout in progress.
- **Chunks:** the line is on Home, so it is in the main chunk with the queue and a small module that says which workout is being sent (`sending-state.ts`). The sender and the discard sheet come on demand.
- **Verified** (2026-11-10, Playwright on `npm run dev` at 390 and 1280px, light and dark, with a fake session and `submit_workout` simulated inside the page): the confirmation with a missing set and the note "Terminado às 17:52, a hora da última série" for a last set two hours earlier; the summary going from "A enviar…" to "Guardado", with one call whose `finished_at` was that set's time; the summary after a reload; "À espera de rede" with "Failed to fetch"; "Tentar agora" showing "A enviar…" and staying in the queue; an expired session (PGRST301, 401) staying in the queue, not refused; the `online` event sending it; a refused workout on the summary and on Home, discarded with its confirmation (queue and summary both removed); two refused and one waiting, then "Tentar outra vez" sending the retried one and the waiting one, oldest first; finishing with nothing logged discarding without queueing; `/treino/terminado` without a summary going to the Workout tab; "Terminar", "⋯" and "Tentar agora" at 44px.

**Tested with real sends on `levelup-dev`:**
- **PC (2026-11-10):** finishing with network showed "Guardado"; "Próximo treino" moved to the next routine; in the next workout, "Última vez" showed "20 × 12 · 22,5 × 10 · 22,5 × 8", with the weights filled in.
- **iPhone, the installed app (2026-11-11):** finished in airplane mode, the summary showed "À espera de rede, é enviado sozinho". The workout finished at 00:49:14 and reached Supabase at 00:51:20, by itself, when the network came back.
- **The first workout saved lasted 23 h 22 min:** its sets were logged before each ✓ kept its time (step 4.5.1), so `finishTime` found no times and finished it "now" (rule AS), almost a day after it started; under 24 hours, the database accepted it. A one-off, from a workout started before step 4.5.1, and only in `levelup-dev`.

**Workout tab ("Treino")**
- The next workout, with "Iniciar treino", or the workout in progress.
- The routines, with "+ Nova", and the archived ones.
- An "Exercícios" row with the number of active exercises, leading to the Exercises screen.
- The history.
- **No heatmap or calendar** (step 4.6.6): the days with a workout are shown only on Home (the 12 weeks then, a month's calendar since step 4.6.9). **Why:** Home is the full dashboard, and the Workout tab is for starting workouts and managing the routines. `WorkoutHeatmap` and `DayWorkoutsSheet` were deleted.

**History and calendar** (step 4.6):
- **Each day's colour is its number of sets** (AU), in 4 fixed levels: no workout, 1–9, 10–19 and 20 or more (`heatmapLevel`), with the theme's heatmap colours. Since step 4.6.9 they colour the days of a month's calendar on Home, Monday to Sunday (see *Home*); before, a heatmap of the last 12 weeks, 12 columns by 7 rows. **Why the change:** on the iPhone the heatmap's cells were about 24 × 12px, and even with sliding across it and the pick sticking to the nearest workout (steps 4.6.7 and 4.6.8) the right day was hard to hit; a month's days are finger-sized. The trade-off: one month at a time instead of 12 weeks at a glance.
- **A workout's detail** (AV), to look at only: the routine, the date, the duration and each exercise with its sets ("60 × 8 · 60 × 7 · 55 × 8"). It opens from a history row, from Home's "Último treino", and from a workout line beside Home's calendar. **Tapping a calendar day selects it, it does not open anything** (step 4.6.6, kept with the calendar): the day's line then shows that day's workouts, each opening its detail, so a day with two workouts needs no sheet. **Why:** first because the heatmap's cells were far below a finger's size, so a tap on the wrong day had to lead nowhere; with the calendar, because the line shows every workout of the day at once, with its sets, before opening one. Before step 4.6.6, a day opened its detail directly, or a sheet with two or more.
- **Past workouts are neither edited nor deleted** (AW): the database grants neither `UPDATE` nor `DELETE` on them.
- **Home's week card** (AX, revised in steps 4.6.5, 4.6.6 and 4.6.9) shows this week against a goal ("2 de 5 treinos", the goal being the active routines), a month's calendar, where a day can be selected, and "Iniciar treino" or "Continuar treino"; the last workout is a row below. See *Home*.
- **Workouts waiting to be sent show at once** (AY) in the history and the calendar, marked "Por enviar". Refused ones are left out, as in "Última vez": they may be discarded, and the queue line shows them.
- **The history** sits below the routines, 20 at a time, with "Ver mais".
- **Days are the device's local day** of the workout's start: one that starts at 23:50 and ends after midnight counts on the first day. Days and weeks move by calendar day, never by 24 hours, so the weeks of a clock change still have 7 days, and a month's calendar has every day once (tested on 29 March and 25 October 2026 in Lisbon).
- **Relative days:** "hoje", "ontem", the weekday up to six days ago ("terça-feira"), then "3 de novembro", and "3 de novembro de 2025" in another year.
- **The detail without network**, for a workout in neither read kept on the device, shows `OfflineState`.

**The screens** (step 4.6.2, revised in 4.6.6): the Workout tab is, in order, the queue line, "Próximo treino" or the workout in progress, the routines, "Exercícios" and the history. Its square heatmap of step 4.6.2 (up to 44px squares, a legend, a sheet for a day with two workouts) was removed in step 4.6.6.
- **A history row:** the routine and "Por enviar" when waiting, then "ontem · 1 h 05 min · 4 exercícios · 15 séries". Each part stays whole and a line only breaks after a "·". "Ver mais" reads "A carregar…" while the next page loads. Loading, error, offline and empty ("Ainda não registaste nenhum treino") as everywhere else.
- **The detail:** the routine as the title, "terça-feira, 3 de novembro, 19:42" (the start, with the year when it is another), the duration and counts, "Por enviar" when waiting, and each exercise's sets. No buttons. An unknown workout, or an address that is not an id (no request then), reads "Treino não encontrado", without retrying.
- **Verified** (2026-11-11, step 4.6.2, Playwright on `npm run dev` at 320, 390 and 1280px, light and dark, with a fake session and the reads placed in the copy on the device, and `supabase.from('workouts')` simulated for "Ver mais" and the detail): the waiting workout marked in the history and its detail from the queue; "Ver mais" with "A carregar…" and the next page by cursor; "3 de agosto" and "7 de outubro de 2025"; "Treino não encontrado" for an unknown id and for an invalid one; `OfflineState` for the detail without network; the empty state.

**Tested on an iPhone, the installed app:**
- **2026-11-11:** Home as in the "Graphite" mockup, the history and a workout's detail; in airplane mode, after closing and reopening the app, all of it worked from the copy on the device.
- **2026-11-13:** the month calendar: the days are hit with a finger. Before it, with the heatmap's 12px rows, neither sliding across it (step 4.6.7) nor the pick sticking to the nearest workout (step 4.6.8) was enough.

**Reads** (step 4.6.1), through the Data API, with no migration: a workout with its routine, exercises and sets in one request, through the named composite foreign keys (`src/features/workout/api/history.ts`). **Why not an SQL function** like `last_exercise_sets`: the API's row limit applies to the workouts only, a few dozen per read, and grouping by the device's local day would need the time zone passed in.
- **One month** (`monthWorkouts`, step 4.6.9, replacing the 12 weeks' `recentWorkouts`): the workouts with `finished_at` from midnight of the month's first day to a day after midnight of the next month's first day (`monthReadRange`), through the `(user_id, finished_at desc)` index, then kept to those that started in the month (`inMonth`), so one that starts on the 31st at 23:50 and ends after midnight counts in its month; the database refuses workouts of 24 hours or more, so a day is enough. One read per month shown, and this month and the one before for "Esta semana", which can start in the month before. It also feeds "Último treino" (this month) and the detail.
- **The first workout's month** (`firstWorkoutMonth`): one row, the oldest by `finished_at`, for where the calendar's ‹ stops; null with no workouts.
- **The history** (`history`, an infinite query): 20 per page, paged by a `(finished_at, id)` cursor, not an offset, so a workout that arrives meanwhile does not shift the pages. One more row than a page tells whether there is another.
- **The detail** (`workoutDetail`): from the queue when waiting, otherwise from the months and the history already on the device, and only otherwise from the network. A finished workout does not change, so it is never refetched (`staleTime: Infinity`).
- **The queue over the reads** (`pendingAsRecords`, `mergeWithPending`) is applied in the hooks, not in the reads: the queue has its own store, so a workout shows at once and loses "Por enviar" when it leaves. A workout in both is the database's.
- **After a send,** the workout joins its month and the history's first page as saved before it leaves the queue, so it never disappears between the two, and the months, the first workout's month and the history are asked for again.
- **Kept on the device:** the reads are under `workoutKeys.all`, so they join the copy, and the background preparation fetches this month, the one before, the first workout's month and the history's first page when the app opens. **The copy keeps only this month and the one before, and the history's first page** (`trimForCopy`, in the persister's `serialize` and in the immediate save): other months and pages are asked for again when shown; without network, a month not kept shows `OfflineState` in place of the grid. The 12 weeks' read that an older copy may hold is left out of the next save. A detail read on its own stays a day (`gcTime`), not for good like the other Workout reads. Estimate: about 1.4 kB per workout (6 exercises × 4 sets), so about 24 kB a month at 4 workouts a week, 48 kB for the two months, and about 28 kB for the history's page.
- **A new day or month** needs no new key: "hoje", "ontem" and this week are worked out when drawing. **A new month while the app stays open** (step 4.7), seen when `useNow` ticks (every minute, and when the app comes back to the foreground): a calendar on the month that was current moves to the new one and clears its selection; one the user moved to another month stays there (`followCurrentMonth`). Verified in Playwright by moving the page's clock 20 days on: November with a day selected became December with none; October, chosen by hand, stayed with its day. The new month is read when shown. The copy drops the oldest month at its next save.

**Development order:** the gym module is built first because it will be used the most.

### Finance module
- **Manual entry only.** No bank integrations.
- **Fixed monthly budget**, overall and per category, applied every month until changed.
- **Subscriptions, version A:** a list with amount, billing cycle and next payment date. **Version B** (automatically creating expenses on the billing date) is planned after the MVP.
- **Currency:** EUR only.

### Interface language
**Decision:** The app interface is in European Portuguese (pt-PT). Code, comments and documentation are written in English.

**Quotation marks:** interface text quotes names with curved double quotes, “ ” (for example, Arquivar “Push”?), never straight quotes.

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
- **Content width:** the main area is capped at `max-w-4xl` (56rem including padding, 52rem of content), with 1rem side padding on mobile and 2rem from 1024px. Pages that need a narrower measure (forms, long text) constrain themselves.

### Navigation
- **Mobile:** a bottom tab bar with four tabs: Home ("Início"), Workout ("Treino"), Weight ("Peso") and Finance ("Finanças"). They cover the MVP modules.
- **Desktop:** the same four items in a sidebar.
- **Settings and account** are reached through the avatar on Home, not through a tab. They are rarely used and do not justify a tab.
- **The active workout is full screen**, without the tab bar, with "Terminar treino" always visible. The duration is not shown during the workout (see *Gym module*). This keeps the focus on the workout, allows larger buttons and prevents switching tabs by accident in the middle of a set.
- **No central "+" button** in the tab bar. Home's week card starts a workout, and each tab has its own add button. This keeps the bar cleaner and consistent with the restrained style, and Home is the first screen when the app opens. This may be revisited after the MVP.
- **Breakpoint:** the bottom tab bar is shown below 1024px (`lg`) and the sidebar from 1024px. Both render the same list, `src/components/layout/nav-items.ts`, so they cannot drift apart.
- **Icons:** Lucide (`lucide-react`).
- **Active item:** the text colour (`text-foreground`, inactive items use secondary text) and a heavier icon stroke (2.25 instead of 1.75), so the state does not depend on colour alone. In the sidebar, the active item also has the neutral fill as background.
- **Sidebar header:** "LevelUP" as plain text at the top, until there is a logo.
- **No shadcn/ui `Sidebar` component.** The sidebar is a short, fixed list of four links; the component brings collapsing, mobile sheets and state the app does not need.
- **Page header:** `PageHeader` is at least 44px tall (the height of the Home avatar), so the title sits at the same height on every page and does not jump when switching tabs.

### Home
- **Greeting by local time:** "Bom dia" from 06:00, "Boa tarde" from 12:00 and "Boa noite" from 20:00. Below it, the date in European Portuguese (`Intl.DateTimeFormat('pt-PT')`, for example "quinta-feira, 29 de outubro"). With the account's first name ("Boa noite, Vitor"); without one (the session still loading, or not available offline), the greeting stands alone.
- **The greeting is the page heading.** The browser tab still reads "Início". The date sits below the 44px title row, so the heading stays at the same height as on every other page.
- **Kept up to date:** an installed app can stay in memory for hours, so the greeting and the date refresh every minute and when the app returns to the foreground (`useNow`, `src/hooks/use-now.ts`).
- **The layout follows the "Graphite" mockup** (step 4.6.5), in this order: the header (greeting, date, avatar), "Há uma versão nova" and the queue line when they apply, the week card at full width, Weight and Finance side by side, and the "Último treino" row. **Why:** we went back to the "Graphite" mockup, which has the data in view and a clear highlight for the workout. It replaces the three quick actions and the three stacked module cards of steps 2.3 and 4.6.3; their code was deleted (`quick-actions.tsx`, `home-workout-summary.tsx`).
- **The week card** (rule AX): "Esta semana", then "2 de 5 treinos" in large type.
  - **The goal is the number of active routines** (archived ones left out). The count is the days with a workout this week, waiting ones included. This week can start in the month before, so both months are read; without the one before (an error, or no network and no copy) it counts this month's days. "1 de 1 treino" in the singular; above the goal it reads "6 de 4 treinos". Without routines (none, an error, or no network and no copy) it reads "2 esta semana" or "0 esta semana".
  - **A month's calendar** (rule AU, step 4.6.9, `MonthCalendar` and `CalendarGrid` in `month-calendar.tsx`), replacing the 12-week heatmap of steps 4.6.5 to 4.6.8 (its bars, the sliding, the sticking pick, `heatmapCellAt` and `heatmapDayAt` were deleted). **Why:** on the iPhone the heatmap's 12px rows stayed hard to hit, even with sliding and sticking; a month's days are finger-sized.
  - **The month:** a title, "Novembro 2026" (without "de"), with ‹ and › on its sides, 44px buttons named "Mês anterior" and "Mês seguinte". › is off on this month; ‹ is off on the month of the first workout (on this month with none yet), and stays on while that month is unknown, so a month not on the device without network shows `OfflineState`. The title is read out when the month changes. Changing month clears the selection.
  - **The days:** 7 columns, Monday to Sunday, with "seg", "ter", "qua", "qui", "sex", "sáb", "dom" above them (hidden from screen readers: each day's label says its weekday), and the day's number in each cell. Colours by sets, in the same 4 levels. Today has its number in bold with a dot under it; the ring is the selection's. Days still to come are faint and do not react; days of the months around are empty.
  - **The number's contrast** (measured in the browser): the text colour on levels 0 to 2 and the background colour on level 3, at least 5.2:1 (level 2, light theme) and 5.57:1 in the dark theme.
  - **Sizes:** each cell is a seventh of the width, all of it the touch area, with the colour drawn 2px inside, so there are no gaps to miss: 36.6px at 320px (accepted: below 44px), 44.4px at 375px (an iPhone SE or mini), 46.6px at 390px (326px ÷ 7, calculated), so the days are at least 44px on every iPhone from 375px wide, and at most 56px (the calendar is at most 392px wide), so on a desktop the days stay squares, not stripes.
  - **The height does not change between months** (4, 5 or 6 weeks): the grid always has 6 rows, those a month does not use left empty, and loading, the error and the offline state take the same box (`aspect-[7/6]`). Measured at 390px: 605.4–605.5px for November (6 rows), October (5 rows), a day selected, the skeleton, the error and the offline state; 578px at 1280px.
  - **From 1024px, side by side:** the calendar on the left and the day's line on the right, its first line level with the month's title, so the card's other half is not empty; there a day with two workouts does not grow the card.
  - **Tapping a day selects it** (rule AV, step 4.6.6), with a ring; tapping it again, or Escape, clears it. It never opens anything on its own. No sheet, so the drawer stays out of the main chunk.
  - **Read out:** a hidden live region (`aria-live="polite"`) says the day selected by a tap or a key ("Terça-feira, 3 de novembro: Pull, 12 séries; Push, 6 séries", "…: sem treino", `formatDayAnnouncement`); cleared, it says the hint. A hidden sentence sums up the month first ("Em novembro treinaste em 4 dias.", "Em outubro não treinaste.", "Em novembro ainda não treinaste.").
  - **The day's line**, below the calendar (beside it from 1024px) and above "Iniciar treino" (`CalendarDayDetails`): the day ("Terça-feira, 3 de novembro"), then one 44px line per workout, the most recent first, with the routine (truncated, "Por enviar" when waiting), "18 séries" and ›, opening its detail. A day without a workout reads "Sem treino". With no day selected it reads "Toca num dia para ver o treino." (back from "Toca ou desliza para ver um dia." of step 4.6.8, since there is no sliding now), at the top of that space. **Its space is always kept** (68px, a day with one workout), so selecting, changing or clearing a day does not move the card; on a phone only a day with two or more workouts grows it by one line (44px).
  - **Accessibility and keyboard** (step 4.6.9, simpler than the roving tabindex of 4.6.6): the grid is a group named after the month ("Novembro 2026"). Days with a workout are buttons in the usual Tab order, labelled "Terça-feira, 3 de novembro: 18 séries", with `aria-pressed` on the one selected and `aria-current="date"` on today; days without one are hidden from screen readers and never focusable (touch or mouse only). Tab goes ‹, ›, the days with a workout, the day's workout lines, then "Iniciar treino"; Enter or Space selects or clears; Escape clears. **Why plain Tab:** a month holds a dozen or so days with a workout, not the dozens of the 12 weeks, and the arrow keys need no explaining.
  - **"Iniciar treino"** (→ the Workout tab) as the card's 48px primary button, or **"Continuar treino"** (→ the workout screen) while one is in progress. Home has no "Treino em curso" card: "Descartar" lives only on the Workout tab and the workout screen.
  - Loading, error and offline as elsewhere, in the grid's box (see the height above). Without this month and no network or an error, the large number is a still "—", not a skeleton that would pulse for good.
- **Weight and Finance, two columns at every width:** each card has a small muted label with a small arrow ("Peso ›", "Novembro ›"), and the label is the link, 44px tall. The Finance label is the current month; its link reads "Finanças de novembro" to screen readers. Until Phases 6 and 7 they hold a short empty state that fits half of 320px: "Sem registos" / "O teu peso aparece aqui." and "Sem despesas" / "Os gastos do mês aparecem aqui." No placeholder numbers. Both cards share the same height.
- **Only the label links to the module**, not the whole card: once the cards hold data (charts, the budget) they will have controls of their own, and interactive elements cannot be nested inside a link.
- **"Último treino":** one row, the whole of it a link to the workout's detail, with the routine (truncated, "Por enviar" beside it when waiting) and "Ontem · 4 exercícios · 1 h 05 min". The last workout comes from this month and the history's first page together, so one from an earlier month still shows. Without workouts there is no row; it is the last block, so it moves nothing when it appears.
- **In the main chunk, without the drawer or any Workout tab component:** `MonthCalendar` and `CalendarDayDetails` import only the colours, the date helpers and the pending badge. The drawer and the "Treino em curso" card stay in the Workout pages' chunk (checked with a sourcemap build).
- **Touch targets:** the avatar, the module labels, the month's arrows, the day's workout lines, the week card's button and the "Último treino" row are at least 44px with any pointer, not only on touch screens; the calendar's days are from 375px (36.6px at 320px, accepted).
- **Accepted limits** (found at the step 4.7 review, left for later): today has `aria-current="date"` only when it has a workout, since days without one are not buttons and are hidden from screen readers, so a screen reader does not hear which day is today on an empty day; and in browse mode a selected day is read twice, once in the hidden announcement and once in the visible line.

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

**At most 3 seconds with a stored session** (step 4.4b): once the app opens without network, waiting 30 seconds at the gym is not acceptable, and `navigator.onLine` cannot tell, since it is often true on a network that does not answer. So when a session is stored on the device (`readStoredUserId`), `requireSession` waits at most 3 seconds for `getSession()` and then goes in anyway: the workout and the copy of the data are on the device, and the token is refreshed when the network is back. Without a stored session it behaves as before, since then the wait decides whether to go to `/entrar`.

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
| Calendar (heatmap colours) | Custom CSS | No extra dependency needed |

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
- **An `ErrorBoundary` per route**, so an error shows an error screen instead of a blank page.

**No `useBlocker`:** the workout in progress is saved on the device at every change, so leaving its screen loses nothing, and a warning would only get in the way.

**Lazy loading:** a module's pages move to `lazy` once the module has real code; splitting empty pages would only add requests. Lazy so far: Workout (`/treino`, `/treino/rotinas/:id`, `/treino/exercicios`, `/treino/historico/:id`, `/treino/em-curso` and `/treino/terminado`), plus the development-only page (see *Development-only page*). Home, Weight, Finance and Settings are still imported eagerly.
- **One chunk per module, one import function.** `loadWorkoutPages()` (`src/features/workout/load-pages.ts`) imports `src/features/workout/pages/index.ts`, which re-exports the module's pages. The routes use it with the object form of `lazy` (`lazy: { Component: async () => (await loadWorkoutPages()).WorkoutPage }`), as React Router's data mode guide shows. Components used only by the module (the drawer, the input) end up in its chunk.
- **Preloaded when idle.** Once the app is open and signed in, `AppShell` fetches the Workout chunk with `requestIdleCallback` (a timeout where it is missing). **Why:** if the connection drops after the app opens, tapping Treino still works. A failed preload is caught silently: the app may have opened offline, and tapping the tab tries again.
- **The promise is not cached.** The browser already reuses a loaded module; a cached rejected promise would make a failed preload fail again on tap instead of retrying.
- **Measured** (gzip, `npm run build`): moving Workout to `lazy` took the main chunk from 221.53 kB to 185.87 kB. At the end of step 4.4 the main chunk was 189.48 kB and the Workout chunk 45.58 kB. **At the end of step 4.5** (2026-11-11) the bundler splits the code differently: the main chunk is 137.04 kB, a shared chunk loaded with it (`active-workout-*.js`) 59.49 kB, the Workout chunk (`pages-*.js`) 45.16 kB, and the others `prepare-offline-*.js` 2.82 kB, `workbox-window` 2.20 kB and `send-pending-workouts-*.js` 0.79 kB; the CSS is 10.84 kB. **At the end of step 4.6** (2026-11-13): the main chunk 141.27 kB, the shared chunk (now `workouts-*.js`) 63.96 kB, the Workout chunk (`pages-*.js`) 43.43 kB, `prepare-offline-*.js` 0.73 kB, `workbox-window` 2.20 kB, `send-pending-workouts-*.js` 0.98 kB and the CSS 11.29 kB. **"Loaded at start" is always counted the same way:** the main chunk, the shared chunk, `prepare-offline` and the CSS; not the Workout chunk, `workbox-window` or the sender, which are imported on demand. It was 210.19 kB at the end of step 4.5 and is 217.25 kB at the end of step 4.6 (+7.06 kB: the calendar, the history and the detail's reads). Earlier figures sometimes left the CSS out: the 199.35 kB once given for step 4.5 is the same build without its 10.84 kB of CSS, and the 189.48 kB of step 4.4 is the main chunk alone (its CSS was not recorded). Vite's 500 kB warning no longer shows.
- **Found:** the main chunk imports `prepare-offline-*.js` statically, so the Workout data layer, `submit_workout` and `last_exercise_sets` included, loads at start, unlike what `main.tsx` and `AppShell` say (see *Open questions*). **Cause** (a sourcemap build, 2026-11-11): the two names it imports are not app code but Rolldown's runtime helpers, `__commonJS` and `__toESM`, which the main chunk needs for CommonJS packages (React). At the end of step 4.5.1 they were in a chunk of their own (`rolldown-runtime-*.js`, 0.6 kB); since step 4.5.2 Rolldown puts them in the `prepare-offline` chunk. **Tried:** a `codeSplitting.groups` entry for the runtime (Rolldown 1.2.15, whose runtime module is `\0rolldown/runtime.js`): it changed nothing, and a logging `test` showed the runtime is never offered to groups. The change was reverted. **Accepted for now** (2026-11-11): 3.59 kB gzip at start, with no effect on behaviour; the comments in `main.tsx`, `AppShell` and `load-sender.ts` say so. Since step 4.6 this matters less: Home's calendar needs the Workout reads, so the data layer is in the shared chunk that loads at start anyway, and `prepare-offline` itself is 0.73 kB.
- **No `HydrateFallback` warning.** React Router warns only when no route on the opened path has a `HydrateFallback`. The root route has one (`AppLoading`, see *Loading screen*), so opening a lazy route directly shows it while the chunk loads, without a warning.

**Package:** React Router 8 has no `react-router-dom` package. Everything is imported from `react-router`, except `RouterProvider`, which comes from `react-router/dom`.

### Route structure
Defined in `src/router.tsx`:
- **A root route with the `ErrorBoundary`** (`RouteError`) and no component of its own. The error screen therefore renders outside the app shell, without navigation, which still works if the shell itself fails.
- **`AppShell`** (sidebar, tab bar, `<ScrollRestoration />`) wraps every page with navigation.
- **Screens below a tab** (a routine's editor, Exercises) are children of `AppShell` too, so the navigation stays visible; `PageHeader`'s `back` prop adds the ← to the tab.
- **The 404 page** (`path: '*'`) is inside the shell, so the navigation stays available to leave it.
- **Full-screen screens** (the workout in progress, `/treino/em-curso`) are siblings of `AppShell`, so they render without the tab bar. Each has its own `requireSession`, safe-area padding and `<ScrollRestoration />`. Without a workout in progress, that screen redirects to `/treino` from the component, not a loader, so discarding there goes back by itself.

**URLs are in Portuguese**, matching the interface language:

| Path | Page |
|---|---|
| `/` | Home ("Início") |
| `/treino` | Workout ("Treino") |
| `/treino/rotinas/:id` | A routine's editor |
| `/treino/exercicios` | Exercises ("Exercícios") |
| `/treino/em-curso` | The workout in progress, full screen |
| `/treino/terminado` | The summary after "Terminar", full screen |
| `/treino/historico/:id` | A finished workout's detail |
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

### Bottom sheets
**Decision:** panels that slide up from the bottom (`BottomSheet`, on shadcn/ui's Base UI `Drawer`) are used for short tasks: a name, an exercise's sets and reps, adding exercises, an exercise's panel, confirming an archive, choosing a routine to start, the workout's exercise search, the workout menu, confirming a discard, confirming "Terminar", and confirming the discard of a workout the database refused.
- **The content owns its mutations** and unmounts when the sheet closes, so each opening starts clean, without an old error or a pending state.
- **No closing while saving.** The content reports a save with `useSheetBusy(isPending)` (`src/components/sheet-busy.ts`). Until it finishes, Escape and a swipe are cancelled (`eventDetails.cancel()`) and a tap outside is ignored (`disablePointerDismissal`). **Why:** otherwise the content would unmount mid-save and an error would be lost unseen. After a successful save, the content closes the sheet itself.
- **One action at a time:** a sheet with two actions (save and remove) disables both while either saves.
- **Focus:** a sheet opens on its field when typing comes next (a new name, "Mudar nome", the search). The sets and reps panel opens on "−" and an exercise's panel on the sheet itself, so the iPhone keyboard does not open by itself.
- **The keyboard stays open while adding:** tapping a row does not take the focus from the search field (the pointer's default is prevented), because iOS does not reopen the keyboard with a `focus()` after a save.

**Tested on an iPhone (2026-11-03, over the Cloudflare tunnel, see *Tested*):** the sheet rises above the keyboard, with the field and the button visible; it does not close with a swipe while saving; the keyboard stays open when adding several exercises in a row.

### Development-only page
**Decision:** `/dev/componentes` previews the shared states. The route is registered only when `import.meta.env.DEV` is true, with a dynamic `import()`, so the production build contains neither the page nor a chunk for it.

**Why:** the states can be checked at real widths, in both themes, before any module uses them, without shipping a hidden page.

**Verified:** after `npm run build`, none of the page's text appears in `dist/`, and `npm run preview` shows the 404 page at that address.

**Known side effect:** Tailwind scans all of `src/`, so the page's utility classes still end up in the production CSS: a small amount of CSS, with no content and no JavaScript. (Opening the page directly no longer logs a `HydrateFallback` warning: the root route's `HydrateFallback` covers it; see *React Router 8 in data mode*.)

### shadcn/ui on Base UI
**Decision:** shadcn/ui components are built on Base UI (`shadcn init -b base`, `base-nova` style, `neutral` base colour), not Radix.

**Why:** Base UI is shadcn/ui's default since July 2026 and where new components are developed first. Radix is still supported, but no longer the focus.

**Trade-off:** fewer community examples than Radix, and composition uses the `render` prop instead of `asChild`.

**Setup notes:**
- **The `shadcn` package is a dev dependency.** `src/index.css` imports `shadcn/tailwind.css` from it (shared variants and animations for the components), so it must be installed, but it is only used at build time and is not part of the JavaScript bundle.
- **ESLint:** the `react-refresh/only-export-components` rule is disabled only for `src/components/ui/`. These are generated files that export variants alongside components.
- **Known `npm audit` findings: `deepmerge`** (low severity, prototype poisoning, GHSA-gcqx-w48m-w2h4), reached through the shadcn CLI (`shadcn` → `@shadcn/registry`). The code only runs inside the CLI and never reaches the bundle. `npm audit fix --force` would downgrade `shadcn` to 1.0.0, so the finding is accepted until shadcn updates the dependency.
- **Known `npm audit` findings: `minimatch`** below 11.0.1 (moderate, denial of service through crafted glob patterns, GHSA-g3hv-75wg-m249, added to GitHub's advisory database on 2026-10-30). It is reached through ESLint, typescript-eslint, `eslint-plugin-react-refresh` and shadcn's `ts-morph`, and accounts for 15 of the findings (`npm audit` on 2026-10-31: 17 in total, 2 low and 15 moderate). Accepted because:
  - it only affects code that receives glob patterns from an attacker; here `minimatch` runs only in development tools, with patterns from the repository, and never reaches the bundle;
  - it did not come from the Vitest install (the installed `minimatch@10.2.6` did not change);
  - the suggested fix downgrades major versions (typescript-eslint 8.14, `@eslint/js` 9, shadcn 1.0) with `--force`, which would break the setup.

  Update once ESLint and typescript-eslint depend on `minimatch` 11.0.1 or later.
- **Known `npm audit` findings: `workbox-build`** (added with `vite-plugin-pwa` in step 4.4b), 4 of the findings (`npm audit` on 2026-11-10: 19 in total, 3 low and 16 moderate, none in production dependencies). `vite-plugin-pwa` 2.0.0 → `workbox-build` 7.4.1 brings `glob` 11.1.0 (moderate, GHSA-3g3m-2fjr-6pw4, and `minimatch` above) and `@rollup/plugin-node-resolve` 16.0.3 → `deepmerge` 4.3.1 (the same low finding as shadcn's). Accepted for the same reasons: `workbox-build` only runs inside `npm run build`, on the repository's own files, to write the service worker, and none of it reaches the bundle; the suggested fix downgrades `vite-plugin-pwa` to 1.1.0 with `--force`. Update once `workbox-build` depends on fixed versions.
- **The `cn` package** (about 26 kB minified), which the generated components import, entered the bundle with the navigation bars. Lighter alternatives (such as `cn/lite`) will be evaluated later.

### Installable on iPhone (no App Store)
**Decision:** A web app manifest and icon allow installation through Safari's "Add to Home Screen". No native app.

**Why:** Free, no App Store account required, and the app opens full screen like a native app.

Icons, manifest and iOS details: see *App icon*.

### Offline handling
**Decision:** The workout in progress is saved on the device at every change. The finished workout is sent in one operation; without network it waits on the device and is sent when the network is back (see *Gym module*). The app opens without network, and the Workout reads are kept on the device, so a workout can be started, swapped and added to at the gym. Writing anything else without network is out of scope.

**Why:** Gyms often have poor connectivity, and losing logged sets is unacceptable. Full offline sync is significantly more complex.

**Before step 4.4b** (tested on an iPhone on 2026-11-09): a workout in progress kept working without network, but reopening the app failed (no service worker), and "Trocar" and "+ Adicionar exercício" showed "Sem ligação…", because the exercise list was only in memory.

**Service worker** (step 4.4b): `vite-plugin-pwa` 2.0.0 (Workbox), a dev dependency, configured in `vite.config.ts`.
- **It precaches the whole app:** `index.html`, the JS and CSS, the fonts, the icons and the manifest. Every navigation gets `index.html` (a single-page app), so any address opens without network.
- **It never caches Supabase,** neither data nor auth: there is no runtime caching, and Supabase is another origin, so those requests always go to the network.
- **The manifest stays ours** (`manifest: false`), with its link in `index.html`.
- **Production builds only:** it is registered behind `import.meta.env.PROD` (`src/lib/app-update.ts`), and `npm run dev` has none.
- **A new version waits** (`registerType: 'prompt'`): "Há uma versão nova" with "Atualizar" shows on Home and the Workout tab, never on the workout screen, and nothing reloads by itself. An installed app can stay open for days, so it also checks for a new version every hour and when it comes back to the foreground.
- **Verified** (2026-11-09, Playwright on `vite preview`): the service worker is active and holds 17 files and nothing of Supabase; with the preview server stopped, the app still opened, served by the service worker.

**A copy of the Workout reads on the device** (step 4.4b): TanStack Query's persist, `@tanstack/react-query-persist-client` and `@tanstack/query-sync-storage-persister`, pinned to exactly 5.105.0, like `@tanstack/react-query` (pinned too, on 2026-11-10, so the three move together; the latest persist packages, 5.107.1, need a newer `react-query` and would add a second `query-core`).
- **What is kept:** only finished reads under `workoutKeys.all` (`shouldPersistQuery`): the routine list, every routine with its exercises, the exercise list, the routine of the last workout, a copy of "Última vez", the months of Home's calendar (this one and the one before), the first workout's month and the history's first page (see *Gym module*, Reads).
- **Where:** `localStorage`, one copy per account (`levelup:query-cache:<userId>`, `QueryProvider`), with a 30-day `maxAge` and a version (`buster`). While it is restored, queries wait instead of fetching.
- **Removed on sign-out and on an account change.** The persister writes one second late, so its storage only writes while the account is still the current one (`copyStorage`): a late write cannot bring another account's data back.
- **A copy is only replaced by a better one** (`copyStorage`): nothing is written before the copy has been restored, and an empty cache is never written over a copy with data.
- **Saved at once when the app leaves the screen** (`visibilitychange` to hidden, and `pagehide`): iOS can freeze or close an installed app at that moment, and a write still waiting for the one-second throttle would be lost.
- **Settings shows the copy's age** ("Dados no dispositivo: atualizados há 3 min", or "Nenhuma cópia guardada"), to check that the app is ready for the gym.
- **Found on an iPhone (2026-11-10):** opened in airplane mode, the Workout tab stayed on its skeletons. On a PC (Chrome, Network offline) the same build showed the copy, so the cause is specific to the installed app on iOS and was not reproduced; the two rules above cover a copy lost or overwritten there. A second cause was confirmed: TanStack Query assumes it is online at start and only changes on the `online`/`offline` events, which an app opened already offline never gets, so its reads retried for a long time instead of pausing, and "Sem ligação…" never showed. It now starts from `navigator.onLine` (`startOnlineFromNavigator`, `src/lib/online.ts`).
- **`gcTime: Infinity`** for the Workout queries, or one that no screen uses would leave the copy. Not 30 days: that is above `setTimeout`'s limit (about 24.8 days), and a longer timeout fires at once, which removed those queries a millisecond after they were set (found in testing).
- **Prepared in the background** when the app opens (`prepareWorkoutOffline`, from `AppShell`): every active routine with its exercises in one request, and "Última vez" of all their exercises in one request to `last_exercise_sets`, and this month, the one before, the first workout's month and the history's first page. So any routine can be started without network. **The account is checked again after each wait** (step 4.7): the routines and "Última vez" are written into the cache by hand after a request, so they are written only if the account is still the one that asked; one that changed meanwhile (its cache cleared) must not get another account's data. The sender does the same before laying a sent workout into the reads. The prefetches need no check: clearing the cache removes their queries, so a late answer reaches no one. In practice signing in with Google reloads the page, which ends any request on the way; the check covers what that does not.
- **"Última vez"** comes from the network when there is one, and otherwise from the copy; only with neither does "Sem ligação…" show. The copy records which exercises were asked for, so an exercise with no history counts as a first time and not as unknown. Every successful read updates it. Finishing a workout updates it too, with the sets just done, and the routine of the last workout (rule AT, see *Gym module*, Finishing).
- **Note:** `createSyncStoragePersister` is marked deprecated in favour of `createAsyncStoragePersister` (another package). It still works; moving to it is a small change for later.

**Tested on an iPhone** (2026-11-10, the installed app, after the fixes above): in airplane mode, after closing and reopening the app, Settings showed the copy, and the Workout tab showed the 5 routines, "Próximo treino" and the 27 exercises. "Há uma versão nova" and "Atualizar" were not reported in this test.

**Console errors seen while testing** ("Failed to fetch", "Unexpected end of JSON input") are not from the app: their initiator in the Network panel and the files in their stack (`requests.js`, `content.js`, `processor.js`, `200.js`) are scripts of a browser extension that intercepts `fetch`. Not investigated further.

**TanStack Query without network** (reproduced on 2026-11-04 in Playwright, by simulating what the browser does: the `offline` event, `navigator.onLine` false and `fetch` failing):
- **Mutations paused by default,** instead of failing: the button stayed on "A criar…" with no error, and the sheet could not close, since it stays open while saving. They now use `networkMode: 'always'` (`src/lib/query-client.ts`), so the write fails at once and "Sem ligação…" shows.
- **Reads also pause** (`fetchStatus: 'paused'`): with data in the cache it keeps showing, but a page with no data stayed on its skeleton until the network was back. They keep the default mode, because `always` would only mean a longer skeleton and then an error. Instead, `isWaitingForNetwork` (`src/lib/query-state.ts`) swaps the skeleton for "Sem ligação. Os dados aparecem quando voltares a estar online." (`OfflineState`), with no button, since the read resumes by itself. It is used in the routine list, the routine editor, the Exercises screen, the "Adicionar exercício" sheet and the confirmation to archive an exercise, where "Arquivar" stays disabled: without the routines, it cannot say what the exercise leaves. The "Exercícios" row on the Workout tab just leaves out its count.
- **`postgrest-js` retries `GET` requests by itself** on a network failure, with growing waits, so a read that fails offline takes several seconds. The 8-second limit when starting a workout covers this.

**"Descartar" without network:** it is only on the Workout tab and the workout screen (not on Home since step 4.6.5); its confirmation sheet comes from the Workout chunk, which the service worker keeps on the device.

**Testing on an iPhone** (the service worker needs HTTPS, which the tunnel gives): `npm run build`, then `$env:__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS = '.trycloudflare.com'; npm run preview -- --port 4173` in one terminal and `cloudflared tunnel --url http://localhost:4173` in another, and the tunnel's address in Supabase's Redirect URLs. The variable also works for `vite preview`, which uses the server's allowed hosts when it has none of its own (checked: a `trycloudflare.com` host gets 200, any other host 403), and it only lasts in that terminal. Each new tunnel is another address, so another install with its own storage: keep the same tunnel through a test.

---

## Data

- **`user_id` on every table**, so RLS policies are simple, fast and easy to test.
- **Derived data is not stored.** "Last session" values, the calendar's colours and totals are calculated from existing data.
- **Archive instead of delete** when historical records reference an item (categories, exercises, routines).
- **Money uses `numeric(12,2)`**, never floating point.
- **Timestamps use `timestamptz`.** Daily grouping uses the user's local day.
- **One body weight entry per day.** A second entry on the same day replaces the first (a `unique (user_id, entry_date)` constraint and an upsert).

### Main tables
- **Account:** `profiles`
- **Gym:**
  - `exercises`: the user's exercises, with names unique per user ignoring case and leading or trailing spaces (the app also ignores accents; see *Gym module*); archived, never deleted, once they have history.
  - `routines`: the user's routines, with a name and an order; archived, never deleted.
  - `routine_exercises`: a routine's exercises, in order, with target sets and an optional rep range.
  - `workouts`: finished workouts, with the routine they started from, the start and finish times, and an ID created on the device.
  - `workout_exercises`: the exercises done in a workout, in order. A record of what was done, so it does not change when the routine changes.
  - `workout_sets`: the logged sets of each exercise in a workout (weight × reps).
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

### Gym tables
Created by `supabase/migrations/20261102165341_create_gym_tables.sql`. Every table has `id` (`gen_random_uuid()`, except `workouts`), `user_id` (`default auth.uid()`) and `created_at`. The tables the app edits also have `updated_at`, refreshed by the `set_updated_at` trigger.

| Table | Columns | Rules |
|---|---|---|
| `exercises` | `name`, `archived_at` | Name 1–80 characters, no whitespace at either end; unique per user on `lower(name)`, archived exercises included |
| `routines` | `name`, `position`, `archived_at` | Name 1–60 characters, no whitespace at either end; `position >= 0` |
| `routine_exercises` | `routine_id`, `exercise_id`, `position`, `target_sets`, `rep_min`, `rep_max` | `target_sets` 1–20; reps both empty, or `1 <= rep_min <= rep_max <= 100`; `unique (routine_id, exercise_id)` |
| `workouts` | `id`, `routine_id`, `started_at`, `finished_at` | `id` created on the device (no default); `finished_at >= started_at`; at most 24 hours |
| `workout_exercises` | `workout_id`, `exercise_id`, `position` | `unique (workout_id, position)` and `unique (workout_id, exercise_id)` |
| `workout_sets` | `workout_exercise_id`, `position`, `weight_kg`, `reps` | `weight_kg numeric(6,2)`, above 0 and at most 1000; `reps` 1–100; `unique (workout_exercise_id, position)` |

- **Untrimmed names are refused, not trimmed:** the app trims them, and a `check` refuses whitespace at either end, tabs included. The rule stays visible and testable, instead of the database silently changing the input.
- **The rep range check tests both values:** a `check` whose expression is null passes, so `rep_min = 8` with no `rep_max` would be accepted unless both nulls are tested explicitly.
- **`position` is not unique:** lists are ordered by `(position, created_at)`, so swapping two positions in two requests never fails halfway.
- **Indexes,** besides those behind the unique constraints: `routines (user_id, position)`, `routine_exercises (exercise_id)`, `workouts (user_id, finished_at desc)` and `(routine_id)`, and `workout_exercises (user_id, exercise_id)`.

**Composite foreign keys**

**Decision:** a row that points at another table uses a composite foreign key on `(id, user_id)`, and every referenced table has `unique (id, user_id)`. For example, `foreign key (routine_id, user_id) references routines (id, user_id)`.

**Why:** foreign key checks do not go through RLS. With a plain foreign key on `routine_id`, a user who knew the id of someone else's routine could add their own exercise to it: the new row has their `user_id`, so RLS lets it through. With the composite key, and `user_id` always coming from `auth.uid()`, the referenced row must belong to the same user, or the insert fails with a foreign key error (23503). It is a database rule, so it also holds inside `submit_workout` and for any client.

**Every foreign key cascades**

**Decision:** all foreign keys, to `auth.users` and between the gym tables, are `on delete cascade`; none restricts.

**Why:** deleting a user must delete all their data. With a restricting key, the delete would stop at the first table that still had rows pointing at it. The app never deletes exercises, routines or workouts (they are archived, or kept as history), so in practice the cascades only run when an account is deleted.

### Privileges and RLS
**Decision:** every table starts from no privileges and grants only what the app needs. For `weight_entries`:
- `revoke all on table … from anon, authenticated`: in this project, new tables give both roles `TRUNCATE`, `TRIGGER` and `MAINTAIN` by default, and `TRUNCATE` ignores RLS.
- `authenticated`: `SELECT` and `DELETE` on the table; `INSERT` and `UPDATE` only on `entry_date` and `weight_kg`. `id`, `user_id` and the timestamps always come from the database, and `user_id` can neither be set to another user nor changed later.
- `anon`: nothing.
- RLS enabled explicitly (even though the project enables it automatically), with one policy per operation, for `authenticated` only, comparing `(select auth.uid())` with `user_id`. The `select` wrapper makes PostgreSQL evaluate it once per statement instead of once per row.

**Why:** the project settings are "Enable automatic RLS" on (an event trigger, `ensure_rls`) and "Automatically expose new tables" off, so nothing is reachable through the Data API until it is granted. Column-level grants make the database, not the frontend, decide which fields a user may write. The insert policy stays as a second barrier.

**Upsert:** omitted columns take their defaults without needing a privilege, so `insert (entry_date, weight_kg) … on conflict (user_id, entry_date) do update set weight_kg = excluded.weight_kg` works without `user_id`. From the app: send only `{ entry_date, weight_kg }` with `onConflict: 'user_id,entry_date'`; sending `id` or `user_id` fails with a permission error.

**Gym tables:** the same approach, with `revoke all` first and nothing for `anon`.
- `SELECT` on all six tables for `authenticated`.
- `INSERT` and `UPDATE` only on the columns the app writes:
  - `exercises`: insert `name`; update `name` and `archived_at`;
  - `routines`: insert `name` and `position`; update those and `archived_at`;
  - `routine_exercises`: insert the routine, exercise, position and targets; update only `position`, `target_sets`, `rep_min` and `rep_max`, so an entry's routine and exercise cannot change;
  - `workouts` (including `id`), `workout_exercises` and `workout_sets`: insert only.
- `DELETE` only on `routine_exercises`, to remove an exercise from a routine. Exercises and routines are archived, and workouts are history.
- One policy per granted operation, for `authenticated` only, with `(select auth.uid()) = user_id`.

### submit_workout
**Decision:** a finished workout is saved through `public.submit_workout(workout jsonb)`, created by `supabase/migrations/20261102170833_create_submit_workout.sql` and called as `supabase.rpc('submit_workout', { workout })`.

**Why:** a workout is three kinds of rows: the workout, its exercises and their sets. Through the Data API they would be separate inserts, each with its own request and transaction, so a dropped connection could leave half a workout. A function runs in a single transaction: all or nothing.

- **Payload:** `id`, `routine_id`, `started_at`, `finished_at` and `exercises`, each with `exercise_id` and `sets` (`weight_kg`, `reps`). Positions come from the order of the arrays.
- **`security invoker` with an empty `search_path`:** it runs as the signed-in user, so RLS, the column grants and the composite foreign keys all apply inside it, and it needs no ownership checks of its own. The empty `search_path` stops names from resolving through other schemas.
- **Checked by the function (22023):** the payload is an object, with an `exercises` array of 1 to 30 exercises, each with a `sets` array of 1 to 20 sets.
- **Checked by the tables:**
  - limits: 23514;
  - the same exercise twice: 23505;
  - another user's routine or exercise: 23503;
  - a missing value: 23502;
  - a malformed uuid or number: 22P02, and a malformed timestamp: 22007.

  Any error rolls back the whole workout.
- **Idempotent:** the workout is inserted with `on conflict (id) do nothing`.
  - Sending the same `id` again inserts nothing and returns the `id`. Since the first send was all or nothing, an existing workout means its exercises and sets exist too.
  - If the `id` belongs to another user, RLS hides that row, and the function raises 23505 instead of reporting success.
- **`EXECUTE`** only for `authenticated`; revoked from `public` and `anon`.

### last_exercise_sets
**Decision:** "Última vez" is read through `public.last_exercise_sets(exercise_ids uuid[])`, created by `supabase/migrations/20261103232850_create_last_exercise_sets.sql`. It returns, for each exercise, the sets of the most recent finished workout that has it, from any routine, with `distinct on`.

**Why:** a workout can have 30 exercises. One Data API query would return each exercise's whole history and could be cut by the API's row limit, dropping the less frequent exercises without an error. One query per exercise would be correct, but 30 requests when starting a workout, on a gym's weak network.

- **`security invoker` with an empty `search_path`,** like `submit_workout`: RLS applies inside it, so another user's exercise id returns nothing.
- **An exercise with no history** returns no rows.
- **`EXECUTE`** only for `authenticated`; revoked from `public` and `anon`.

### Generated types
- `src/lib/database.types.ts` comes from `npm run db:types` (`supabase gen types typescript --linked --schema public`), and is never edited by hand. It is regenerated after each migration. The client is created with `createClient<Database>`.
- **The generated `Insert` and `Update` types are wider than the database allows:** they show `id`, `user_id` and the timestamps as optional, because the generator does not know about column-level privileges. The Weight module's data layer must accept only `{ entry_date, weight_kg }`, with its own narrower type.
- **`weight_kg` arrives as a `number`:** the Data API returns `numeric` as a JSON number. For weights with two decimals this loses no precision, and they are not used in money calculations, so the rule "money is never floating point" does not apply.
- **Gym tables and `submit_workout`:** the types now include the six gym tables and `submit_workout` (`Args: { workout: Json }`, `Returns: string`). The note on wider `Insert` and `Update` types applies to them too: the gym data layer uses its own types for what each table, and the `submit_workout` payload, accept. `last_exercise_sets` is typed too (`Args: { exercise_ids: string[] }`, with one row per set).

### Accepted advisor warnings
Supabase's Security Advisor reports three warnings that are not about the app's tables, accepted as they are:
- **`rls_auto_enable()` is `SECURITY DEFINER` and executable by `anon` and `authenticated`** (reported for each role): it is Supabase's own function behind "Enable automatic RLS", run by an event trigger. Event trigger functions cannot be called directly, and it is not ours to change.
- **Leaked password protection is disabled:** the app has no passwords, only Google sign-in.

The Security Advisor reports nothing about `weight_entries`, `set_updated_at`, the gym tables or `submit_workout`.

**Performance Advisor** (2026-11-02), accepted for now and to be reviewed once there is real data:
- **8 "Unindexed foreign keys"** on the gym tables: they only cost time when the referenced row is deleted, which only happens when an account is deleted.
- **5 "Unused Index":** the tables are still empty, so no query has used them yet.

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

**`supabase/tests/gym_rls.sql` covers:**
- `anon` cannot select, insert, update, delete or truncate any of the six tables, or execute `submit_workout` or `last_exercise_sets`;
- names are unique per user ignoring case (the same name for another user is fine); names with whitespace at either end, empty names and names over 80 characters are refused;
- `user_id` and `id` cannot be written;
- routine limits: target sets, the rep range (including `rep_min` without `rep_max`), and the same exercise twice in a routine;
- links to another user's rows are refused by the composite foreign keys (23503): an own exercise in their routine, their exercise in an own routine, a workout from their routine, an exercise in their workout, and a set in their workout exercise;
- columns and operations outside the grants fail on privileges: changing a routine entry's routine or exercise, changing any `user_id`, deleting exercises or routines, updating or deleting workout rows, and `TRUNCATE`;
- another user's rows are not visible, even by `id`, and updates or deletes of them affect 0 rows;
- an exercise can be archived and reactivated, and an archived name stays taken;
- `submit_workout`:
  - a valid workout is stored in the order sent;
  - sending the same `id` again stores nothing;
  - all or nothing when the second exercise belongs to another user;
  - the payload shape (22023);
  - the limits on weight, reps, times and repeated exercises;
  - another user's workout `id` is refused (23505);
- `last_exercise_sets`:
  - the latest workout by date, not by order of sending, from any routine, with the sets in order;
  - each exercise has its own latest workout;
  - no rows for an exercise with no history or an empty list;
  - no rows for another user's exercise, in both directions;
  - it is `security invoker` with an empty `search_path`;
- deleting a user removes all their rows from the six tables, and none of the other user's.

**Result on 2026-11-02:** all checks passed. **On 2026-11-03,** with the `last_exercise_sets` checks added: all checks passed.

### Testing strategy
- **Unit tests (Vitest):** in use. Pure logic now (see *Unit tests*); later money calculations, budgets, subscription totals and date grouping.
- **Component tests (React Testing Library):** critical interactions only, such as set logging and form validation.
- **Security tests:** RLS isolation between users. Mandatory. Plain SQL in `supabase/tests/` (see *Database security tests*).
- **End-to-end tests (Playwright):** two or three key flows, added before the MVP is considered complete.

### Unit tests
**Decision:** Vitest, a dev dependency pinned to an exact version (`vitest@5.0.5`). It uses the project's Vite 8 (a peer dependency) and adds 16 small packages, none with install scripts.

**Configuration:** a `test` block in `vite.config.ts`, not a separate `vitest.config.ts`. Vitest reads that file, so tests share the `@/` alias without repeating it.
- **Environment:** `node` (the default). Only pure functions are tested for now, so there is no jsdom and no Testing Library yet; they come with component tests.
- **Mocks only where no pure function can hold the rule** (step 4.7, one file so far): `prepare-offline.test.ts` replaces the reads and the account with `vi.mock`, around a real `QueryClient`, because what it checks is the order of a wait and a cache write across an account change. **Why so limited:** a mock tests the code against an imitation of its neighbours, which can drift from the real ones unnoticed; a pure function needs none. Each new use is a decision, recorded here. Removing the account check made the expected test fail; the check was then restored.
- **Location:** tests sit next to the code they test, as `*.test.ts` (`include: ['src/**/*.test.ts']`). They are type-checked by `tsc -b` (part of `npm run build`) and linted by ESLint, and they never reach the bundle because no app file imports them.
- **Fixed time zone:** `test.env.TZ = 'Europe/Lisbon'`, so date tests give the same result on any machine and in CI. Lisbon rather than UTC because its summer offset (UTC+1) is exactly what makes `toISODate` differ from `toISOString`. A test checks that the zone took effect; it was also run with the process set to `America/New_York`, and still ran in Lisbon.
- **Tailwind reads only `.tsx` files (`@source not "./**/*.ts"` in `src/index.css`):** Tailwind scans `src` for class names in any text, comments included. Words in test descriptions ("absolute", "relative") had added `.absolute` and `.relative` to the production CSS, and later the word "table" in a comment of a data-layer file added `.table`. Excluding only the tests would not have caught the second case, so every `.ts` file is excluded: logic and tests live in `.ts`, and Tailwind classes only in `.tsx`. With the exclusion, the CSS is byte-for-byte the same as without those files.

**What the 563 tests cover:**

| File | Tests | Covers |
|---|---|---|
| `src/features/auth/lib/return-path.test.ts` | 21 | `getSafeReturnPath`: internal paths kept; missing, empty, relative and padded values fall back to `/`; `//evil.com`, `/\evil.com`, `\evil.com`, `https://evil.com`, `javascript:`, `/\t/evil.com`, a newline, `/..//evil.com` and `/.//evil.com` refused; `/entrar` refused; encoded characters kept as plain text |
| `src/features/auth/lib/user-profile.test.ts` | 11 | `getUserProfile`: `full_name` / `name`, first name, initial (including accented), extra spaces, non-text names, photos only over `https:` (`avatar_url` / `picture`), no user |
| `src/features/auth/lib/sign-in-error.test.ts` | 6 | `readRedirectResult`: plain visit, `code`, cancelled (`access_denied`), failed with description, errors in the hash, query string first |
| `src/lib/supabase-config.test.ts` | 7 | `getSupabaseConfig`: missing or empty variables named exactly, both set, and the error message never containing the values |
| `src/features/home/lib/greeting.test.ts` | 8 | `getGreeting`: 00:00, 05:59, 06:00, 11:59, 12:00, 19:59, 20:00 and 23:59 |
| `src/lib/format.test.ts` | 5 | the time zone check, `toISODate` (including 1 July 00:30, where `toISOString` gives 30 June), and `formatLongDate` and `formatMonth` in European Portuguese |
| `src/features/workout/lib/errors.test.ts` | 23 | `requireRows`, and `getErrorMessage`: specific messages, network failures per browser, a timeout counted as no network, database error codes |
| `src/features/workout/lib/exercise-search.test.ts` | 26 | the same-name key (case, accents, spaces), `resolveNewExercise`, `isExerciseNameTaken`, `filterExercises`, `canCreateExercise` |
| `src/features/workout/lib/targets.test.ts` | 19 | `validateTargets`: limits of sets and reps, a single number as min = max, whole numbers only; `formatTargets` |
| `src/features/workout/lib/names.test.ts` | 11 | `cleanName`, and the 80 and 60 character limits, with an emoji counted as one character |
| `src/features/workout/lib/positions.test.ts` | 8 | `moveItem`: only changed rows are sent, the ends, shared positions and gaps; `nextPosition` |
| `src/features/workout/lib/routine-limits.test.ts` | 6 | `isRoutineFull` and the 30-exercise limit |
| `src/features/workout/lib/labels.test.ts` | 13 | `formatExerciseCount`, `formatLastSets` ("Última vez: 40 × 12 · 22,5 × 10", "Primeira vez"), `formatSetProgress`, `formatLoggedSets` and `formatDiscardWarning`, singular and plural |
| `src/features/workout/lib/active-workout.test.ts` | 69 | starting from a routine (sets, weights from last time or the previous set), `editSet` (a logged set stays valid), `toggleSet` (✓ refused without valid values, filling the next weight, opening the next exercise, nothing open after the last, the time of each ✓ (`doneAt`), removed with the ✓, and a new time when logged again), "+ Série" up to 20, skipping and resuming, swapping with and without logged sets, adding up to 30, `repsPlaceholder`, `countLoggedSets`, `groupLastSets` |
| `src/features/workout/lib/set-values.test.ts` | 41 | `parseWeight` (comma or point, above 0, up to 1000, two decimals), `parseReps` (whole numbers 1 to 100), `setFieldError`, `formatWeight` |
| `src/features/workout/lib/active-workout-storage.test.ts` | 29 | the key per account; reading back what was saved; `isStoredWorkout` (the sent workout only, nothing for a damaged value); ignoring damaged values, another version, a wrong shape or a logged set with an invalid value; reading an older workout without `lastSetsUnavailable`; an older workout without `doneAt`; a damaged `doneAt` dropped without losing the workout |
| `src/features/workout/lib/next-routine.test.ts` | 11 | `nextRoutine`: the one after the last, wrapping around, skipping archived routines, a last routine that was archived, no workouts, no active routines |
| `src/features/auth/lib/stored-session.test.ts` | 10 | `storedSessionKey` and `parseStoredUserId`, for every malformed stored value |
| `src/features/workout/lib/workout-payload.test.ts` | 5 | `toSubmitPayload`: order, only sets with ✓, no skipped or empty exercises, null with nothing logged |
| `src/lib/query-state.test.ts` | 4 | `isWaitingForNetwork`: paused without data, fetching, paused with data, finished |
| `src/features/workout/lib/with-timeout.test.ts` | 3 | `withTimeout`: in time, passing on an error, `TimeoutError` after the limit |
| `src/lib/query-persistence.test.ts` | 25 | the key per account, `shouldPersistQuery` (finished Workout reads only), `trimForCopy` (the history's first page; this month and the one before, January reaching into December; the 12 weeks' read left out), `copyStorage` (no write before the restore, from another account, or of an empty cache over a copy with data) and `copySavedAt` |
| `src/lib/online.test.ts` | 3 | `startOnlineFromNavigator`: offline at start, online, no navigator |
| `src/features/settings/lib/device-copy.test.ts` | 11 | `formatDeviceCopy`: no copy, "agora mesmo", minutes, hours, days, a clock that went back |
| `src/features/workout/lib/last-sets-copy.test.ts` | 16 | `lastSetsFromCopy`, `mergeLastSetsCopy`, `lastSetsFromPayload`, and laying the workouts waiting to be sent over a read (`overlayPendingLastSets`, `overlayPendingRoutineId`) |
| `src/features/workout/lib/finishing.test.ts` | 15 | `lastLoggedAt`, `finishTime` (now, exactly an hour, the last set, no times, the 24-hour limit, a clock that went back) and `finishCounts` |
| `src/features/workout/lib/pending-workouts.test.ts` | 46 | the queue's key and format, damaged entries dropped one by one, adding without duplicates, removing, refusing and retrying, oldest first, and `classifySubmitError` (an expired or missing session always retried, PGRST301 and 42501 with 401 included) |
| `src/features/workout/lib/last-finished.test.ts` | 10 | the summary's key and format, and damaged values ignored |
| `src/features/workout/lib/finish-labels.test.ts` | 28 | the confirmation, the finish note, the duration, the queue line in singular and plural, the summary and `sendState` |
| `src/features/workout/lib/history.test.ts` | 70 | `toWorkoutRecord` (order by position); weeks, days and months by the local calendar (`startOfWeek`, `addDays`, `workoutDay`, `monthOf`, `addMonths`, `monthReadRange`, `inMonth`); `followCurrentMonth` (a new month only from the one that was current); `calendarWeeks` (always 6 weeks, today and the days to come, the clock changes); `dayTotals` and the 4 levels; `latestWorkout`; this week and its goal; the month's title and summary; the day's announcement and labels; relative days; the history row and "Último treino"; the queue over the reads |
| `src/features/workout/prepare-offline.test.ts` | 3 | `prepareWorkoutOffline` across an account change, with mocks (see above): the routines and "Última vez" written for the account that asked; nothing written when the account changes while the routines are read; "Última vez" kept out when it changes while those sets are read |

No test file was removed: the tests of the 12 weeks, the sliding and the sticking pick were in `history.test.ts` and went with that code.

**Tests fail when a rule breaks:** removing the final `//` check from `getSafeReturnPath` made exactly the two expected tests fail (`/..//evil.com` and `/.//evil.com`); the function was then restored unchanged.

**Scripts:** `npm test` (watch mode) and `npm run test:run` (once).

**CI:** a `Test` step runs `npm run test:run` between `Lint` and `Build`, in the job now named "Lint, test and build".

### Continuous integration
GitHub Actions runs lint, unit tests and build on every push to `main` and on pull requests.

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

**Requirement:** A backup strategy must be in place before the first deploy, because the Supabase free plan does not include automatic backups (see *Backups*).

### Backups
**Decision** (step 5.1): a GitHub Actions workflow (`.github/workflows/backup.yml`) dumps the database every Monday at 03:17 UTC, and also on demand (`workflow_dispatch`), encrypts it with age and keeps it as an artifact for 90 days. Setup, reading a backup and restoring it are in `docs/backups.md`.

**Why:** the Supabase free plan has no automatic backups, and Phase 5 brings the first real workouts. GitHub Actions and its artifact storage cost nothing for a public repository, and need no server of our own.

- **What goes in:** three dumps, as in Supabase's backup guide: `roles.sql` (custom roles; none yet), `schema.sql` (the `public` structure, a fallback) and `data.sql` (the rows of `public`, `auth` and `storage`, with the sequence values). **`auth` is needed:** every gym row has a `user_id` that references `auth.users`, so `public` alone cannot be restored into a new project. Checked with `supabase db dump --dry-run` (CLI 2.122.0, against a fake local URL, without connecting): the schema dump leaves out `auth`, `storage` and `supabase_migrations`; the data dump leaves out only the internal schemas and the migration history tables. **The structure comes from the migrations** (`supabase db push`), the source of truth, which also records the migration history; `schema.sql` is the fallback. The project's settings (the Google provider, the Site URL and the Redirect URLs) are not in the database and are set up again by hand.
- **The tool: the project's pinned Supabase CLI** (`supabase db dump`), not `pg_dump` directly. It is Supabase's documented path, it already holds Supabase's exclusion lists, and it runs `pg_dump` in the Supabase Postgres image it pins, so the `pg_dump` version does not have to be matched by hand (the runner has Docker). Installed with `npm ci --ignore-scripts`: the `supabase` package has no install script, and finds its binary in the platform package (`@supabase/cli-linux-x64`, in the lockfile with its integrity hash). Its notices go to stderr, so they never mix with the dump.
- **The connection: the session pooler** (`aws-…pooler.supabase.com:5432`, user `postgres.<ref>`). The runners have no IPv6, and the direct connection is IPv6 only on the free plan; the pooler is IPv4 on every plan, and Supabase's backup guide names it for networks without IPv6. The transaction pooler keeps no session state.
- **Secrets:** a GitHub Environment, `backup`, that only `main` can use: the password is a secret of its own (`SUPABASE_DB_PASSWORD`), so GitHub hides it in the logs even alone in an error message; the user and the host are environment variables (`SUPABASE_DB_USER`, `SUPABASE_DB_HOST`). Only the dump step gets them (`env:` of that step, not of the job), and the URL is built inside it and never printed. The password is letters and digits only, so it needs no percent-encoding in the URL.
- **Encryption: age, with a public key in the repository** (`backups/age-recipient.txt`). The repository is public, so its artifacts and logs are too. Each dump goes straight from `supabase db dump` into `age --encrypt` through a pipe, so the plain SQL is never written to disk and never uploaded. The private key was made by the owner on their PC, is kept outside the repository (password manager and an offline copy), and is never seen by Claude Code. age comes from Ubuntu's signed archive (`apt-get install age`, 1.1.1 on `ubuntu-24.04`), so there is no hash to keep up to date.
- **The workflow:** `permissions: contents: read`; `actions/checkout`, `actions/setup-node` and `actions/upload-artifact` pinned to a commit SHA, with the version in a comment; checkout without persisted credentials; `ubuntu-24.04` rather than `ubuntu-latest`; a 20-minute limit; one run at a time.
- **A failed or empty backup fails the run:** `set -euo pipefail` fails the step when any dump fails, and an encrypted `schema` or `data` file under 1 KiB means the dump came out empty (age adds only about 200 bytes to an empty input). The size is checked on the encrypted file, not counted with `tee` and a process substitution, whose exit status `pipefail` does not see. Checked by running the step's exact text in bash with stand-ins for `npx` and `age`: exit 0 for a normal dump, and 1 for a failing dump, an empty dump and a missing password. GitHub then emails whoever last changed the `cron` line, if Actions email notifications are on.
- **Restore:** decrypted in a folder outside the repository, deleted at the end; psql gets the URI without the password and asks for it, so it stays out of PowerShell's history. **Tested on `levelup-dev`** in two phases, inside one transaction each, with a canary workout logged after the backup: a rehearsal that ends in `ROLLBACK`, then the real restore. There is no third project to restore into on the free plan. **A restore is never tested on `levelup-prod`:** there, a backup is only decrypted and its `COPY` lines checked.
- **Limits:** in a public repository GitHub disables scheduled workflows after 60 days without repository activity, without a failure email; running by hand still works (see `docs/backups.md`). A weekly dump does not keep a free project from pausing: Supabase asks for "a few user requests to the database each day"; in production, daily use of the app does. 90 days keeps about 13 backups.

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
| On Vercel, serve `sw.js` without long caching, so new versions are found | Phase 5 |
| "Há uma versão nova" and "Atualizar" on the installed app, not tested yet (see *Offline handling*) | Phase 5 |
| The main chunk imports the `prepare-offline` chunk statically, for Rolldown's runtime helpers (`__toESM`, `__commonJS`, checked again with a sourcemap build on 2026-11-13): 0.73 kB gzip at the end of step 4.6 (3.59 kB at step 4.6.1). Since step 4.6 the rest of the Workout data layer loads at start anyway, in the shared chunk Home's calendar needs. Accepted for now (2026-11-11), and the comments say so; a `codeSplitting` group does not reach the runtime (see *React Router 8 in data mode*). Check again after the update | When Vite or Rolldown is updated |
| Backups (decided in step 5.1, see *Backups*): run the workflow on `levelup-dev`, test the restore there (`docs/backups.md`), then move it to `levelup-prod` before the first deploy | Phase 5, before the first deploy |
| Home's calendar: when the first workout's month cannot be read (an error that keeps failing), ‹ stays on with no end, and each earlier month is one more empty request. No wrong data is shown (found at the step 4.7 review) | Later |
| Publish the Google OAuth app and complete its Branding (optional: only to show the app's name and logo on Google's sign-in screen) | Phase 5 |
| Create the production Supabase project (`levelup-prod`) | Phase 5 |
| Custom domain | Phase 5 (optional) |
| Lazy loading for the other modules, to address Vite's 500 kB chunk warning (Workout is lazy already, see *React Router 8 in data mode*) | When each module has code |