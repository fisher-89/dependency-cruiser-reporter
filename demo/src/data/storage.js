const storage = new Map();

export function setItem(key, value) {
  storage.set(key, JSON.stringify(value));
}

export function getItem(key) {
  const raw = storage.get(key);
  return raw ? JSON.parse(raw) : null;
}

export function removeItem(key) {
  storage.delete(key);
}

export function clearStorage() {
  storage.clear();
}
