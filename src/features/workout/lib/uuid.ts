// Any uuid shape, case-insensitive, as Postgres accepts it. Checked before a read by id, so a mistyped
// address needs no request and works offline. In its own file so the reads that
// use it (routines, workouts) do not import each other, and Home's card does not
// bring the routines' API into the main chunk.
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
