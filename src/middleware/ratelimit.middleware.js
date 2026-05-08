import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../config/redis.js';
import { ApiError } from '../utils/ApiError.js';

const createRateLimiter = ({
  windowMs = 60 * 1000,
  max = 1,
  prefix = 'rl',
  message = 'Too many requests',
} = {}) => {
  return rateLimit({
    windowMs,
    max,

    standardHeaders: true,
    legacyHeaders: false,

    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix,
    }),

    keyGenerator: (req) => {
      if (req.user?._id) {
        return req.user._id.toString();
      }
      return ipKeyGenerator(req);
    },

    handler: (req, res, next) => {
      next(new ApiError(429, message));
    },
  });
};

export const globalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  prefix: 'global',
});

export const authLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000,
  max: 10,
  prefix: 'auth',
  message: 'Too many login attempts',
});
