import mongoose from 'mongoose';
import {
  deleteBoardTasks,
  isBoardAdmin,
  unassignTasksForUser,
} from '../helpers/board.helper.js';
import { publishTaskCacheInvalidation } from '../helpers/cache.helper.js';
import { validateRequest } from '../helpers/task.helper.js';
import { Board } from '../models/board.model.js';
import { User } from '../models/user.model.js';
import {
  getCache,
  invalidateCache,
  setCache,
} from '../services/cache.service.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { addMemberSchema, createBoardSchema } from '../utils/validate.js';

const createBoard = async (req, res) => {
  const user = req.user;
  // validate input using zod
  const data = validateRequest(createBoardSchema, req.body);
  // check if board exist with that name
  const name = data.name.trim().toLowerCase();
  const existing = await Board.findOne({
    name,
    admin: user._id,
    isArchived: false,
  });
  if (existing) {
    throw new ApiError(400, 'Board with same name exist');
  }
  // create board
  const board = await Board({
    name,
    description: data.description,
    admin: user._id,
    members: [{ user: user._id }],
  });
  await board.save();

  await invalidateCache('userBoards', user._id.toString());
  return res.status(201).json(new ApiResponse(board, 'Board created'));
};
const addMember = async (req, res) => {
  const { boardId } = req.params;
  const user = req.user;

  const { userId } = validateRequest(addMemberSchema, req.body);

  if (!mongoose.Types.ObjectId.isValid(boardId)) {
    throw new ApiError(400, 'Invalid board id');
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, 'Invalid user id');
  }

  const board = await Board.findById(boardId);
  if (!board) {
    throw new ApiError(404, 'Board does not exist');
  }

  if (board.members.length >= 50) {
    throw new ApiError(403, 'Board full, cannot add new member');
  }

  if (!board.admin.equals(user._id)) {
    throw new ApiError(403, 'Only admin can add members');
  }

  if (board.admin.equals(userId)) {
    throw new ApiError(400, 'Admin already part of board');
  }

  const userExist = await User.findById(userId);
  if (!userExist) {
    throw new ApiError(404, 'No user with this userId exists');
  }

  const alreadyMember = board.members.some((m) => m.user.equals(userId));
  if (alreadyMember) {
    throw new ApiError(400, 'user already a member');
  }

  board.members.push({ user: userId, role: 'member' });
  await board.save();

  await publishTaskCacheInvalidation({
    task: {
      createdBy: board.admin,
      assignedTo: userId,
      boardId,
    },
  });

  await invalidateCache('userBoards', user._id.toString()); // admin
  await invalidateCache('userBoards', userId);

  return res.status(200).json(new ApiResponse(board, 'Member added'));
};

const removeMember = async (req, res) => {
  const { boardId, memberId } = req.params;
  const user = req.user;

  if (!mongoose.Types.ObjectId.isValid(boardId)) {
    throw new ApiError(400, 'Invalid board id');
  }

  if (!mongoose.Types.ObjectId.isValid(memberId)) {
    throw new ApiError(400, 'Invalid member id');
  }

  const board = await Board.findById(boardId);
  if (!board) {
    throw new ApiError(404, 'Board does not exist');
  }

  if (!board.admin.equals(user._id)) {
    throw new ApiError(403, 'Only admin can remove members');
  }

  if (!board.admin.equals(memberId)) {
    throw new ApiError(403, 'cannot remove admin');
  }

  const exists = board.members.some((m) => m.user.equals(memberId));
  if (!exists) {
    throw new ApiError(404, 'Member not found');
  }

  //cleanup tasks
  await unassignTasksForUser(boardId, memberId);

  board.members = board.members.filter((m) => !m.user.equals(memberId));

  await board.save();

  await invalidateCache('userBoards', user._id.toString());
  await invalidateCache('userBoards', memberId);

  //cache invalidation
  await publishTaskCacheInvalidation({
    task: {
      createdBy: board.admin,
      assignedTo: memberId,
      boardId,
    },
  });

  return res.status(200).json(new ApiResponse(board, 'Member removed'));
};

const leaveBoard = async (req, res) => {
  const { boardId } = req.params;
  const user = req.user;

  if (!mongoose.Types.ObjectId.isValid(boardId)) {
    throw new ApiError(400, 'Invalid board id');
  }

  const board = await Board.findById(boardId);
  if (!board) {
    throw new ApiError(404, 'Board not found');
  }

  // admin cannot leave
  if (board.admin.equals(user._id)) {
    throw new ApiError(400, 'Admin must transfer ownership or delete board');
  }

  const exists = board.members.some((m) => m.user.equals(user._id));

  if (!exists) {
    throw new ApiError(404, 'You are not a member');
  }

  //cleanup tasks
  await unassignTasksForUser(boardId, user._id);

  board.members = board.members.filter((m) => !m.user.equals(user._id));

  await board.save();

  await invalidateCache('userBoards', user._id.toString());

  //cache invalidation
  await publishTaskCacheInvalidation({
    task: {
      createdBy: board.admin,
      assignedTo: user._id,
      boardId,
    },
  });

  return res.status(200).json(new ApiResponse({}, 'Left board successfully'));
};

const deleteBoard = async (req, res) => {
  const { boardId } = req.params;
  const user = req.user;

  if (!mongoose.Types.ObjectId.isValid(boardId)) {
    throw new ApiError(400, 'Invalid board id');
  }

  const board = await Board.findById(boardId);
  if (!board) throw new ApiError(404, 'Board not found');

  if (!board.admin.equals(user._id)) {
    throw new ApiError(403, 'Only admin can delete');
  }

  // delete all tasks + jobs + files
  await deleteBoardTasks(boardId);

  await board.deleteOne();

  await invalidateCache('userBoards', user._id.toString());

  for (const m of board.members) {
    await invalidateCache('userBoards', m.user.toString());
  }

  // cache invalidation
  await publishTaskCacheInvalidation({
    task: {
      createdBy: user._id,
      boardId,
    },
  });

  return res.status(200).json(new ApiResponse({}, 'Board deleted'));
};

const getBoardDetails = async (req, res) => {
  const { boardId } = req.params;
  const user = req.user;

  if (!mongoose.Types.ObjectId.isValid(boardId)) {
    throw new ApiError(400, 'Invalid board id');
  }

  const board = await Board.findById(boardId)
    .populate('admin', 'username')
    .populate('members.user', 'username')
    .lean();
  if (!board) throw new ApiError(404, 'Board not found');

  const isAdmin = isBoardAdmin(board, user._id);
  const isMember = board.members.some((m) => m.user.equals(user._id));

  let boardDetails;
  if (!isAdmin || !isMember) {
    boardDetails = {
      name: board.name,
      totalMembers: board.members.length,
      admin: board.admin,
    };
  }
  boardDetails = board.toObject({
    virtuals: true,
    versionKey: false,
  });

  return res.status(200).json(new ApiResponse(boardDetails, 'Board details'));
};

const getUserBoards = async (req, res) => {
  const user = req.user;

  const prefix = 'userBoards';
  const id = user._id.toString();

  const key = `${prefix}:${id}`;

  const cached = await getCache(key);
  if (cached) {
    return res.status(200).json(cached);
  }

  const boards = await Board.find({
    $or: [{ admin: user._id }, { 'members.user': user._id }],
    isArchived: false,
  })
    .select('name description admin members createdAt')
    .populate('admin', 'username')
    .lean();

  const formatted = boards.map((b) => ({
    _id: b._id,
    name: b.name,
    description: b.description,
    admin: b.admin,
    totalMembers: (b.members?.length || 0) + 1,
    isAdmin: b.admin._id.toString() === user._id.toString(),
    createdAt: b.createdAt,
  }));

  const response = new ApiResponse(formatted, 'User boards');

  await setCache(key, response, 90, prefix, id);

  return res.status(200).json(response);
};

export {
  createBoard,
  leaveBoard,
  deleteBoard,
  getBoardDetails,
  addMember,
  removeMember,
  getUserBoards,
};
