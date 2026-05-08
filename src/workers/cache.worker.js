import '../config/envConfig.js';
import Redis from 'ioredis';
import { invalidateCache } from '../services/cache.service.js';

const cacheSub = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  username: 'default',
  password: process.env.REDIS_PASSWORD,
});

export const initCacheWorker = async () => {
  await cacheSub.subscribe('cache-events');

  cacheSub.on('message', async (channel, message) => {
    try {
      if (channel !== 'cache-events') return;

      const event = JSON.parse(message);
      if (event.type !== 'INVALIDATE_TASKS') return;

      // PERSONAL
      await invalidateCache('tasks', event.userId);

      if (event.assignedTo && event.assignedTo !== event.userId) {
        await invalidateCache('tasks', event.assignedTo);
      }

      if (event.oldAssignedTo && event.oldAssignedTo !== event.assignedTo) {
        await invalidateCache('tasks', event.oldAssignedTo);
      }

      // BOARD
      if (event.boardId) {
        await invalidateCache('boardTasks', event.boardId);
      }
    } catch (error) {
      console.log('Cache worker error: ', error.message);
    }
  });
};
