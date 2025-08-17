// Phase 0: local "account" stub so storage can be per-user later.
export async function getCurrentUser() {
  return { id: 'local-user', name: 'Local User' };
}
