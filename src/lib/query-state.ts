// A read with nothing to show that is paused because there is no network. It
// resumes by itself when the network is back. With data in the cache isPending
// is false, so the data keeps showing.
export function isWaitingForNetwork(query: { isPending: boolean; fetchStatus: string }) {
  return query.isPending && query.fetchStatus === 'paused'
}
