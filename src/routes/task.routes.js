import { Router } from 'express';
import {
  createTask,
  deleteTask,
  getAllTasks,
  getATask,
  getBoardTasks,
  updateTask,
} from '../controllers/task.controller.js';
import { jwtAuth } from '../middleware/auth.middleware.js';
import { cacheMiddleware} from '../middleware/cache.middleware.js';

const router = Router();

router.use(jwtAuth);

router
  .route('/')
  .post(createTask)
  .get(
    cacheMiddleware({
      prefix: 'tasks',
      getId: (req) => req.user._id.toString(),
      ttl: 120,
    }),
    getAllTasks,
  );
router.route('/:id').get(getATask).patch(updateTask).delete(deleteTask);
router.get(
  "/boards/:boardId/tasks",
  cacheMiddleware({
    prefix: "boardTasks",
    getId: (req) => req.params.boardId,
    ttl: 60,
  }),
  getBoardTasks
);

export default router;
