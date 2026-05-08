import { Router } from 'express';
import { jwtAuth } from '../middleware/auth.middleware.js';
import {
  addMember,
  createBoard,
  deleteBoard,
  getBoardDetails,
  leaveBoard,
  removeMember,
} from '../controllers/board.controller.js';

const router = Router();

router.use(jwtAuth);

router.route('/').post(createBoard);

router.route('/:boardId').get(getBoardDetails).delete(deleteBoard);

router.route('/:boardId/member').post(addMember);
router.route('/:boardId/members/:memberId').delete(removeMember);
router.route("/:boardId/leave").post(leaveBoard)

export default router;
