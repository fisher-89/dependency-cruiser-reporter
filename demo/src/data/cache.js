import { fetchWithCache } from "./apiClient.js";

const cache = new Map();

export function cacheGet(key) {
  return cache.get(key) ?? null;
}

export function cacheSet(key, value, ttlMs = 60000) {
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

export function cacheClear() {
  cache.clear();
}

export function revalidate(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  const fresh = fetchWithCache(key.replace("req:", ""));
  cache.set(key, { value: fresh, expires: Date.now() + 60000 });
  return fresh;
}
