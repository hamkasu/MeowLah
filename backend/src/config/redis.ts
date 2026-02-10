import Redis from 'ioredis';
import { env } from './env';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  if (!env.REDIS_URL || env.REDIS_URL === 'redis://localhost:6379') {
    console.warn('[Redis] No REDIS_URL configured, caching disabled');
    return null;
  }
  try {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) return null; // stop retrying
        return Math.min(times * 200, 2000);
      },
    });
    redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });
    redis.on('connect', () => {
      console.log('[Redis] Connected');
    });
    return redis;
  } catch {
    console.warn('[Redis] Failed to initialize, caching disabled');
    return null;
  }
}

// Cache helpers — gracefully degrade without Redis
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedis();
    if (!client) return null;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, data: unknown, ttlSeconds = 300): Promise<void> {
  try {
    const client = getRedis();
    if (!client) return;
    await client.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch {
    // silently fail
  }
}

export async function cacheDelete(pattern: string): Promise<void> {
  try {
    const client = getRedis();
    if (!client) return;
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch {
    // silently fail
  }
}
