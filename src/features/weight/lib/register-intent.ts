// Home's "Registar peso" opens the Weight page with its sheet already open.
// The request travels in the navigation's state, not in the address, so it is
// neither visible nor copied, and the page clears it once used (with replace),
// so going back or reloading does not open the sheet again.

export const REGISTER_INTENT = { register: true } as const

// Whether a location's state asks for the sheet. The state can be anything
// another navigation left there, so it is checked, never trusted.
export function wantsRegister(state: unknown) {
  return typeof state === 'object' && state !== null && 'register' in state && state.register === true
}
