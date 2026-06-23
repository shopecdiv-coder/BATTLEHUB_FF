// Simple in-memory TTL cache for Firestore data
// Prevents duplicate reads when user navigates between pages

const _store = {};

export function cacheGet(key) {
  const entry = _store[key];
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    delete _store[key];
    return null;
  }
  return entry.data;
}

export function cacheSet(key, data, ttlMs = 5 * 60 * 1000) {
  _store[key] = { data, expiry: Date.now() + ttlMs };
}

export function cacheInvalidate(key) {
  delete _store[key];
}

export function cacheInvalidateAll() {
  Object.keys(_store).forEach(k => delete _store[k]);
}
