import { pubClient } from "../config/redis.js";

export const publishTaskCacheInvalidation = async ({
  task,
  oldAssignedTo,
  meta = {},
}) => {
  await pubClient.publish(
    "cache-events",
    JSON.stringify({
      type: "INVALIDATE_TASKS",
      userId: task.createdBy.toString(),
      assignedTo: task.assignedTo?.toString(),
      oldAssignedTo,
      boardId: task.boardId?.toString() || null,
      meta
    })
  );
};