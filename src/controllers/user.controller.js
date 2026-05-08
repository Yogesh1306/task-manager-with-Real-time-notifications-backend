import { TOKEN_EXPIRY } from '../constant.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { loginSchema, registerSchema } from '../utils/validate.js';

const options = {
  httpOnly: true,
  secure: true,
  maxAge: TOKEN_EXPIRY,
  sameSite: 'none',
};

const generateAccessAndRefreshToken = async (userId) => {
  const user = await User.findById(userId);
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const registerUser = async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'validation error', parsed.error.issues);
  }
  const { username, email, password } = parsed.data;

  const existedUser = await User.findOne({
    $or: [
      { username: username.trim().toLowerCase() },
      { email: email.trim().toLowerCase() },
    ],
  });

  if (existedUser) {
    throw new ApiError(409, 'username or email already exists');
  }

  const user = await User.create({
    username: username.trim().toLowerCase(),
    email,
    password,
    role: 'user',
  });

  const createdUser = await User.findById(user._id).select(
    '-password -refreshToken',
  );

  return res
    .status(201)
    .json(new ApiResponse(createdUser, 'User registered successfully'));
};

const loginUser = async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'validation error', parsed.error.issues);
  }
  const { userInput, password } = parsed.data;

  const existedUser = await User.findOne({
    $or: [
      { username: userInput.trim().toLowerCase() },
      { email: userInput.trim().toLowerCase() },
    ],
  });

  if (!existedUser) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const isPasswordCorrect = await existedUser.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    existedUser._id,
  );

  const loggedInUser = existedUser.toObject();
  delete loggedInUser.password;
  delete loggedInUser.refreshToken;

  return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .cookie('refreshToken', refreshToken, options)
    .json(new ApiResponse(loggedInUser, 'User logged in successfully'));
};
const logoutUser = async (req, res) => {
  const user = req.user;
  await User.findByIdAndUpdate(user._id, {
    $unset: { refreshToken: 1 },
  });
  return res
    .status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(new ApiResponse(null, 'Logged out successfully'));
};

export { registerUser, loginUser, logoutUser };
