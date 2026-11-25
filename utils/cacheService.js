import NodeCache from "node-cache";

// Initialize cache with default TTL of 300 seconds (5 minutes) and checkperiod of 120 seconds
export const appCache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

/**
 * Get cached value by key, or execute fetchFn() and cache the result for ttlSeconds.
 * @param {string} key - Cache storage key
 * @param {number} ttlSeconds - Expiration time in seconds (default 300)
 * @param {Function} fetchFn - Async function returning data to cache
 */
export async function getOrSetCache(key, ttlSeconds = 300, fetchFn) {
  try {
    const cachedData = appCache.get(key);
    if (cachedData !== undefined) {
      return cachedData;
    }
  } catch (err) {
    console.error(`Cache read error for key [${key}]:`, err.message);
  }

  const freshData = await fetchFn();

  if (freshData !== undefined && freshData !== null) {
    try {
      appCache.set(key, freshData, ttlSeconds);
    } catch (err) {
      console.error(`Cache write error for key [${key}]:`, err.message);
    }
  }

  return freshData;
}

/**
 * Invalidate cache key(s)
 * @param {string|string[]} keys - Key or list of keys to remove
 */
export function clearCache(keys) {
  try {
    if (Array.isArray(keys)) {
      appCache.del(keys);
    } else if (typeof keys === "string") {
      appCache.del(keys);
    }
  } catch (err) {
    console.error("Cache clear error:", err.message);
  }
}

/**
 * Flush all cached entries
 */
export function clearAllCache() {
  try {
    appCache.flushAll();
  } catch (err) {
    console.error("Cache flush error:", err.message);
  }
}
