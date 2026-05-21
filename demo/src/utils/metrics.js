const counters = new Map();

export function incrementCounter(name) {
  counters.set(name, (counters.get(name) || 0) + 1);
}

export function getCounter(name) {
  return counters.get(name) || 0;
}

export function resetCounters() {
  counters.clear();
}

export function getAllCounters() {
  return Object.fromEntries(counters);
}
