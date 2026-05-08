import { cloudinary } from "../config/cloudinary.js";
import { Task } from "../models/task.model.js";
import { reminderQueue } from "../queues/reminder.queue.js";

export const isBoardMember = (board, userId) => {
  return (
    board.admin.equals(userId) ||
    board.members.some((m) => m.user.equals(userId))
  );
};

export const isBoardAdmin = (board, userId) => {
  return board.admin.equals(userId);
};


export const unassignTasksForUser = async (boardId, userId) => {
  const tasks = await Task.find({
    boardId,
    assignedTo: userId,
  });

  for (const task of tasks) {
    // remove reminder job
    const jobId = task._id.toString();
    const job = await reminderQueue.getJob(jobId);
    if (job) await job.remove();
  }

  await Task.updateMany(
    { boardId, assignedTo: userId },
    { $set: { assignedTo: null } }
  );
};

// Full board cleanup
export const deleteBoardTasks = async (boardId) => {
  const tasks = await Task.find({ boardId });

  for (const task of tasks) {
    const jobId = task._id.toString();

    // remove reminder job
    const job = await reminderQueue.getJob(jobId);
    if (job) await job.remove();

    // delete attachments from cloudinary
    if (task.attachments?.length) {
      await Promise.allSettled(
        task.attachments.map((file) =>
          cloudinary.uploader.destroy(file.public_id)
        )
      );
    }
  }

  await Task.deleteMany({ boardId });
};