import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import { jwtAuth } from "../middleware/auth.middleware.js";
import { authLimiter } from "../middleware/ratelimit.middleware.js";

const router = Router()

router.use(authLimiter)

router.route("/register").post(registerUser)
router.route("/login").post(loginUser)
router.route("/logout").post( jwtAuth,logoutUser)

export default router