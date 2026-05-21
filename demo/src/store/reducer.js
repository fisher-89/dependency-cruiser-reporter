let state = {};
const subscribers = [];

export function dispatch(action, payload) {
  state = { ...state, [action]: payload };
  subscribers.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  subscribers.push(fn);
  return () => {
    const idx = subscribers.indexOf(fn);
    if (idx !== -1) subscribers.splice(idx, 1);
  };
}

export function getState() {
  return { ...state };
}
