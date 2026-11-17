import { useQuery } from '@tanstack/react-query'
import { weightKeys } from '@/features/weight/api/query-keys'
import { fetchWeightEntries } from '@/features/weight/api/weight-entries'

// Every entry, newest first. Used by the Weight page and Home's card.
export function useWeightEntries() {
  return useQuery({ queryKey: weightKeys.entries(), queryFn: fetchWeightEntries })
}
