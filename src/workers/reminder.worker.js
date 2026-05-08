import '../config/envConfig.js';
import { Worker } from 'bullmq';
import { pubClient, redisClient } from '../config/redis.js';
import { logger } from '../config/logger.js';

const worker = new Worker(
  'task-reminders',
  async (job) => {
    switch (job.name) {
      case 'send-reminder': {
        const { taskId, userId, title } = job.data;
        console.log(`Reminder: ${taskId}, ${title}`);

        await pubClient.publish(
          'socket-events',
          JSON.stringify({
            type: 'task-reminder',
            userId,
            data: {
              taskId,
              title,
              message: 'Task due soon',
            },
          }),
        );

        logger.info({
          service: 'reminder-worker',
          event: 'reminder-triggered',
          taskId,
          userId,
          title,
        });
        break;
      }
      case 'task-completed': {
        const { taskId, ownerId, completedBy, title } = job.data;
        console.log(`Task completed: ${title}, notify owner ${ownerId}`);

        await pubClient.publish(
          'socket-events',
          JSON.stringify({
            type: 'task-completed',
            userId: ownerId,
            data: {
              taskId,
              title,
              completedBy,
              message: 'Task marked as done',
            },
          }),
        );

        logger.info({
          service: 'reminder-worker',
          event: 'task-completed',
          taskId,
          ownerId,
          completedBy,
          title,
        });

        break;
      }
      default: {
        logger.warn({
          service: 'reminder-worker',
          event: 'unknown-job',
          jobName: job.name,
        });
      }
    }
  },
  {
    connection: redisClient,
  },
);

worker.on('completed', (job) => {
  logger.info({
    service: 'reminder-worker',
    event: 'completed',
    jobId: job.id,
  });
});

worker.on('failed', (job, err) => {
  logger.error({
    service: 'reminder-worker',
    event: 'failed',
    jobId: job?.id,
    message: err.message,
  });
});
