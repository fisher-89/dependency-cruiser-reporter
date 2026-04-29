export function selectUser(state) {
  return state.SET_USER || null;
}

export function selectError(state) {
  return state.SET_ERROR || null;
}

export function selectHasUser(state) {
  return state.SET_USER !== null && state.SET_USER !== undefined;
}
