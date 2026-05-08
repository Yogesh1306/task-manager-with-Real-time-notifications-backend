import { createTaskSchema, updateTaskSchema } from '../utils/validate.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Task } from '../models/task.model.js';
import mongoose from 'mongoose';
import { reminderQueue } from '../queues/reminder.queue.js';
import {
  addCompletionJob,
  buildAllowedUpdates,
  getUserRole,
  handleAttachments,
  updateReminderJob,
  validateRequest,
} from '../helpers/task.helper.js';
import { publishTaskCacheInvalidation } from '../helpers/cache.helper.js';
import { Board } from '../models/board.model.js';
import { isBoardAdmin, isBoardMember } from '../helpers/board.helper.js';

const createTask = async (req, res) => {
  const user = req.user;

  const data = validateRequest(createTaskSchema, req.body);

  const taskData = {
    ...data,
    attachments: data.attachments || [],
    createdBy: user._id,
  };

  if (data.boardId) {
    if (!mongoose.Types.ObjectId.isValid(data.boardId)) {
      throw new ApiError(400, 'Invalid board id');
    }
    const board = await Board.findById(data.boardId);
    if (!board) throw new ApiError(404, 'Board not found');

    if (!isBoardAdmin(board, user._id)) {
      throw new ApiError(403, 'Only admin can create tasks');
    }

    if (!data.assignedTo) {
      throw new ApiError(400, 'assignedTo required for board task');
    }

    if (!isBoardMember(board, data.assignedTo)) {
      throw new ApiError(403, 'Assignee must be board member');
    }
  } else {
    taskData.assignedTo = null;
    taskData.boardId = null;
  }

  const task = new Task(taskData);
  await task.save();

  if (task.assignedTo && task.dueDate) {
    const delay = task.dueDate.getTime() - 10 * 60 * 1000 - Date.now();

    await reminderQueue.add(
      'send-reminder',
      {
        taskId: task._id,
        userId: task.assignedTo.toString(),
        title: task.title,
      },
      {
        delay: Math.max(delay, 0),
        jobId: task._id.toString(),
      },
    );
  }

  await task.populate('createdBy assignedTo', 'username');

  await publishTaskCacheInvalidation({ task });

  return res
    .status(201)
    .json(new ApiResponse(task.toObject(), 'Task created successfully'));
};

const updateTask = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const data = validateRequest(updateTaskSchema, req.body);

  const { keepAttachments, newAttachments, ...rest } = data;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid task id');
  }

  const task = await Task.findById(id);
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  if (task.boardId) {
    const board = await Board.findById(task.boardId);

    if (!isBoardMember(board, user._id)) {
      throw new ApiError(403, 'Unauthorized');
    }
  }

  const oldAssignedTo = task.assignedTo?.toString();
  const oldStatus = task.status;
  const oldPriority = task.priority;

  const role = getUserRole(task, user);

  const attachments = await handleAttachments(
    task.attachments,
    keepAttachments,
    newAttachments,
  );

  const { allowedUpdates, dueDateChanged } = buildAllowedUpdates(
    task,
    rest,
    role,
  );

  const isNowCompleted =
    allowedUpdates.status === 'done' && task.status !== 'done';

  if (isNowCompleted) {
    task.completedAt = new Date();
  }

  Object.assign(task, allowedUpdates, rest, {
    attachments,
  });
  await task.save();

  await publishTaskCacheInvalidation({
    task,
    oldAssignedTo,
    meta: {
      statusChanged: oldStatus !== task.status,
      priorityChanged: oldPriority !== task.priority,
      reassigned: oldAssignedTo !== task.assignedTo?.toString(),
    },
  });

  await updateReminderJob(task, dueDateChanged);

  await addCompletionJob(task, user, isNowCompleted);

  await task.populate('createdBy', 'username');

  return res.status(201).json(new ApiResponse(task, 'Task updated'));
};

const deleteTask = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid task id');
  }

  const task = await Task.findById(id);
  if (!task) throw new ApiError(404, 'Task not found');

  // board task
  if (task.boardId) {
    const board = await Board.findById(task.boardId);

    if (!isBoardAdmin(board, user._id)) {
      throw new ApiError(403, 'Only admin can delete');
    }
  }

  // personal task
  else {
    if (!task.createdBy.equals(user._id)) {
      throw new ApiError(403, 'Unauthorized');
    }
  }

  const deletedTask = Task.deleteOne({ _id: id });
  if (deletedTask.dueDate) {
    const jobId = deletedTask._id.toString();

    const reminderJob = await reminderQueue.getJob(jobId);
    if (reminderJob) {
      await reminderJob.remove();
    }
  }

  await publishTaskCacheInvalidation({ task: deletedTask });

  return res.status(200).json(new ApiResponse({}, 'Task deleted successfully'));
};

const getAllTasks = async (req, res) => {
  const user = req.user;
  const page = Number.parseInt(req.query.page) || 1;
  const limit = Number.parseInt(req.query.limit) || 2;
  const skip = (page - 1) * limit;

  const filter = {
    boardId: null,
    createdBy: user._id,
  };

  if (req.query.search) filter.title = req.query.search;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;

  const tasks = await Task.find(filter)
    .populate('createdBy', 'username')
    .skip(skip)
    .limit(limit + 1)
    .sort({ createdAt: -1 })
    .lean();

  const totalTasks = await Task.countDocuments(filter)

  const hasNextPage = tasks.length > limit;
  if (hasNextPage) {
    tasks.pop();
  }
  return res.status(200).json(
    new ApiResponse(tasks, 'All tasks retrieved', {
      page,
      limit,
      hasNextPage,
      totalTasks
    }),
  );
};

const getBoardTasks = async (req, res) => {
  const { boardId } = req.params;
  const user = req.user;

  if (!mongoose.Types.ObjectId.isValid(boardId)) {
    throw new ApiError(400, 'Invalid board id');
  }

  const board = await Board.findById(boardId).select('admin members').lean();
  if (!board) throw new ApiError(404, 'Board not found');

  if (!isBoardMember(board, user._id)) {
    throw new ApiError(403, 'Not a board member');
  }

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = { boardId };

  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;

  const tasks = await Task.find(filter)
    .select('title status priority createdAt assignedTo createdBy')
    .populate('createdBy', 'username')
    .populate('assignedTo', 'username')
    .skip(skip)
    .limit(limit + 1)
    .sort({ createdAt: -1 })
    .lean();

  const hasNextPage = tasks.length > limit;
  if (hasNextPage) tasks.pop();

  return res.status(200).json(
    new ApiResponse(tasks, 'Board tasks', {
      page,
      limit,
      hasNextPage,
    }),
  );
};

const getATask = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid task id');
  }

  const task = await Task.findById(id)
    .populate('createdBy', 'username')
    .populate('assignedTo', 'username')
    .lean();

  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  if (
    !task.createdBy?._id.equals(user._id) ||
    (task.assignedTo !== null && !task.assignedTo?._id.equals(user._id))
  ) {
    throw new ApiError(403, 'You cannot access this task');
  }

  return res
    .status(200)
    .json(new ApiResponse(task, 'Task retrieved successfully'));
};

export {
  createTask,
  updateTask,
  deleteTask,
  getAllTasks,
  getBoardTasks,
  getATask,
};
