import Redis from 'ioredis';
import { logger } from './logger.js';

const isDev = process.env.NODE_ENV !== 'production';

const baseConfig = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  username: 'default',
  password: process.env.REDIS_PASSWORD,

  maxRetriesPerRequest: null,
  enableReadyCheck: true,
};

export const redisClient = new Redis(baseConfig); //bullMq
export const pubClient = new Redis(baseConfig); //publish
export const subClient = new Redis(baseConfig); //subscribe
export const cacheClient = new Redis(baseConfig);

const attachLogger = (client, name) => {
  client.on('connect', () => {
    logger.info({
      service: 'redis',
      client: name,
      event: 'connected',
      env: process.env.NODE_ENV,
    });
  });

  client.on('error', (err) => {
    logger.error({
      service: 'redis',
      client: name,
      event: 'error',
      message: err.message,
      stack: isDev ? err.stack : undefined,
    });
  });
};

attachLogger(redisClient, 'bullmq');
attachLogger(pubClient, 'publisher');
attachLogger(subClient, 'subscriber');
attachLogger(cacheClient, 'cache');
