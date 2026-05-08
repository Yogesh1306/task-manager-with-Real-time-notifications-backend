import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { errorHandler } from './middleware/error.middleware.js';
import { globalLimiter } from './middleware/ratelimit.middleware.js';
import helmet from 'helmet';
import { httpLogger } from './middleware/httpLogger.middleware.js';
import { getIO } from './config/socket.js';

const app = express();

app.set('trust proxy', 1);

app.use(httpLogger);

const isProd = process.env.NODE_ENV === 'production';
app.use(
  helmet({
    contentSecurityPolicy: isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", 'https://cdn.socket.io'],
            connectSrc: [
              "'self'",
              `${process.env.BACKEND_URL}/${PORT}`,
              `wss:${process.env.BACKEND_URL}/${PORT}`,
            ],
          },
        }
      : false,
  }),
);
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static(path.resolve('public')));

app.use(globalLimiter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.get('/test-socket', (req, res) => {
  const io = getIO();
  io.emit('test', { msg: 'hello' });
  res.send('sent');
});

import userRouter from './routes/user.routes.js';
import taskRouter from './routes/task.routes.js';
import uploadRouter from './routes/upload.routes.js';
import boardRouter from './routes/board.routes.js';

app.use('/api/v1/users', userRouter);
app.use('/api/v1/tasks', taskRouter);
app.use('/api/v1/uploads', uploadRouter);
app.use('/api/v1/boards', boardRouter);

app.use(errorHandler);

export { app };
