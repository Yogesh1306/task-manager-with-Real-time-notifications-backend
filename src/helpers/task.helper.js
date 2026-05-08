import { cloudinary } from "../config/cloudinary.js";
import { reminderQueue } from "../queues/reminder.queue.js";
import { ApiError } from "../utils/ApiError.js";


export const validateRequest = (schema, body) => {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, 'validation error', parsed.error.issues);
  }
  return parsed.data;
};

export const updateReminderJob = async (task, dueDateChanged) => {
  if (!dueDateChanged || !task.dueDate) return;
  const jobId = task._id.toString();
  const existingJob = await reminderQueue.getJob(jobId);
  if (existingJob) {
    await existingJob.remove();
  }

  const delay = task.dueDate.getTime() - 10 * 60 * 1000 - Date.now();
  await reminderQueue.add(
    'send-reminder',
    {
      taskId: jobId,
      userId: task.assignedTo.toString(),
      title: task.title,
    },
    {
      jobId,
      delay: Math.max(delay, 0),
    },
  );
};

export const addCompletionJob = async (task, user, isNowCompleted) => {
  if (!isNowCompleted) return;
  await reminderQueue.add(
    'task-completed',
    {
      taskId: task._id.toString(),
      ownerId: task.createdBy.toString(),
      completedBy: user._id.toString(),
      title: task.title,
    },
    {
      jobId: `task-completed-${task._id}`,
      delay: 0,
    },
  );
};

export const handleAttachments = async (existing = [], keep = [], add = []) => {
  let updated = existing;

  if (keep) {
    const toDelete = existing.filter((a) => !keep.includes(a.public_id));

    await Promise.allSettled(
      toDelete.map((file) => cloudinary.uploader.destroy(file.public_id)),
    );

    updated = existing.filter((a) => keep.includes(a.public_id));
  }

  if (add?.length) {
    updated = [...updated, ...add];
  }

  if (updated.length > 5) {
    throw new ApiError(400, 'Max 5 attachments allowed');
  }

  return updated;
};

export const getUserRole = (task, user) => {
  if (task.createdBy.equals(user._id)) return 'owner';
  if (task.assignedTo?.equals(user._id)) return 'assignee';
  throw new ApiError(401, 'Unauthorized request');
};

export const buildAllowedUpdates = (task, data, role) => {
  if (role === 'assignee') {
    const keys = Object.keys(data);
    if (keys.length !== 1 || !keys.includes('status')) {
      throw new ApiError(403, 'You can only update task status');
    }
    return {
      allowedUpdates: { status: data.status },
      dueDateChanged: false,
    };
  }

  const dueDateChanged =
    data.dueDate &&
    new Date(data.dueDate).getTime() !== task.dueDate.getTime();

  return {
    allowedUpdates: data,
    dueDateChanged,
  };
};