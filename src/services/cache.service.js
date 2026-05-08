import crypto from 'node:crypto';
import { cacheClient } from '../config/redis.js';

const DEFAULT_TTL = 120;

// build key
export function buildCacheKey(prefix, id, query) {
  const normalized = {
    page: Number(query.page) || 1,
    limit: Number(query.limit) || 10,
    status: query.status || null,
    priority: query.priority || null,
  };

  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify(normalized))
    .digest('hex');

  return {
    key: `${prefix}:${id}:${hash}`,
    normalized,
  };
}

// get
export async function getCache(key) {
  const data = await cacheClient.get(key);
  return data ? JSON.parse(data) : null;
}

// set
export async function setCache(key, value, ttl, prefix, id) {
  await cacheClient.set(key, JSON.stringify(value), 'EX', ttl);

  // track keys
  await cacheClient.sadd(`${prefix}:${id}:keys`, key);
}

// full invalidate
export async function invalidateCache(prefix, id) {
  const keys = await cacheClient.smembers(`${prefix}:${id}:keys`);

  if (keys.length) {
    await cacheClient.del(...keys);
  }

  await cacheClient.del(`${prefix}:${id}:keys`);

}
