import {
  buildCacheKey,
  getCache,
  setCache,
} from '../services/cache.service.js';

export const cacheMiddleware = ({ prefix, getId, ttl }) => {
  return async (req, res, next) => {
    if (req.query.search) {
      return next();
    }
    const id = getId(req);

    const { key, normalized } = buildCacheKey(prefix, id, req.query);

    const cached = await getCache(key);
    if (cached) {
      return res.status(200).json(cached);
    }

    const originalJson = res.json.bind(res);

    res.json = async (data) => {
      await setCache(key, data, ttl, prefix, id, normalized);
      return originalJson(data);
    };

    next();
  };
};
