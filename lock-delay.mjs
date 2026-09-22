export const LOCK_DELAY_MS = 500;
export const MAX_LOCK_RESETS = 15;

export function createLockState() {
  return { startedAt: null, resets: 0 };
}

export function observeGround(state, grounded, now) {
  if (!grounded) {
    state.startedAt = null;
    return false;
  }
  if (state.startedAt === null) {
    state.startedAt = now;
    return false;
  }
  return now - state.startedAt >= LOCK_DELAY_MS;
}

export function resetAfterManeuver(state, wasGrounded, grounded, now) {
  if (!grounded) {
    state.startedAt = null;
    return;
  }
  if (wasGrounded && state.startedAt !== null && state.resets < MAX_LOCK_RESETS) {
    state.startedAt = now;
    state.resets++;
  }
}
