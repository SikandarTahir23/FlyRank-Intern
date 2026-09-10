const cache = new Map();
const timers = new Map();

export function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function set(key, value, ttlMs) {
  const expiresAt = Date.now() + ttlMs;
  cache.set(key, { value, expiresAt });
  
  if (timers.has(key)) {
    clearTimeout(timers.get(key));
  }
  const timer = setTimeout(() => {
    cache.delete(key);
    timers.delete(key);
  }, ttlMs);
  timers.set(key, timer);
}

export function invalidate(key) {
  cache.delete(key);
  if (timers.has(key)) {
    clearTimeout(timers.get(key));
    timers.delete(key);
  }
}

export function invalidatePrefix(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      invalidate(key);
    }
  }
}

export function clear() {
  for (const timer of timers.values()) {
    clearTimeout(timer);
  }
  cache.clear();
  timers.clear();
}

export function getStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

export async function getOrSet(key, ttlMs, fetcher) {
  const cached = get(key);
  if (cached !== null) return cached;
  const value = await fetcher();
  set(key, value, ttlMs);
  return value;
}