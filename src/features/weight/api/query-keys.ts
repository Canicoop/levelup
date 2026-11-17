// Query keys for the Weight module. Every key starts with all, which every
// write invalidates.
export const weightKeys = {
  all: ['weight'] as const,
  // Every entry of the user, newest first.
  entries: () => [...weightKeys.all, 'entries'] as const,
}
