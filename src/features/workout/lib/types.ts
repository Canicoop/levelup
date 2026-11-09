import type { Database } from '@/lib/database.types'

type Tables = Database['public']['Tables']

// Read types: only the fields the app uses. Column names are kept as they are
// in the database, so there is no mapping layer.
export type Exercise = Pick<Tables['exercises']['Row'], 'id' | 'name' | 'archived_at'>

export type Routine = Pick<Tables['routines']['Row'], 'id' | 'name' | 'position' | 'archived_at' | 'created_at'>

// What was tapped in the exercise search: an exercise from the list (active or
// archived), or "Criar “…”" with a new name.
export type ExerciseChoice = { kind: 'existing'; exercise: Exercise } | { kind: 'new'; name: string }

// A routine that contains a given exercise, active or archived.
export type ExerciseRoutine = Pick<Routine, 'id' | 'name' | 'archived_at'>

// A routine in the list, with how many exercises it has.
export type RoutineSummary = Routine & { exercise_count: number }

export type RoutineExercise = Pick<
  Tables['routine_exercises']['Row'],
  'id' | 'exercise_id' | 'position' | 'target_sets' | 'rep_min' | 'rep_max' | 'created_at'
> & { exercise: Exercise }

// A routine's exercises come ordered by (position, created_at).
export type RoutineWithExercises = Routine & { exercises: RoutineExercise[] }

// Write types: only the columns with grants (docs/decisions.md, Privileges and
// RLS). The generated Insert and Update types are wider than the database allows.
export type Targets = { target_sets: number; rep_min: number | null; rep_max: number | null }

export type NewRoutineExercise = { routine_id: string; exercise_id: string; position: number } & Targets

export type RoutineExerciseChanges = Partial<{ position: number } & Targets>

export type PositionChange = { id: string; position: number }
